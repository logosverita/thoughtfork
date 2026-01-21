import React from 'react';
import { storage } from '../../shared/storage';

interface Props {
  onClose: () => void;
  onRefresh: () => void;
}

export function SettingsModal({ onClose, onRefresh }: Props) {
  // const fileInputRef = useRef<HTMLInputElement>(null); // Unused

  const handleExportJson = async () => {
    const data = await storage.getData();
    // 不要なメタデータを削除するか、そのまま全ダンプするか
    // ここではそのままダンプ
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `thoughtfork-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); // Add to body to ensure click works in all browsers
    a.click();
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = async () => {
    const data = await storage.getData();
    if (!data) return;

    let md = `# ThoughtFork Export - ${data.meta.createdAt}\n\n`;

    // Better Approach: Iterate branches or build a tree.
    // Let's just dump linearly by branch for readability using the Branches list.
    data.branches.forEach(branch => {
      md += `## Branch: ${branch.name}\n\n`;
      branch.messageIds.forEach(msgId => {
        const msg = data.messages.find((m) => m.id === msgId);
        if (!msg) return;
        const roleIcon = msg.role === 'human' ? '👤' : '🤖';
        const roleName = msg.role === 'human' ? 'User' : 'Claude';
        md += `### ${roleIcon} ${roleName}\n\n${msg.content}\n\n---\n\n`;
      });
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoughtfork-export-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a); // Add to body to ensure click works in all browsers
    a.click();
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url);
  };


  // handleImportClick removed as it was unused


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('This will overwrite all current data. Are you sure?')) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 簡易バリデーション
      if (!data.version || !Array.isArray(data.messages)) {
        throw new Error('Invalid ThoughtFork data format');
      }

      await storage.saveData(data);
      alert('Data imported successfully!');
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to import data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleClearData = async () => {
    const confirmText = prompt('Type "DELETE" to confirm wiping all data. This cannot be undone.');
    if (confirmText === 'DELETE') {
      localStorage.clear();
      onRefresh();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gray-800 glass-card w-full max-w-md rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">⚙️ Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Data Management Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Data Management
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleExportJson}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>📥</span> Export JSON
              </button>
              <button
                onClick={handleExportMarkdown}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>📝</span> Export MD
              </button>
              <label className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer col-span-2">
                <span>📤</span> Import JSON
                <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="border-t border-gray-700/50 pt-4">
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
              Danger Zone
            </h3>
            <button
              onClick={handleClearData}
              className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>🔥</span> Clear All Data
            </button>
          </div>

          <div className="border-t border-gray-700/50 pt-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Debug</h3>
            <button
              onClick={() => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_PAGE' }, () => {
                      alert('Sent scan request to content script');
                    });
                  }
                });
              }}
              className="w-full py-2 px-4 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 font-medium rounded-lg transition-colors text-sm"
            >
              Force Page Scan
            </button>
          </div>
        </div>

        <div className="p-4 bg-gray-900/50 text-center text-xs text-gray-500">
          ThoughtFork v1.0.0
        </div>
      </div>
    </div>
  );
}
