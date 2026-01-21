import React from 'react';
import { getDefaultColorPalette } from '../../shared/utils';

interface Props {
  currentColor: string | null;
  onSelect: (color: string | null) => void;
  onClose: () => void;
}

export function ColorPicker({ currentColor, onSelect, onClose }: Props) {
  const colors = getDefaultColorPalette();

  return (
    <div className="absolute z-50 mt-2 bg-gray-800 rounded-lg shadow-lg p-3 top-full left-0">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
        <span className="text-sm font-medium">色を選択</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">×</button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {colors.map(color => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={`
              w-8 h-8 rounded-full border-2
              ${currentColor === color ? 'border-white' : 'border-transparent'}
            `}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <button
        onClick={() => onSelect(null)}
        className="w-full mt-2 pt-2 border-t border-gray-700 text-sm text-gray-400 hover:text-white"
      >
        色をリセット
      </button>
    </div>
  );
}
