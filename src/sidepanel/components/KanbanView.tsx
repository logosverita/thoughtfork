import React from 'react';
import { ThoughtForkData, Message } from '../../shared/types';
import { MessageCard } from './MessageCard';

export interface Props {
  data: ThoughtForkData | null;
  searchQuery: string;
  selectedTags: string[];
  onNodeClick: (message: Message) => void;
  activeMessageId?: string | null;
  onFork?: (messageId: string) => void;
}

export const KanbanView: React.FC<Props> = ({ data, searchQuery, selectedTags, onNodeClick, activeMessageId, onFork }) => {
  if (!data || data.branches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        会話を開始するとここに表示されます
      </div>
    );
  }

  const getMessagesForBranch = (branchId: string): Message[] => {
    return (
      data.messages
        .filter((m) => m.branchId === branchId)
        // 検索フィルタ
        .filter((m) => !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase()))
        // タグフィルタ (実装準備)
        // .filter(m => !selectedTags?.length || m.tagIds.some(t => selectedTags.includes(t)))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    );
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {data.branches.map((branch) => (
        <div key={branch.id} className="flex-shrink-0 w-80 bg-gray-800 rounded-lg flex flex-col">
          {/* カラムヘッダー */}
          <div
            className="p-3 border-b border-gray-700 flex items-center gap-2"
            style={{ borderTopColor: branch.color, borderTopWidth: '3px' }}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branch.color }} />
            <h3 className="font-semibold">{branch.name}</h3>
            <span className="text-gray-500 text-sm ml-auto">
              {getMessagesForBranch(branch.id).length}
            </span>
          </div>

          {/* メッセージリスト */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {getMessagesForBranch(branch.id).map((message) => (
              <div
                key={message.id}
                onClick={() => onNodeClick(message)}
                className={`p-3 rounded-lg text-sm mb-2 shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 border-l-4 ${message.id === activeMessageId
                  ? 'bg-indigo-900/50 border-indigo-400 ring-2 ring-indigo-500 scale-105'
                  : message.role === 'human'
                    ? 'bg-gray-800 border-indigo-500 hover:bg-gray-700'
                    : 'bg-gray-800 border-rose-500 hover:bg-gray-700'
                  }`}
              >
                <MessageCard message={message} tags={data.tags} onFork={onFork} />
              </div>
            ))}
          </div>

          {/* 新規分岐ボタン */}
          <div className="p-2 border-t border-gray-700">
            <button className="w-full py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded text-sm">
              + 分岐を作成
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
