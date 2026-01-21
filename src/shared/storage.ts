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
        conversations: data.conversations.filter(c => c.id === conversationId),
        messages: data.messages.filter(m => m.conversationId === conversationId),
        branches: data.branches.filter(b => b.conversationId === conversationId)
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
    let conversation = data.conversations.find(c => c.id === message.conversationId);
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
      const parent = data.messages.find(m => m.id === message.parentId);
      if (parent && !parent.childIds.includes(message.id)) {
        parent.childIds.push(message.id);
      }
    }

    // メッセージ追加
    data.messages.push(message);

    // ブランチのmessageIdsを更新
    const branch = data.branches.find(b => b.id === message.branchId);
    if (branch) {
      branch.messageIds.push(message.id);
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
    const forkMessage = data.messages.find(m => m.id === forkMessageId);
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
      messageIds: []
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
      createdAt: new Date().toISOString()
    };

    data.tags.push(newTag);
    await this.saveData(data);

    return newTag;
  }

  /**
   * メッセージを更新
   */
  async updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
    const data = await this.getData();

    const index = data.messages.findIndex(m => m.id === messageId);
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
        source: 'claude.ai'
      },
      conversations: [],
      messages: [],
      branches: [],
      tags: getDefaultTags(),
      settings: {
        defaultView: 'kanban',
        theme: 'auto',
        presetTags: getDefaultTags(),
        colorPalette: getDefaultColorPalette()
      }
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
      isArchived: false
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
      messageIds: []
    };
  }
}
