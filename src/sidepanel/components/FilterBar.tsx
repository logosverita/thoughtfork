import React, { useState } from 'react';
import { Tag } from '../../shared/types';

interface Props {
  tags: Tag[];
  onSearchChange: (query: string) => void;
  onTagsChange: (tagIds: string[]) => void;
}

export function FilterBar({ tags, onSearchChange, onTagsChange }: Props) {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    onSearchChange(value);
  };

  const handleTagClick = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];

    setSelectedTags(newTags);
    onTagsChange(newTags);
  };

  return (
    <div className="p-3 border-b border-gray-700/50 glass flex items-center gap-3">
      {/* 検索 */}
      <div className="relative flex-1 max-w-xs">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400">🔍</span>
        </div>
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search History..."
          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-gray-500"
        />
      </div>

      {/* タグフィルタ */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {tags.slice(0, 5).map((tag) => (
          <button
            key={tag.id}
            onClick={() => handleTagClick(tag.id)}
            className={`
              px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border
              ${
                selectedTags.includes(tag.id)
                  ? 'opacity-100 scale-105 shadow-sm border-transparent'
                  : 'opacity-60 hover:opacity-100 hover:scale-105 border-transparent hover:border-gray-600'
              }
            `}
            style={{
              backgroundColor: selectedTags.includes(tag.id) ? tag.color : `${tag.color}40`,
              color: selectedTags.includes(tag.id) ? '#fff' : tag.color,
              borderColor: selectedTags.includes(tag.id) ? 'transparent' : tag.color,
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}
