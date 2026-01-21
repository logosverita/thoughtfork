import React from 'react';

type ViewType = 'kanban' | 'network' | '3d';

interface Props {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSwitcher({ currentView, onViewChange }: Props) {
  const views: { id: ViewType; label: string; icon: string }[] = [
    { id: 'kanban', label: 'カンバン', icon: '▤' },
    { id: 'network', label: '2D', icon: '◉' },
    { id: '3d', label: '3D', icon: '◈' }
  ];

  return (
    <div className="flex bg-gray-800 rounded-lg p-1">
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${currentView === view.id
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }
          `}
        >
          <span className="mr-2">{view.icon}</span>
          {view.label}
        </button>
      ))}
    </div>
  );
}
