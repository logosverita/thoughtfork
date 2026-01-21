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
