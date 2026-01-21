import React from 'react';
import { ThoughtForkData, Message } from '../../shared/types';
import { MessageCard } from './MessageCard';

interface Props {
  data: ThoughtForkData | null;
}

export function KanbanView({ data }: Props) {
  if (!data || data.branches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        会話を開始するとここに表示されます
      </div>
    );
  }

  const getMessagesForBranch = (branchId: string): Message[] => {
    return data.messages
      .filter(m => m.branchId === branchId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {data.branches.map(branch => (
        <div
          key={branch.id}
          className="flex-shrink-0 w-80 bg-gray-800 rounded-lg flex flex-col"
        >
          {/* カラムヘッダー */}
          <div
            className="p-3 border-b border-gray-700 flex items-center gap-2"
            style={{ borderTopColor: branch.color, borderTopWidth: '3px' }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: branch.color }}
            />
            <h3 className="font-semibold">{branch.name}</h3>
            <span className="text-gray-500 text-sm ml-auto">
              {getMessagesForBranch(branch.id).length}
            </span>
          </div>

          {/* メッセージリスト */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {getMessagesForBranch(branch.id).map(message => (
              <MessageCard
                key={message.id}
                message={message}
                tags={data.tags}
              />
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
