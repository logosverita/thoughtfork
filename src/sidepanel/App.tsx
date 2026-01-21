import React, { useState, useEffect } from 'react';
import { ViewSwitcher } from './components/ViewSwitcher';
import { KanbanView } from './components/KanbanView';
import { NetworkView } from './components/NetworkView';
import { ThreeDView } from './components/ThreeDView';
import { DashboardView } from './components/DashboardView';
import { BranchSidebar } from './components/BranchSidebar';
import { FilterBar } from './components/FilterBar';
import { useConversation } from './hooks/useConversation';

type ViewType = 'kanban' | 'network' | '3d' | 'dashboard';

import { NodeDetailView } from './components/NodeDetailView';
import { Message } from '../shared/types';
import { SettingsModal } from './components/SettingsModal';
import { storage } from '../shared/storage';

// ... (existing imports)

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { data, loading, refresh } = useConversation(activeConversationId);

  // ... (useEffect for activeConversationId)

  // ... (useEffect for listener)

  // Loading/Error states ...

  // Active State Logic
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'ACTIVE_MESSAGE_CHANGED') {
        const { content, role } = message.payload;
        // マッチングロジック (content.tsと同期)
        // 簡易的なマッチング: コンテンツの先頭50文字を含んでいるか
        const normalize = (str: string) => str.trim().replace(/\s+/g, ' ').substring(0, 50);
        const target = normalize(content);

        const found = data?.messages.find(m =>
          m.role === role && normalize(m.content).includes(target)
        );

        if (found) {
          setActiveMessageId(found.id);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [data]);

  const handleJumpToMessage = (message: Message) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SCROLL_TO_MESSAGE',
          payload: { content: message.content, role: message.role }
        });
      }
    });
  };

  const handleFork = async (messageId: string) => {
    const name = prompt('Enter a name for the new branch:', 'Forked Branch');
    if (!name) return;

    await storage.createBranch(
      activeConversationId || data?.messages[0]?.conversationId || 'unknown',
      messageId,
      name,
      '#ef4444' // Rose color for forks
    );
    refresh();
  };

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Initialize Theme
  useEffect(() => {
    storage.getTheme().then(savedTheme => {
      const initialTheme = savedTheme === 'auto' ? 'dark' : savedTheme;
      setTheme(initialTheme);
    });
  }, []);

  // Apply Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-mode');
    } else {
      root.classList.remove('light-mode');
    }
    storage.saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const currentViewComponent = () => {
    switch (currentView) {
      // ... (existing cases)
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-main text-main overflow-hidden relative selection:bg-violet-500/30 font-sans transition-colors duration-300">
      {/* Background Mesh Gradient - Dark Only (or adjusted for light) */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${theme === 'light' ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      </div>
      {/* Light Mode Background Mesh */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${theme === 'dark' ? 'opacity-0' : 'opacity-100 bg-slate-50'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.05),rgba(255,255,255,0))]" />
      </div>

      {/* ブランチサイドバー */}
      {sidebarOpen && (
        <BranchSidebar
          branches={data?.branches || []}
          messages={data?.messages || []} // Pass messages
          onClose={() => setSidebarOpen(false)}
          currentBranchId={data?.messages.find((m) => m.id === selectedMessage?.id)?.branchId}
          onRefresh={refresh}
        />
      )}

      {/* メインエリア */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-0">
        {/* ヘッダー */}
        <header className="flex items-center justify-between p-4 border-b border-border-main bg-main/80 backdrop-blur-xl z-20 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                title="Open Sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </button>
            )}
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-600 to-gray-400 dark:from-white dark:via-gray-200 dark:to-gray-400 tracking-tight flex items-center gap-2">
              <span className="text-violet-500 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">●</span> ThoughtFork
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        </header>

        {/* フィルターバー */}
        <FilterBar
          tags={data?.tags || []}
          onSearchChange={setSearchQuery}
          onTagsChange={setSelectedTags}
        />

        {/* ビューエリア */}
        <main className="flex-1 overflow-hidden relative">
          {currentView === 'kanban' && (
            <KanbanView
              data={data}
              onNodeClick={setSelectedMessage}
              searchQuery={searchQuery}
              selectedTags={selectedTags}
              activeMessageId={activeMessageId}
              onFork={handleFork}
            />
          )}
          {currentView === 'network' && (
            <NetworkView
              data={data}
              onNodeClick={setSelectedMessage}
              searchQuery={searchQuery}
              selectedTags={selectedTags}
              activeMessageId={activeMessageId}
              onNodeDoubleClick={handleJumpToMessage}
            />
          )}
          {currentView === '3d' && (
            <ThreeDView
              data={data}
              searchQuery={searchQuery}
              selectedTags={selectedTags}
              onNodeClick={setSelectedMessage}
            />
          )}
          {currentView === 'dashboard' && (
            <DashboardView data={data} />
          )}

          {/* ノード詳細オーバーレイ */}
          {selectedMessage && (
            <NodeDetailView
              message={selectedMessage}
              onClose={() => setSelectedMessage(null)}
              onJump={handleJumpToMessage}
              onFork={handleFork}
            />
          )}
        </main>
      </div>

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} onRefresh={refresh} />}
    </div>
  );
}
