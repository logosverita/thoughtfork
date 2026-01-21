import { parseMessage, detectRole, extractContent } from './parser';
import { MessageType } from '../shared/types';
import { generateId, debounce } from '../shared/utils';

/**
 * Claude.aiの会話DOMを監視し、新しいメッセージを検出する
 * ThoughtFork Content Script
 */
class ConversationObserver {
  private observer: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
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

    // スクロール監視開始
    this.setupIntersectionObserver();

    // URL変更を監視（会話切り替え）
    this.observeUrlChanges();

    // メッセージリスナー設定
    this.setupMessageListeners();
  }

  /**
   * 既存の会話メッセージをパース
   */
  private parseExistingMessages(): void {
    const container =
      document.querySelector('[data-testid="conversation-turn-list"]') ||
      document.querySelector('#main-content') ||
      document.querySelector('main');

    if (!container) return;

    const messageElements = container.querySelectorAll('[data-testid^="conversation-turn-"]');

    messageElements.forEach((el) => {
      const message = parseMessage(el as HTMLElement, this.conversationId, this.lastMessageId);
      if (message) {
        this.lastMessageId = message.id;
        this.sendMessage({ type: 'NEW_MESSAGE', payload: message });
      }
      // 監視対象に追加
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(el);
      }
    });
  }

  /**
   * DOM変更を監視
   */
  private startObserving(): void {
    const targetNode =
      document.querySelector('#main-content') ||
      document.querySelector('main') ||
      document.body;

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
      subtree: true,
    });
  }

  /**
   * 新しいDOM要素を処理
   */
  private handleNewNode(node: HTMLElement): void {
    // メッセージ要素かチェック
    if (
      node.matches?.('[data-testid^="conversation-turn-"]') ||
      node.querySelector?.('[data-testid^="conversation-turn-"]')
    ) {
      const messageEl = node.matches('[data-testid^="conversation-turn-"]')
        ? node
        : node.querySelector('[data-testid^="conversation-turn-"]');

      if (messageEl) {
        const message = parseMessage(
          messageEl as HTMLElement,
          this.conversationId,
          this.lastMessageId
        );
        if (message) {
          this.lastMessageId = message.id;
          this.sendMessage({ type: 'NEW_MESSAGE', payload: message });
        }
        // 監視対象に追加
        if (this.intersectionObserver) {
          this.intersectionObserver.observe(messageEl);
        }
      }
    }
  }



  /**
   * IntersectionObserverの設定
   * 現在表示されているメッセージを監視
   */
  private setupIntersectionObserver(): void {
    const options = {
      root: null, // viewport
      rootMargin: '-30% 0px -30% 0px', // 画面中央付近をアクティブ領域とする
      threshold: 0.1
    };

    // デバウンスされたコールバックを作成
    // スクロール時の過剰なメッセージ送信を防ぐため、100msの遅延を入れる
    const handleIntersection = debounce((entries: IntersectionObserverEntry[]) => {
      // 交差している要素の中で最も画面中央に近いもの、あるいは最初に見つかったものを送る
      // entriesは直近の変化分しか含まないことがあるため、isIntersectingなものを探す
      const activeEntry = entries.find(entry => entry.isIntersecting);

      if (activeEntry) {
        const element = activeEntry.target as HTMLElement;
        const role = detectRole(element);
        const content = extractContent(element);

        if (role && content) {
          this.sendMessage({
            type: 'ACTIVE_MESSAGE_CHANGED',
            payload: {
              role: role,
              content: content.substring(0, 200)
            }
          });
        }
      }
    }, 100);

    const callback: IntersectionObserverCallback = (entries) => {
      handleIntersection(entries);
    };

    this.intersectionObserver = new IntersectionObserver(callback, options);
  }

  /**
   * メッセージ検索ヘルパー
   */
  private findMessageElement(content: string, role: 'human' | 'assistant'): HTMLElement | null {
    // コンテナからの検索
    const container = document.querySelector('main') || document.body;
    const turns = container.querySelectorAll('[data-testid^="conversation-turn-"]');

    // contentの前処理（正規化）
    const normalize = (str: string) => str.trim().replace(/\s+/g, ' ').substring(0, 50); // 短めに照合
    const targetPreview = normalize(content);

    for (const turn of Array.from(turns)) {
      const el = turn as HTMLElement;
      // ロールチェック
      const elRole = detectRole(el);
      if (elRole !== role) continue;

      // テキストチェック
      if (el.innerText.includes(targetPreview)) {
        return el;
      }
    }

    return null;
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
   * メッセージリスナーを設定
   */
  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_CURRENT_CONVERSATION') {
        sendResponse({ conversationId: this.conversationId });
      }
      if (message.type === 'SCAN_PAGE') {
        this.parseExistingMessages();
        sendResponse({ success: true });
      }
      if (message.type === 'SCROLL_TO_MESSAGE') {
        const { content, role } = message.payload;
        const element = this.findMessageElement(content, role);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // ハイライト演出
          element.style.transition = 'background-color 0.5s';
          const originalBg = element.style.backgroundColor;
          element.style.backgroundColor = 'rgba(99, 102, 241, 0.2)'; // 薄いインディゴ
          setTimeout(() => {
            element.style.backgroundColor = originalBg;
          }, 1500);
          sendResponse({ success: true });
        } else {
          console.warn('[ThoughtFork] Target element not found for scroll');
          sendResponse({ success: false });
        }
      }
    });
  }

  /**
   * バックグラウンドにメッセージ送信
   */
  private sendMessage(message: MessageType): void {
    try {
      chrome.runtime.sendMessage(message);
    } catch {
      // 拡張機能が無効化された場合などのエラーを抑制
    }
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.observer?.disconnect();
    this.intersectionObserver?.disconnect();
  }
}

// 初期化
new ConversationObserver();
