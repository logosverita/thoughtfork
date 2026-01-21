/**
 * ThoughtFork全体のデータ構造（TOON形式）
 */
export interface ThoughtForkData {
  version: "1.0";
  meta: {
    createdAt: string;      // ISO 8601
    updatedAt: string;
    source: "claude.ai";
  };
  conversations: Conversation[];
  messages: Message[];
  branches: Branch[];
  tags: Tag[];
  settings: UserSettings;
}

/**
 * 会話（Claude.aiの1スレッドに対応）
 */
export interface Conversation {
  id: string;               // UUID
  title: string;            // 会話タイトル（自動抽出 or ユーザー設定）
  url: string;              // Claude.aiのURL
  rootBranchId: string;     // メインブランチのID
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

/**
 * メッセージ（人間またはAIの1発言）
 */
export interface Message {
  id: string;               // UUID
  conversationId: string;   // 所属する会話
  branchId: string;         // 所属するブランチ
  parentId: string | null;  // 前のメッセージ（分岐対応）
  childIds: string[];       // 次のメッセージ（複数=分岐点）
  role: "human" | "assistant";
  content: string;          // メッセージ本文
  contentPreview: string;   // 先頭100文字
  timestamp: string;
  // ユーザーカスタマイズ
  tagIds: string[];
  color: string | null;     // HEX color
  note: string | null;      // ユーザーメモ
  isBranchPoint: boolean;   // ここから分岐が作られた
}

/**
 * ブランチ（会話の分岐）
 */
export interface Branch {
  id: string;
  conversationId: string;
  parentBranchId: string | null;  // nullならルートブランチ
  name: string;
  color: string;            // HEX color
  createdAt: string;
  forkMessageId: string;    // 分岐元のメッセージID
  messageIds: string[];     // このブランチに属するメッセージ
}

/**
 * タグ
 */
export interface Tag {
  id: string;
  name: string;
  color: string;            // HEX color
  isPreset: boolean;        // プリセットタグか
  createdAt: string;
}

/**
 * ユーザー設定
 */
export interface UserSettings {
  defaultView: "kanban" | "network" | "3d";
  theme: "light" | "dark" | "auto";
  presetTags: Tag[];
  colorPalette: string[];   // カスタムカラーパレット
}

/**
 * Chrome拡張メッセージング用
 */
export type MessageType =
  | { type: "NEW_MESSAGE"; payload: Message }
  | { type: "CONVERSATION_UPDATED"; payload: Conversation }
  | { type: "REQUEST_DATA"; payload: { conversationId: string } }
  | { type: "DATA_RESPONSE"; payload: ThoughtForkData }
  | { type: "MESSAGE_ADDED"; payload: Message };
