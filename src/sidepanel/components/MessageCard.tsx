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
        relative p-3 rounded-lg cursor-pointer transition-all
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
          className="absolute z-50 bg-gray-800 rounded-lg shadow-lg py-1 min-w-[160px] top-full left-0 mt-1"
          onClick={() => setShowMenu(false)}
        >
          <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700">
            ⑂ ここから分岐
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700"
            onClick={() => setShowColorPicker(true)}
          >
            色を変更
          </button>
          <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700">
            メモを追加
          </button>
        </div>
      )}
    </div>
  );
}
