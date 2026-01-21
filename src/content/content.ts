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

    messageElements.forEach((el) => {
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
    history.pushState = function (...args) {
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
