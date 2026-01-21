import React, { useState } from 'react';
import { Message, Tag } from '../../shared/types';
import { truncate, formatDate, isLightColor } from '../../shared/utils';
import { TagPicker } from './TagPicker';
import { ColorPicker } from './ColorPicker';

interface Props {
  message: Message;
  tags: Tag[];
  onUpdate?: (messageId: string, updates: Partial<Message>) => void;
  onFork?: (messageId: string) => void;
}

export function MessageCard({ message, tags, onUpdate, onFork }: Props) {
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messageTags = tags.filter((t) => message.tagIds.includes(t.id));

  const handleAddTag = (tagId: string) => {
    if (!message.tagIds.includes(tagId)) {
      onUpdate?.(message.id, {
        tagIds: [...message.tagIds, tagId],
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
        relative p-4 rounded-xl cursor-pointer transition-all duration-300 group
        border border-white/5
        ${message.role === 'human'
          ? 'bg-gradient-to-br from-indigo-900/30 to-slate-900/50 hover:border-indigo-500/30'
          : 'bg-gradient-to-br from-emerald-900/20 to-slate-900/50 hover:border-emerald-500/30'}
        hover:shadow-lg hover:-translate-y-0.5
      `}
      style={{
        backgroundColor: message.color ? message.color + '20' : undefined, // 20 for low opacity
        borderColor: message.color ? message.color + '40' : undefined,
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      {/* Active Indicator Glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`
            text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase
            ${message.role === 'human'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}
          `}
          >
            {message.role === 'human' ? 'YOU' : 'AI'}
          </span>
          {/* Timestamp */}
          <span className="text-[10px] text-gray-500 font-mono">
            {formatDate(message.timestamp).split(' ')[1]}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.isBranchPoint && (
            <span className="text-amber-400 text-glow" title="Branch Point">
              ⑂
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTagPicker(!showTagPicker);
            }}
            className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Add Tag"
          >
            +
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <p className="text-sm leading-relaxed text-gray-300 mb-2 line-clamp-3 font-light tracking-wide">
        {truncate(message.content, 150)}
      </p>

      {/* タグ */}
      {messageTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {messageTags.map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] px-2 py-0.5 rounded-md border border-white/5"
              style={{
                backgroundColor: tag.color + '30', // Low opacity
                color: tag.color,
                borderColor: tag.color + '40'
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* メモ */}
      {message.note && (
        <div className="text-xs text-gray-400 italic border-l-2 border-gray-700 pl-2 mb-2 bg-black/20 p-1 rounded-r">
          {message.note}
        </div>
      )}

      {/* タグピッカー */}
      {showTagPicker && (
        <div className="absolute top-10 right-2 z-50 glass rounded-lg shadow-xl p-2 animate-fade-in">
          <TagPicker
            tags={tags}
            selectedIds={message.tagIds}
            onSelect={handleAddTag}
            onClose={() => setShowTagPicker(false)}
          />
        </div>
      )}

      {/* カラーピッカー */}
      {showColorPicker && (
        <div className="absolute top-10 right-2 z-50 glass rounded-lg shadow-xl p-2 animate-fade-in">
          <ColorPicker
            currentColor={message.color}
            onSelect={handleSetColor}
            onClose={() => setShowColorPicker(false)}
          />
        </div>
      )}

      {/* コンテキストメニュー */}
      {showMenu && (
        <div
          className="absolute z-50 glass rounded-lg shadow-2xl py-1 min-w-[160px] top-full left-0 mt-1 border border-white/10 animate-fade-in backdrop-blur-xl"
          onClick={() => setShowMenu(false)}
        >
          <button
            className="w-full px-4 py-2 text-left text-xs hover:bg-rose-500/20 hover:text-rose-200 transition-colors flex items-center gap-2 group/item"
            onClick={() => {
              onFork?.(message.id);
              setShowMenu(false);
            }}
          >
            <span className="text-rose-500 group-hover/item:text-rose-200">⑂</span>
            Fork Here
          </button>
          <button
            className="w-full px-4 py-2 text-left text-xs hover:bg-indigo-500/20 hover:text-indigo-200 transition-colors"
            onClick={() => setShowColorPicker(true)}
          >
            Change Color
          </button>
          <button className="w-full px-4 py-2 text-left text-xs hover:bg-gray-700/50 transition-colors">
            Add Note
          </button>
        </div>
      )}
    </div>
  );
}
