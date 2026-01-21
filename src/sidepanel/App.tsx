import React, { useState, useEffect } from 'react';
import { ViewSwitcher } from './components/ViewSwitcher';
import { KanbanView } from './components/KanbanView';
import { NetworkView } from './components/NetworkView';
import { ThreeDView } from './components/ThreeDView';
import { BranchSidebar } from './components/BranchSidebar';
import { FilterBar } from './components/FilterBar';
import { useConversation } from './hooks/useConversation';

type ViewType = 'kanban' | 'network' | '3d';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data, loading, error, refresh } = useConversation();

  // メッセージ受信リスナー
  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === 'MESSAGE_ADDED') {
        refresh();
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* ブランチサイドバー */}
      {sidebarOpen && (
        <BranchSidebar
          branches={data?.branches || []}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* メインエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded"
              title="Toggle Sidebar"
            >
              ☰
            </button>
            <h1 className="text-xl font-bold">ThoughtFork</h1>
          </div>

          <ViewSwitcher
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        </header>

        {/* フィルターバー */}
        <FilterBar tags={data?.tags || []} />

        {/* ビューエリア */}
        <main className="flex-1 overflow-auto p-4">
          {currentView === 'kanban' && (
            <KanbanView data={data} />
          )}
          {currentView === 'network' && (
            <NetworkView data={data} />
          )}
          {currentView === '3d' && (
            <ThreeDView data={data} />
          )}
        </main>
      </div>
    </div>
  );
}
