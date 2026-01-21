import { Tag } from './types';
import { DEFAULT_COLORS, BRANCH_COLORS } from './constants';

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
  return DEFAULT_COLORS;
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
  return BRANCH_COLORS[index % BRANCH_COLORS.length];
}
