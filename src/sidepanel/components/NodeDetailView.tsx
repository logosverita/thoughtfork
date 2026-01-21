import React from 'react';
import { Message } from '../../shared/types';
import { formatDate } from '../../shared/utils';

interface Props {
    message: Message | null;
    onClose: () => void;
    onJump?: (message: Message) => void;
    onFork?: (messageId: string) => void;
}

export function NodeDetailView({ message, onClose, onJump, onFork }: Props) {
    if (!message) return null;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(message.content);
        // TODO: Toast notification
    };

    return (
        <div className="absolute top-4 right-4 w-96 animate-slide-up z-20">
            <div className="glass-card rounded-xl overflow-hidden shadow-2xl border border-gray-700/50">
                {/* Header */}
                <div className="p-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-800/40">
                    <div className="flex items-center gap-3">
                        <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${message.role === 'human' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}
                        >
                            {message.role === 'human' ? 'You' : 'Claude'}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(message.timestamp)}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <div className="prose prose-invert prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
                            {message.content}
                        </pre>
                    </div>
                </div>

                <div className="p-3 border-t border-gray-700/50 bg-gray-800/40 flex justify-end gap-2">
                    <button
                        onClick={() => onFork?.(message.id)}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors flex items-center gap-2 border border-rose-500/30"
                    >
                        Fork Branch
                    </button>
                    <button
                        onClick={() => onJump?.(message)}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-colors flex items-center gap-2 border border-indigo-500/30"
                    >
                        Jump to Message
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 transition-colors flex items-center gap-2 border border-white/5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                        </svg>
                        Copy
                    </button>
                </div>
            </div>
        </div>
    );
}
