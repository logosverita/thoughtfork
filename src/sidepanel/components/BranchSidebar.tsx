import React, { useState, useMemo } from 'react';
import { Branch, Message } from '../../shared/types'; // Import Message
import { storage } from '../../shared/storage';
import { extractKeywords } from '../../shared/keywordExtractor'; // Import extractor

interface Props {
  branches: Branch[];
  messages: Message[]; // Add messages prop
  onClose: () => void;
  currentBranchId?: string;
  onRefresh: () => void;
}

export const BranchSidebar: React.FC<Props> = ({ branches, messages, onClose, currentBranchId, onRefresh }) => {
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Create message lookup map for efficiency
  const messageMap = useMemo(() => {
    const map = new Map<string, Message>();
    messages.forEach(m => map.set(m.id, m));
    return map;
  }, [messages]);

  // Helper to get keywords for a branch
  const getKeywords = (branch: Branch) => {
    const branchMessages = branch.messageIds
      .map(id => messageMap.get(id)?.content || '')
      .filter(content => content.length > 0);
    return extractKeywords(branchMessages, 3);
  };

  const handleRename = async (branchId: string) => {
    if (!editName.trim()) return;
    await storage.updateBranch(branchId, { name: editName });
    setEditingBranchId(null);
    onRefresh();
  };

  const handleDelete = async (branchId: string) => {
    if (confirm('Are you sure you want to delete this branch? All messages in it will be lost.')) {
      await storage.deleteBranch(branchId);
      onRefresh?.();
    }
  };

  const startEditing = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setEditName(branch.name);
  };

  const handleCreateBranch = async () => {
    // 1. 名前を入力させる（簡易プロンプト）
    const name = prompt('Enter a name for the new branch:', 'New Branch');
    if (!name) return;

    // 2. 現在のブランチの最後のメッセージを分岐点とする
    // もしメッセージがない場合は分岐できない（またはルートから）
    // ここでは現在のブランチの最後のメッセージを探す
    const currentBranch = branches.find(b => b.id === currentBranchId);
    let forkMessageId = '';

    if (currentBranch && currentBranch.messageIds.length > 0) {
      forkMessageId = currentBranch.messageIds[currentBranch.messageIds.length - 1];
    } else if (messages.length > 0) {
      // フォールバック：全メッセージの最後（時系列）
      // 本当はツリー構造を意識すべきだが、簡易実装
      const sorted = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      forkMessageId = sorted[sorted.length - 1].id;
    } else {
      alert('Cannot create a branch without any messages.');
      return;
    }

    // 3. ブランチ作成
    await storage.createBranch(
      currentBranch?.conversationId || messages[0]?.conversationId || 'unknown',
      forkMessageId,
      name,
      '#8b5cf6' // Default color: Violet
    );

    // 4. リフレッシュ
    onRefresh();
  };

  return (
    <aside className="w-64 glass border-r border-white/5 flex flex-col animate-slide-right h-full absolute left-0 z-30 transition-all duration-300 backdrop-blur-xl bg-gray-900/80">
      <div className="p-4 border-b border-white/5 flex items-center justify-between m-2 rounded-lg bg-white/5">
        <h2 className="font-bold text-white tracking-wide flex items-center gap-2 text-sm uppercase">
          <span className="text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">⚡</span> Branches
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className={`
              group relative flex flex-col gap-1 p-3 rounded-lg transition-all duration-300 border
              ${branch.id === currentBranchId
                ? 'bg-gradient-to-r from-violet-900/40 to-indigo-900/40 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
              }
            `}
          >
            <div className="flex items-center gap-3 w-full">
              <div
                className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] flex-shrink-0 transition-transform group-hover:scale-125`}
                style={{ backgroundColor: branch.color }}
              />

              <div className="flex-1 min-w-0">
                {editingBranchId === branch.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(branch.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(branch.id);
                      if (e.key === 'Escape') setEditingBranchId(null);
                    }}
                    className="bg-black/40 text-white px-2 py-1 rounded w-full text-xs border border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    autoFocus
                  />
                ) : (
                  <div className="group/item flex items-center justify-between w-full">
                    <span
                      className={`text-sm font-medium truncate transition-colors ${branch.id === currentBranchId ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}
                      title={branch.name}
                    >
                      {branch.name}
                    </span>

                    {/* Action Buttons (Visible on Hover) */}
                    <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditing(branch); }}
                        className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(branch.id); }}
                        className="p-1 hover:bg-rose-900/30 rounded text-gray-500 hover:text-rose-400 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center gap-2 pl-5">
              <span className="text-[10px] text-gray-600 font-mono">
                {branch.messageIds.length} nodes
              </span>
              <div className="flex gap-1 overflow-hidden">
                {getKeywords(branch).map((keyword, idx) => (
                  <span key={idx} className="text-[9px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded-[3px] truncate max-w-[60px] border border-white/5">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Active Indicator Dot */}
            {branch.id === currentBranchId && (
              <span className="absolute right-2 top-3 w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-slow pointer-events-none shadow-[0_0_8px_currentColor]" />
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <button
          onClick={handleCreateBranch}
          className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg shadow-lg shadow-violet-900/20 transition-all duration-300 transform hover:translate-y-[-1px] active:translate-y-[1px] font-medium text-sm flex items-center justify-center gap-2 border border-white/10"
        >
          <span className="text-lg leading-none">+</span> New Branch
        </button>
      </div>
    </aside>
  );
}
