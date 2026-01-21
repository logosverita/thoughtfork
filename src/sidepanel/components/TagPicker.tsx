import React from 'react';
import { Tag } from '../../shared/types';

interface Props {
  tags: Tag[];
  selectedIds: string[];
  onSelect: (tagId: string) => void;
  onClose: () => void;
}

export function TagPicker({ tags, selectedIds, onSelect, onClose }: Props) {
  return (
    <div className="absolute z-50 mt-2 bg-gray-800 rounded-lg shadow-lg p-2 min-w-[150px] top-full left-0">
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
