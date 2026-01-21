# ThoughtFork - AI会話可視化Chrome拡張機能 開発プロンプト

## プロジェクト概要

Claude.aiでの会話をリアルタイムで可視化するChrome拡張機能を開発する。

### 解決する課題
AIとの学習中、概念Aを深掘りしていると概念Bがスレッドに埋もれてしまう。線形スレッドの限界を、ブランチ（分岐）機能と複数の可視化モードで解決する。

### 主要機能
1. 会話のリアルタイム可視化（3モード切り替え）
   - カンバン形式
   - 2Dネットワーク形式
   - 3Dネットワーク形式
2. ブランチ（分岐）機能 - 任意のメッセージから会話を分岐
3. タグ・色分け - 家計簿アプリのような簡単操作
4. ローカルストレージ保存（将来的に会員同期）

---

## 技術スタック

- Chrome Extension Manifest V3
- TypeScript
- React 18（Side Panel UI）
- TOON（Token-Oriented Object Notation）でデータ管理
- Three.js（3Dビュー）
- D3.js（2Dネットワークビュー）
- Tailwind CSS
- LocalStorage（データ永続化）
- Webpack 5

---

## プロジェクト構造

```
thoughtfork/
├── manifest.json
├── package.json
├── tsconfig.json
├── webpack.config.js
├── tailwind.config.js
├── src/
│   ├── content/
│   │   ├── content.ts              # Claude.ai DOM監視
│   │   └── parser.ts               # 会話DOMパーサー
│   ├── background/
│   │   └── service-worker.ts       # バックグラウンド処理
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ViewSwitcher.tsx    # タブ切り替え
│   │   │   ├── KanbanView.tsx      # カンバン表示
│   │   │   ├── NetworkView.tsx     # 2Dネットワーク
│   │   │   ├── ThreeDView.tsx      # 3Dネットワーク
│   │   │   ├── BranchSidebar.tsx   # ブランチ一覧
│   │   │   ├── MessageCard.tsx     # メッセージカード
│   │   │   ├── TagPicker.tsx       # タグ選択UI
│   │   │   ├── ColorPicker.tsx     # 色選択UI
│   │   │   └── FilterBar.tsx       # フィルタUI
│   │   ├── hooks/
│   │   │   ├── useConversation.ts  # 会話データ管理
│   │   │   ├── useBranches.ts      # ブランチ管理
│   │   │   └── useStorage.ts       # ストレージ操作
│   │   └── styles/
│   │       └── main.css
│   ├── shared/
│   │   ├── types.ts                # TOON型定義
│   │   ├── storage.ts              # LocalStorage操作
│   │   ├── constants.ts            # 定数
│   │   └── utils.ts                # ユーティリティ
│   └── assets/
│       └── icons/
│           ├── icon16.png
│           ├── icon48.png
│           └── icon128.png
└── public/
    └── sidepanel.html
```

---

## TOON データ構造定義

```typescript
// src/shared/types.ts

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
  | { type: "DATA_RESPONSE"; payload: ThoughtForkData };
```

---

## 実装詳細

### 1. manifest.json

```json
{
  "manifest_version": 3,
  "name": "ThoughtFork",
  "version": "1.0.0",
  "description": "AI会話を可視化・分岐管理 - 思考の枝分かれを見失わない",
  "permissions": [
    "storage",
    "activeTab",
    "sidePanel"
  ],
  "host_permissions": [
    "https://claude.ai/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://claude.ai/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "ThoughtFork"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. Content Script（DOM監視）

```typescript
// src/content/content.ts

import { parseMessage } from './parser';
import { Message, MessageType } from '../shared/types';
import { generateId } from '../shared/utils';

/**
 * Claude.aiの会話DOMを監視し、新しいメッセージを検出する
 * ThoughtFork Content Script
 */
class ConversationObserver {
  private observer: MutationObserver | null = null;
  private conversationId: string;
  private lastMessageId: string | null = null;

  constructor() {
    this.conversationId = this.extractConversationId();
    this.init();
  }

  /**
   * URLから会話IDを抽出
   */
  private extractConversationId(): string {
    const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : generateId();
  }

  /**
   * 初期化
   */
  private init(): void {
    // 既存メッセージを取得
    this.parseExistingMessages();
    
    // DOM監視開始
    this.startObserving();
    
    // URL変更を監視（会話切り替え）
    this.observeUrlChanges();
  }

  /**
   * 既存の会話メッセージをパース
   */
  private parseExistingMessages(): void {
    const container = document.querySelector('[data-testid="conversation-turn-list"]') 
                   || document.querySelector('main');
    
    if (!container) return;

    const messageElements = container.querySelectorAll('[data-testid^="conversation-turn-"]');
    
    messageElements.forEach((el, index) => {
      const message = parseMessage(el as HTMLElement, this.conversationId, this.lastMessageId);
      if (message) {
        this.lastMessageId = message.id;
        this.sendMessage({ type: 'NEW_MESSAGE', payload: message });
      }
    });
  }

  /**
   * DOM変更を監視
   */
  private startObserving(): void {
    const targetNode = document.querySelector('main') || document.body;
    
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            this.handleNewNode(node);
          }
        }
      }
    });

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 新しいDOM要素を処理
   */
  private handleNewNode(node: HTMLElement): void {
    // メッセージ要素かチェック
    if (node.matches?.('[data-testid^="conversation-turn-"]') ||
        node.querySelector?.('[data-testid^="conversation-turn-"]')) {
      
      const messageEl = node.matches('[data-testid^="conversation-turn-"]') 
        ? node 
        : node.querySelector('[data-testid^="conversation-turn-"]');
      
      if (messageEl) {
        const message = parseMessage(messageEl as HTMLElement, this.conversationId, this.lastMessageId);
        if (message) {
          this.lastMessageId = message.id;
          this.sendMessage({ type: 'NEW_MESSAGE', payload: message });
        }
      }
    }
  }

  /**
   * URL変更を監視
   */
  private observeUrlChanges(): void {
    let currentUrl = window.location.href;
    
    const checkUrl = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.conversationId = this.extractConversationId();
        this.lastMessageId = null;
        this.parseExistingMessages();
      }
    };

    // History API
    window.addEventListener('popstate', checkUrl);
    
    // pushState/replaceStateをフック
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      checkUrl();
    };
  }

  /**
   * バックグラウンドにメッセージ送信
   */
  private sendMessage(message: MessageType): void {
    chrome.runtime.sendMessage(message);
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.observer?.disconnect();
  }
}

// 初期化
const observer = new ConversationObserver();
```

### 3. パーサー

```typescript
// src/content/parser.ts

import { Message } from '../shared/types';
import { generateId } from '../shared/utils';

/**
 * DOM要素からメッセージをパース
 */
export function parseMessage(
  element: HTMLElement,
  conversationId: string,
  parentId: string | null
): Message | null {
  try {
    // ロールを判定
    const role = detectRole(element);
    if (!role) return null;

    // コンテンツを抽出
    const content = extractContent(element);
    if (!content) return null;

    const id = generateId();

    return {
      id,
      conversationId,
      branchId: 'main', // デフォルトはメインブランチ
      parentId,
      childIds: [],
      role,
      content,
      contentPreview: content.slice(0, 100),
      timestamp: new Date().toISOString(),
      tagIds: [],
      color: null,
      note: null,
      isBranchPoint: false
    };
  } catch (error) {
    console.error('[ThoughtFork] Failed to parse message:', error);
    return null;
  }
}

/**
 * メッセージのロールを判定
 */
function detectRole(element: HTMLElement): 'human' | 'assistant' | null {
  // Claude.aiの構造に基づいて判定
  const testId = element.getAttribute('data-testid') || '';
  
  if (testId.includes('human') || element.querySelector('[data-testid="user-message"]')) {
    return 'human';
  }
  
  if (testId.includes('assistant') || element.querySelector('[data-testid="assistant-message"]')) {
    return 'assistant';
  }

  // フォールバック: クラス名やテキスト内容で判定
  const text = element.textContent || '';
  if (element.classList.contains('human') || text.startsWith('You:')) {
    return 'human';
  }
  
  return 'assistant'; // デフォルトはassistant
}

/**
 * メッセージコンテンツを抽出
 */
function extractContent(element: HTMLElement): string {
  // プロセステキストを除外
  const contentEl = element.querySelector('.prose') 
                 || element.querySelector('[data-testid="message-content"]')
                 || element;
  
  // コードブロック、リストなども含めてテキスト化
  return cleanContent(contentEl.innerHTML);
}

/**
 * HTMLをクリーンなテキストに変換
 */
function cleanContent(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // コードブロックを保持
  temp.querySelectorAll('pre code').forEach(el => {
    el.textContent = `\n\`\`\`\n${el.textContent}\n\`\`\`\n`;
  });
  
  // 改行を保持
  temp.querySelectorAll('br').forEach(el => {
    el.replaceWith('\n');
  });
  
  temp.querySelectorAll('p, div').forEach(el => {
    el.append('\n');
  });

  return temp.textContent?.trim() || '';
}
```

### 4. Background Service Worker

```typescript
// src/background/service-worker.ts

import { ThoughtForkData, Message, MessageType } from '../shared/types';
import { StorageManager } from '../shared/storage';

const storage = new StorageManager();

/**
 * メッセージリスナー
 */
chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // 非同期レスポンス
});

/**
 * メッセージハンドラー
 */
async function handleMessage(message: MessageType, sender: chrome.runtime.MessageSender) {
  switch (message.type) {
    case 'NEW_MESSAGE':
      return await handleNewMessage(message.payload);
    
    case 'REQUEST_DATA':
      return await handleDataRequest(message.payload.conversationId);
    
    default:
      console.warn('[ThoughtFork] Unknown message type:', message);
  }
}

/**
 * 新しいメッセージを保存
 */
async function handleNewMessage(message: Message): Promise<void> {
  await storage.addMessage(message);
  
  // Side Panelに通知
  chrome.runtime.sendMessage({
    type: 'MESSAGE_ADDED',
    payload: message
  }).catch(() => {
    // Side Panelが開いていない場合は無視
  });
}

/**
 * データリクエストに応答
 */
async function handleDataRequest(conversationId: string): Promise<ThoughtForkData> {
  return await storage.getData(conversationId);
}

/**
 * 拡張機能アイコンクリックでSide Panelを開く
 */
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

/**
 * Side Panelを有効化
 */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

### 5. Storage Manager

```typescript
// src/shared/storage.ts

import { ThoughtForkData, Message, Branch, Tag, Conversation, UserSettings } from './types';
import { generateId, getDefaultTags, getDefaultColorPalette } from './utils';

const STORAGE_KEY = 'thoughtfork_data';

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
      url: window.location?.href || '',
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
```

### 6. ユーティリティ

```typescript
// src/shared/utils.ts

import { Tag } from './types';

/**
 * UUIDを生成
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * デフォルトタグを取得
 */
export function getDefaultTags(): Tag[] {
  const now = new Date().toISOString();
  return [
    { id: 'tag-important', name: '重要', color: '#ef4444', isPreset: true, createdAt: now },
    { id: 'tag-later', name: '後で読む', color: '#f59e0b', isPreset: true, createdAt: now },
    { id: 'tag-question', name: '質問', color: '#3b82f6', isPreset: true, createdAt: now },
    { id: 'tag-idea', name: 'アイデア', color: '#10b981', isPreset: true, createdAt: now },
    { id: 'tag-reference', name: '参考', color: '#8b5cf6', isPreset: true, createdAt: now }
  ];
}

/**
 * デフォルトカラーパレット
 */
export function getDefaultColorPalette(): string[] {
  return [
    '#ef4444', // red
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#6b7280', // gray
    '#000000'  // black
  ];
}

/**
 * 日時をフォーマット
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * テキストを切り詰め
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * 色の明度を判定（テキスト色決定用）
 */
export function isLightColor(hex: string): boolean {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

/**
 * ブランチ用の色を自動生成
 */
export function generateBranchColor(index: number): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1'
  ];
  return colors[index % colors.length];
}
```

### 7. Side Panel React App

```typescript
// src/sidepanel/index.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/main.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
```

```typescript
// src/sidepanel/App.tsx

import React, { useState, useEffect } from 'react';
import { ViewSwitcher } from './components/ViewSwitcher';
import { KanbanView } from './components/KanbanView';
import { NetworkView } from './components/NetworkView';
import { ThreeDView } from './components/ThreeDView';
import { BranchSidebar } from './components/BranchSidebar';
import { FilterBar } from './components/FilterBar';
import { useConversation } from './hooks/useConversation';
import { ThoughtForkData } from '../shared/types';

type ViewType = 'kanban' | 'network' | '3d';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data, loading, error, refresh } = useConversation();

  // メッセージ受信リスナー
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'MESSAGE_ADDED') {
        refresh();
      }
    };
    
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* ブランチサイドバー */}
      {sidebarOpen && (
        <BranchSidebar
          branches={data?.branches || []}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* メインエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded"
              title="Toggle Sidebar"
            >
              ☰
            </button>
            <h1 className="text-xl font-bold">ThoughtFork</h1>
          </div>
          
          <ViewSwitcher
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        </header>

        {/* フィルターバー */}
        <FilterBar tags={data?.tags || []} />

        {/* ビューエリア */}
        <main className="flex-1 overflow-auto p-4">
          {currentView === 'kanban' && (
            <KanbanView data={data} />
          )}
          {currentView === 'network' && (
            <NetworkView data={data} />
          )}
          {currentView === '3d' && (
            <ThreeDView data={data} />
          )}
        </main>
      </div>
    </div>
  );
}
```

### 8. View Switcher

```typescript
// src/sidepanel/components/ViewSwitcher.tsx

import React from 'react';

type ViewType = 'kanban' | 'network' | '3d';

interface Props {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSwitcher({ currentView, onViewChange }: Props) {
  const views: { id: ViewType; label: string; icon: string }[] = [
    { id: 'kanban', label: 'カンバン', icon: '▤' },
    { id: 'network', label: '2D', icon: '◉' },
    { id: '3d', label: '3D', icon: '◈' }
  ];

  return (
    <div className="flex bg-gray-800 rounded-lg p-1">
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${currentView === view.id
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }
          `}
        >
          <span className="mr-2">{view.icon}</span>
          {view.label}
        </button>
      ))}
    </div>
  );
}
```

### 9. Kanban View

```typescript
// src/sidepanel/components/KanbanView.tsx

import React from 'react';
import { ThoughtForkData, Branch, Message } from '../../shared/types';
import { MessageCard } from './MessageCard';

interface Props {
  data: ThoughtForkData | null;
}

export function KanbanView({ data }: Props) {
  if (!data || data.branches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        会話を開始するとここに表示されます
      </div>
    );
  }

  const getMessagesForBranch = (branchId: string): Message[] => {
    return data.messages
      .filter(m => m.branchId === branchId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {data.branches.map(branch => (
        <div
          key={branch.id}
          className="flex-shrink-0 w-80 bg-gray-800 rounded-lg flex flex-col"
        >
          {/* カラムヘッダー */}
          <div
            className="p-3 border-b border-gray-700 flex items-center gap-2"
            style={{ borderTopColor: branch.color, borderTopWidth: '3px' }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: branch.color }}
            />
            <h3 className="font-semibold">{branch.name}</h3>
            <span className="text-gray-500 text-sm ml-auto">
              {getMessagesForBranch(branch.id).length}
            </span>
          </div>

          {/* メッセージリスト */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {getMessagesForBranch(branch.id).map(message => (
              <MessageCard
                key={message.id}
                message={message}
                tags={data.tags}
              />
            ))}
          </div>

          {/* 新規分岐ボタン */}
          <div className="p-2 border-t border-gray-700">
            <button className="w-full py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-sm">
              + 分岐を作成
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 10. Message Card

```typescript
// src/sidepanel/components/MessageCard.tsx

import React, { useState } from 'react';
import { Message, Tag } from '../../shared/types';
import { truncate, formatDate, isLightColor } from '../../shared/utils';
import { TagPicker } from './TagPicker';
import { ColorPicker } from './ColorPicker';

interface Props {
  message: Message;
  tags: Tag[];
  onUpdate?: (messageId: string, updates: Partial<Message>) => void;
}

export function MessageCard({ message, tags, onUpdate }: Props) {
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messageTags = tags.filter(t => message.tagIds.includes(t.id));

  const handleAddTag = (tagId: string) => {
    if (!message.tagIds.includes(tagId)) {
      onUpdate?.(message.id, {
        tagIds: [...message.tagIds, tagId]
      });
    }
    setShowTagPicker(false);
  };

  const handleSetColor = (color: string | null) => {
    onUpdate?.(message.id, { color });
    setShowColorPicker(false);
  };

  return (
    <div
      className={`
        p-3 rounded-lg cursor-pointer transition-all
        ${message.role === 'human' ? 'bg-blue-900/30' : 'bg-gray-700/50'}
        hover:ring-2 hover:ring-indigo-500
      `}
      style={{
        backgroundColor: message.color || undefined,
        color: message.color && !isLightColor(message.color) ? 'white' : undefined
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <span className={`
          text-xs font-medium px-2 py-0.5 rounded
          ${message.role === 'human' ? 'bg-blue-600' : 'bg-green-600'}
        `}>
          {message.role === 'human' ? 'You' : 'Claude'}
        </span>
        
        <div className="flex items-center gap-1">
          {message.isBranchPoint && (
            <span className="text-yellow-500" title="分岐点">⑂</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTagPicker(!showTagPicker);
            }}
            className="text-gray-400 hover:text-white p-1"
            title="タグを追加"
          >
            +
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <p className="text-sm mb-2 line-clamp-3">
        {truncate(message.content, 150)}
      </p>

      {/* タグ */}
      {messageTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {messageTags.map(tag => (
            <span
              key={tag.id}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: tag.color,
                color: isLightColor(tag.color) ? 'black' : 'white'
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* メモ */}
      {message.note && (
        <div className="text-xs text-gray-400 italic border-l-2 border-gray-600 pl-2 mb-2">
          {message.note}
        </div>
      )}

      {/* フッター */}
      <div className="text-xs text-gray-500">
        {formatDate(message.timestamp)}
      </div>

      {/* タグピッカー */}
      {showTagPicker && (
        <TagPicker
          tags={tags}
          selectedIds={message.tagIds}
          onSelect={handleAddTag}
          onClose={() => setShowTagPicker(false)}
        />
      )}

      {/* カラーピッカー */}
      {showColorPicker && (
        <ColorPicker
          currentColor={message.color}
          onSelect={handleSetColor}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {/* コンテキストメニュー */}
      {showMenu && (
        <div
          className="absolute z-50 bg-gray-800 rounded-lg shadow-lg py-1 min-w-[160px]"
          onClick={() => setShowMenu(false)}
        >
          <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700">
            ⑂ ここから分岐
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700"
            onClick={() => setShowColorPicker(true)}
          >
            🎨 色を変更
          </button>
          <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700">
            📝 メモを追加
          </button>
        </div>
      )}
    </div>
  );
}
```

### 11. Network View (D3.js)

```typescript
// src/sidepanel/components/NetworkView.tsx

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ThoughtForkData, Message } from '../../shared/types';

interface Props {
  data: ThoughtForkData | null;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  role: 'human' | 'assistant';
  content: string;
  color: string | null;
  isBranchPoint: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

export function NetworkView({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // ノードとリンクを構築
    const nodes: Node[] = data.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.contentPreview,
      color: m.color,
      isBranchPoint: m.isBranchPoint
    }));

    const links: Link[] = data.messages
      .filter(m => m.parentId)
      .map(m => ({
        source: m.parentId!,
        target: m.id
      }));

    // シミュレーション
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // ズーム
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    // リンク描画
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#4b5563')
      .attr('stroke-width', 2);

    // ノード描画
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.isBranchPoint ? 15 : 10)
      .attr('fill', d => d.color || (d.role === 'human' ? '#3b82f6' : '#10b981'))
      .attr('stroke', d => d.isBranchPoint ? '#fbbf24' : 'none')
      .attr('stroke-width', d => d.isBranchPoint ? 3 : 0)
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // ツールチップ
    node.append('title')
      .text(d => d.content);

    // シミュレーション更新
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: '#111827' }}
      />
    </div>
  );
}
```

### 12. 3D View (Three.js)

```typescript
// src/sidepanel/components/ThreeDView.tsx

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ThoughtForkData } from '../../shared/types';

interface Props {
  data: ThoughtForkData | null;
}

export function ThreeDView({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // シーン
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    // カメラ
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;

    // レンダラー
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // コントロール
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // ノードを配置
    const nodeObjects: THREE.Mesh[] = [];
    const nodePositions = new Map<string, THREE.Vector3>();

    data.messages.forEach((message, index) => {
      const geometry = new THREE.SphereGeometry(
        message.isBranchPoint ? 1.5 : 1,
        32,
        32
      );
      
      const color = message.color
        ? new THREE.Color(message.color)
        : message.role === 'human'
          ? new THREE.Color(0x3b82f6)
          : new THREE.Color(0x10b981);

      const material = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(geometry, material);

      // 位置計算（螺旋状に配置）
      const angle = index * 0.5;
      const radius = 10 + index * 0.5;
      const y = index * 2 - data.messages.length;
      
      sphere.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );

      scene.add(sphere);
      nodeObjects.push(sphere);
      nodePositions.set(message.id, sphere.position.clone());
    });

    // エッジを描画
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4b5563 });

    data.messages.forEach(message => {
      if (message.parentId) {
        const start = nodePositions.get(message.parentId);
        const end = nodePositions.get(message.id);
        
        if (start && end) {
          const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
          const line = new THREE.Line(geometry, lineMaterial);
          scene.add(line);
        }
      }
    });

    // アニメーション
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // リサイズ対応
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
```

### 13. Hooks

```typescript
// src/sidepanel/hooks/useConversation.ts

import { useState, useEffect, useCallback } from 'react';
import { ThoughtForkData } from '../../shared/types';
import { StorageManager } from '../../shared/storage';

const storage = new StorageManager();

export function useConversation() {
  const [data, setData] = useState<ThoughtForkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await storage.getData();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { data, loading, error, refresh };
}
```

```typescript
// src/sidepanel/hooks/useBranches.ts

import { useCallback } from 'react';
import { Branch } from '../../shared/types';
import { StorageManager } from '../../shared/storage';
import { generateBranchColor } from '../../shared/utils';

const storage = new StorageManager();

export function useBranches() {
  const createBranch = useCallback(async (
    conversationId: string,
    forkMessageId: string,
    name?: string
  ): Promise<Branch> => {
    const data = await storage.getData(conversationId);
    const branchCount = data.branches.length;
    
    return storage.createBranch(
      conversationId,
      forkMessageId,
      name || `Branch-${branchCount + 1}`,
      generateBranchColor(branchCount)
    );
  }, []);

  return { createBranch };
}
```

### 14. その他のコンポーネント

```typescript
// src/sidepanel/components/BranchSidebar.tsx

import React from 'react';
import { Branch } from '../../shared/types';

interface Props {
  branches: Branch[];
  onClose: () => void;
}

export function BranchSidebar({ branches, onClose }: Props) {
  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold">ブランチ</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ×
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {branches.map(branch => (
          <div
            key={branch.id}
            className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: branch.color }}
            />
            <span className="flex-1 truncate">{branch.name}</span>
          </div>
        ))}
      </div>
      
      <div className="p-2 border-t border-gray-700">
        <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm">
          + 新規ブランチ
        </button>
      </div>
    </aside>
  );
}
```

```typescript
// src/sidepanel/components/TagPicker.tsx

import React from 'react';
import { Tag } from '../../shared/types';
import { isLightColor } from '../../shared/utils';

interface Props {
  tags: Tag[];
  selectedIds: string[];
  onSelect: (tagId: string) => void;
  onClose: () => void;
}

export function TagPicker({ tags, selectedIds, onSelect, onClose }: Props) {
  return (
    <div className="absolute z-50 mt-2 bg-gray-800 rounded-lg shadow-lg p-2 min-w-[150px]">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
        <span className="text-sm font-medium">タグを選択</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">×</button>
      </div>
      
      <div className="space-y-1">
        {tags.map(tag => (
          <button
            key={tag.id}
            onClick={() => onSelect(tag.id)}
            className={`
              w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2
              ${selectedIds.includes(tag.id) ? 'bg-gray-600' : 'hover:bg-gray-700'}
            `}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            <span>{tag.name}</span>
            {selectedIds.includes(tag.id) && <span className="ml-auto">✓</span>}
          </button>
        ))}
      </div>
      
      <button className="w-full mt-2 pt-2 border-t border-gray-700 text-sm text-gray-400 hover:text-white">
        + カスタムタグを作成
      </button>
    </div>
  );
}
```

```typescript
// src/sidepanel/components/ColorPicker.tsx

import React from 'react';
import { getDefaultColorPalette } from '../../shared/utils';

interface Props {
  currentColor: string | null;
  onSelect: (color: string | null) => void;
  onClose: () => void;
}

export function ColorPicker({ currentColor, onSelect, onClose }: Props) {
  const colors = getDefaultColorPalette();

  return (
    <div className="absolute z-50 mt-2 bg-gray-800 rounded-lg shadow-lg p-3">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
        <span className="text-sm font-medium">色を選択</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">×</button>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {colors.map(color => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={`
              w-8 h-8 rounded-full border-2
              ${currentColor === color ? 'border-white' : 'border-transparent'}
            `}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      
      <button
        onClick={() => onSelect(null)}
        className="w-full mt-2 pt-2 border-t border-gray-700 text-sm text-gray-400 hover:text-white"
      >
        色をリセット
      </button>
    </div>
  );
}
```

```typescript
// src/sidepanel/components/FilterBar.tsx

import React, { useState } from 'react';
import { Tag } from '../../shared/types';

interface Props {
  tags: Tag[];
}

export function FilterBar({ tags }: Props) {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  return (
    <div className="p-3 border-b border-gray-700 flex items-center gap-3">
      {/* 検索 */}
      <div className="relative flex-1 max-w-xs">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="検索..."
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* タグフィルタ */}
      <div className="flex items-center gap-1">
        {tags.slice(0, 5).map(tag => (
          <button
            key={tag.id}
            onClick={() => {
              setSelectedTags(prev =>
                prev.includes(tag.id)
                  ? prev.filter(id => id !== tag.id)
                  : [...prev, tag.id]
              );
            }}
            className={`
              px-2 py-1 rounded-full text-xs
              ${selectedTags.includes(tag.id)
                ? 'opacity-100'
                : 'opacity-50 hover:opacity-75'
              }
            `}
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## ビルド設定

### package.json

```json
{
  "name": "thoughtfork",
  "version": "1.0.0",
  "description": "AI会話可視化Chrome拡張機能",
  "scripts": {
    "dev": "webpack --watch --mode development",
    "build": "webpack --mode production",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.260",
    "@types/d3": "^7.4.3",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/three": "^0.160.0",
    "autoprefixer": "^10.4.17",
    "copy-webpack-plugin": "^12.0.2",
    "css-loader": "^6.9.1",
    "html-webpack-plugin": "^5.6.0",
    "postcss": "^8.4.35",
    "postcss-loader": "^8.1.0",
    "style-loader": "^3.3.4",
    "tailwindcss": "^3.4.1",
    "ts-loader": "^9.5.1",
    "typescript": "^5.3.3",
    "webpack": "^5.90.1",
    "webpack-cli": "^5.1.4"
  },
  "dependencies": {
    "d3": "^7.8.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "three": "^0.160.0"
  }
}
```

### webpack.config.js

```javascript
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    content: './src/content/content.ts',
    background: './src/background/service-worker.ts',
    sidepanel: './src/sidepanel/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/assets/icons', to: 'icons' }
      ]
    }),
    new HtmlWebpackPlugin({
      template: './src/sidepanel/index.html',
      filename: 'sidepanel.html',
      chunks: ['sidepanel']
    })
  ]
};
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### tailwind.config.js

```javascript
module.exports = {
  content: ['./src/**/*.{tsx,ts,html}'],
  theme: {
    extend: {}
  },
  plugins: []
};
```

### postcss.config.js

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

---

## 開発手順

1. プロジェクトディレクトリを作成し、上記すべてのファイルを配置
2. `npm install` で依存関係をインストール
3. `npm run build` でビルド
4. Chrome の `chrome://extensions/` で「パッケージ化されていない拡張機能を読み込む」
5. `dist` フォルダを選択
6. Claude.ai を開き、拡張機能アイコンをクリックしてSide Panelを開く

---

## 注意事項

- Claude.aiのDOM構造は変更される可能性があるため、セレクタは適宜調整が必要
- 大量のメッセージがある場合、パフォーマンス最適化が必要になる可能性あり
- Three.jsのOrbitControlsは別途importが必要（webpack設定で対応）
- アイコン画像（icon16.png, icon48.png, icon128.png）は別途作成が必要
