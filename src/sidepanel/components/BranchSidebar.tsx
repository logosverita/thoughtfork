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
