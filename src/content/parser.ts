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
