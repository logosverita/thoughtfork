import { ThoughtForkData, Message, Branch, Tag, Conversation } from './types';
import { generateId, getDefaultTags, getDefaultColorPalette } from './utils';
import { STORAGE_KEY } from './constants';

/**
 * LocalStorageを使用したデータ管理
 * ThoughtFork Storage Manager
 */
export class StorageManager {
  /**
   * 全データを取得
   */
  async getData(conversationId?: string): Promise<ThoughtForkData> {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return this.createInitialData();
    }

    const data: ThoughtForkData = JSON.parse(raw);

    if (conversationId) {
      // 特定の会話のみフィルタ
      return {
        ...data,
        conversations: data.conversations.filter((c) => c.id === conversationId),
        messages: data.messages.filter((m) => m.conversationId === conversationId),
        branches: data.branches.filter((b) => b.conversationId === conversationId),
      };
    }

    return data;
  }

  /**
   * 全データを保存
   */
  async saveData(data: ThoughtForkData): Promise<void> {
    data.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * メッセージを追加
   */
  async addMessage(message: Message): Promise<void> {
    const data = await this.getData();

    // 会話が存在するか確認、なければ作成
    let conversation = data.conversations.find((c) => c.id === message.conversationId);
    if (!conversation) {
      conversation = this.createConversation(message.conversationId);
      data.conversations.push(conversation);

      // メインブランチも作成
      const mainBranch = this.createMainBranch(message.conversationId);
      data.branches.push(mainBranch);
      conversation.rootBranchId = mainBranch.id;
      message.branchId = mainBranch.id;
    }

    // 親メッセージのchildIdsを更新
    if (message.parentId) {
      const parent = data.messages.find((m) => m.id === message.parentId);
      if (parent) {
        if (!parent.childIds.includes(message.id)) {
          parent.childIds.push(message.id);
        }

        // ブランチ継承ロジック:
        // メッセージのブランチが 'main' (デフォルト) で、かつ親が別のブランチに属している場合、
        // 親のブランチを継承する。ただし、親が分岐点(isBranchPoint)の場合は継承しない（新しい分岐が期待されるため）。
        // ここでは簡易的に、親のブランチを引き継ぐこととする。
        // 分岐点であっても、ユーザーが明示的に新ブランチを作っていない場合は、そのブランチの続きとみなすのが自然。
        if (message.branchId === 'main' || !message.branchId) {
          message.branchId = parent.branchId;
        }
      }
    }

    // メッセージ追加
    data.messages.push(message);

    // ブランチのmessageIdsを更新
    // 継承ロジックの結果、branchIdが変わっている可能性があるため再検索
    let branch = data.branches.find((b) => b.id === message.branchId);

    // もし指定されたブランチが存在しない場合（削除されたなど）、メインに戻すか再作成
    if (!branch) {
      const mainBranch = data.branches.find(b => b.parentBranchId === null);
      if (mainBranch) {
        message.branchId = mainBranch.id;
        branch = mainBranch;
      }
    }

    if (branch) {
      if (!branch.messageIds.includes(message.id)) {
        branch.messageIds.push(message.id);
      }
    }

    // 会話の更新日時を更新
    conversation.updatedAt = new Date().toISOString();

    await this.saveData(data);
  }

  /**
   * ブランチを作成
   */
  async createBranch(
    conversationId: string,
    forkMessageId: string,
    name: string,
    color: string
  ): Promise<Branch> {
    const data = await this.getData();

    // 分岐元メッセージを取得
    const forkMessage = data.messages.find((m) => m.id === forkMessageId);
    if (!forkMessage) {
      throw new Error('Fork message not found');
    }

    // 分岐元をマーク
    forkMessage.isBranchPoint = true;

    const branch: Branch = {
      id: generateId(),
      conversationId,
      parentBranchId: forkMessage.branchId,
      name,
      color,
      createdAt: new Date().toISOString(),
      forkMessageId,
      messageIds: [],
    };

    data.branches.push(branch);
    await this.saveData(data);

    return branch;
  }

  /**
   * タグを追加
   */
  async addTag(tag: Omit<Tag, 'id' | 'createdAt'>): Promise<Tag> {
    const data = await this.getData();

    const newTag: Tag = {
      ...tag,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    data.tags.push(newTag);
    await this.saveData(data);

    return newTag;
  }

  /**
   * ブランチを更新
   */
  async updateBranch(branchId: string, updates: Partial<Branch>): Promise<void> {
    const data = await this.getData();
    const index = data.branches.findIndex((b) => b.id === branchId);
    if (index === -1) throw new Error('Branch not found');

    data.branches[index] = { ...data.branches[index], ...updates };
    await this.saveData(data);
  }

  /**
   * ブランチを削除 (Cascade delete messages)
   */
  async deleteBranch(branchId: string): Promise<void> {
    const data = await this.getData();
    const branchIndex = data.branches.findIndex((b) => b.id === branchId);
    if (branchIndex === -1) throw new Error('Branch not found');

    // 削除対象のブランチを取得
    const branch = data.branches[branchIndex];

    // メインブランチは削除不可（簡易的なガード）
    if (!branch.parentBranchId && data.branches.length > 1) {
      // ルートブランチの削除は慎重にすべきだが、今回は許可しないか、または警告
      // ここでは親がない＝ルートとみなして、他のブランチがあるなら削除させない等のロジックもなしで、
      // UI側で制御する前提で実装。
    }

    // メッセージも削除
    data.messages = data.messages.filter((m) => m.branchId !== branchId);

    // ブランチ削除
    data.branches.splice(branchIndex, 1);

    await this.saveData(data);
  }

  /**
   * メッセージを更新
   */
  async updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
    const data = await this.getData();

    const index = data.messages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      throw new Error('Message not found');
    }

    data.messages[index] = { ...data.messages[index], ...updates };
    await this.saveData(data);
  }

  /**
   * 初期データを作成
   */
  private createInitialData(): ThoughtForkData {
    return {
      version: '1.0',
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'claude.ai',
      },
      conversations: [],
      messages: [],
      branches: [],
      tags: getDefaultTags(),
      settings: {
        defaultView: 'kanban',
        theme: 'auto',
        presetTags: getDefaultTags(),
        colorPalette: getDefaultColorPalette(),
      },
    };
  }

  /**
   * 会話を作成
   */
  private createConversation(id: string): Conversation {
    return {
      id,
      title: 'New Conversation',
      url: typeof window !== 'undefined' ? window.location?.href || '' : '',
      rootBranchId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
    };
  }

  /**
   * メインブランチを作成
   */
  private createMainBranch(conversationId: string): Branch {
    const id = generateId();
    return {
      id,
      conversationId,
      parentBranchId: null,
      name: 'Main',
      color: '#6366f1',
      createdAt: new Date().toISOString(),
      forkMessageId: '',
      messageIds: [],
    };
  }
  /**
   * テーマ設定を取得
   */
  async getTheme(): Promise<'light' | 'dark' | 'auto'> {
    const data = await this.getData();
    // 既存データにthemeがない場合のフォールバック
    return (data.settings?.theme as 'light' | 'dark' | 'auto') || 'dark'; // Startup with dark
  }

  /**
   * テーマ設定を保存
   */
  async saveTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    const data = await this.getData();
    if (!data.settings) {
      data.settings = this.createInitialData().settings;
    }
    data.settings.theme = theme;
    await this.saveData(data);
  }
}

export const storage = new StorageManager();
