import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { ThoughtForkData, Message } from '../../shared/types';
import { extractKeywords } from '../../shared/keywordExtractor';

interface Props {
    data: ThoughtForkData | null;
}

export const DashboardView: React.FC<Props> = ({ data }) => {
    const stats = useMemo(() => {
        if (!data) return null;

        const messages = Object.values(data.messages);
        const branches = Object.values(data.branches);

        // Sort messages by time
        const sortedMessages = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Basic Counts
        const totalMessages = messages.length;
        const totalBranches = branches.length;
        const userMessages = messages.filter(m => m.role === 'human').length;
        const aiMessages = messages.filter(m => m.role === 'assistant').length;

        // Depth Calculation
        let maxDepth = 0;
        const depthMap = new Map<string, number>();
        const messageMap = new Map(messages.map(m => [m.id, m]));

        const getDepth = (msgId: string): number => {
            if (depthMap.has(msgId)) return depthMap.get(msgId)!;
            const msg = messageMap.get(msgId);
            if (!msg) return 0;
            if (!msg.parentId) {
                depthMap.set(msgId, 1);
                return 1;
            }
            const depth = 1 + getDepth(msg.parentId);
            depthMap.set(msgId, depth);
            return depth;
        };

        messages.forEach(m => {
            const depth = getDepth(m.id);
            if (depth > maxDepth) maxDepth = depth;
        });

        // Time calculations
        const startTime = sortedMessages.length > 0 ? new Date(sortedMessages[0].timestamp).getTime() : Date.now();
        const endTime = sortedMessages.length > 0 ? new Date(sortedMessages[sortedMessages.length - 1].timestamp).getTime() : Date.now();
        const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

        // Keyword Extraction (Top 10)
        const allContent = messages.map(m => m.content);
        const topKeywords = extractKeywords(allContent, 10);

        // Activity Sparkline Data (Binned by 5 minutes chunks or simple count per 10% of duration)
        // Simplified: Bin into 20 slots
        const binCount = 20;
        const timeSpan = endTime - startTime || 1;
        const bins = new Array(binCount).fill(0);
        sortedMessages.forEach(m => {
            const t = new Date(m.timestamp).getTime();
            const relative = t - startTime;
            const idx = Math.min(Math.floor((relative / timeSpan) * binCount), binCount - 1);
            bins[idx]++;
        });
        const maxBin = Math.max(...bins, 1);
        const sparklineData = bins.map(count => count / maxBin); // Normalize 0-1

        return {
            totalMessages,
            totalBranches,
            userMessages,
            aiMessages,
            maxDepth,
            durationMinutes,
            tokensEstimate: messages.reduce((acc, m) => acc + (m.content.length / 4), 0),
            topKeywords,
            sparklineData,
            lastActive: sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1].timestamp : null
        };
    }, [data]);

    if (!data || !stats) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500 font-mono">
                NO DATA AVAILABLE
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6 text-gray-100 animate-fade-in custom-scrollbar">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span className="text-violet-500 drop-shadow-[0_0_10px_rgba(139,92,246,0.6)]">●</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Analytics
                </span>
            </h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <StatCard
                    label="Total Messages"
                    value={stats.totalMessages}
                    icon="💬"
                    color="violet"
                />
                <StatCard
                    label="Branches"
                    value={stats.totalBranches}
                    icon="⚡"
                    color="cyan"
                />
                <StatCard
                    label="Max Depth"
                    value={stats.maxDepth}
                    icon="⬇️"
                    color="rose"
                />
                <StatCard
                    label="Est. Tokens"
                    value={`~${Math.round(stats.tokensEstimate).toLocaleString()}`}
                    icon="🔢"
                    color="indigo"
                />
            </div>

            {/* Activity Map (Sparkline) */}
            <div className="glass-card p-5 rounded-2xl mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl pointer-events-none text-white">
                    📈
                </div>
                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Activity Flow
                </h3>

                {/* CSS/SVG Sparkline */}
                <div className="h-24 w-full flex items-end gap-1">
                    {stats.sparklineData.map((height, i) => (
                        <div
                            key={i}
                            style={{ height: `${Math.max(height * 100, 5)}%` }}
                            className="flex-1 bg-gradient-to-t from-emerald-500/20 to-emerald-400/80 rounded-t-sm hover:from-emerald-400/40 hover:to-emerald-300 transition-all duration-300"
                            title={`Activity Level: ${Math.round(height * 100)}%`}
                        />
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                    <span>Start</span>
                    <span>{stats.durationMinutes} min</span>
                </div>
            </div>

            {/* Role Distribution Bar */}
            <div className="glass-card p-5 rounded-2xl mb-8">
                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">
                    Engagement Ratio
                </h3>
                <div className="flex items-center gap-4 mb-2">
                    <div className="flex-1 text-right">
                        <div className="text-xl font-bold text-indigo-400">{stats.userMessages}</div>
                        <div className="text-[10px] text-gray-500 uppercase">You</div>
                    </div>
                    <div className="text-gray-600">vs</div>
                    <div className="flex-1">
                        <div className="text-xl font-bold text-violet-400">{stats.aiMessages}</div>
                        <div className="text-[10px] text-gray-500 uppercase">AI</div>
                    </div>
                </div>

                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden flex shadow-inner">
                    <div
                        style={{ width: `${(stats.userMessages / stats.totalMessages) * 100}%` }}
                        className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                    />
                    <div
                        style={{ width: `${(stats.aiMessages / stats.totalMessages) * 100}%` }}
                        className="h-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                    />
                </div>
            </div>

            {/* Top Keywords */}
            <div className="glass-card p-5 rounded-2xl">
                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">
                    Top Trends
                </h3>
                <div className="flex flex-wrap gap-2">
                    {stats.topKeywords.map((keyword, i) => (
                        <span
                            key={i}
                            className={`
                 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/5
                 ${i < 3
                                    ? 'bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 text-white shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                }
               `}
                        >
                            #{keyword}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Helper Subcomponent
const StatCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: string, color: 'violet' | 'cyan' | 'rose' | 'indigo' | 'slate' }) => {
    const styles = {
        violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400 hover:border-violet-500/40',
        cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40',
        rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-400 hover:border-rose-500/40',
        indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-400 hover:border-indigo-500/40',
        slate: 'from-slate-500/10 to-slate-500/5 border-slate-500/20 text-slate-400 hover:border-slate-500/40',
    };

    const bgStyle = styles[color] || styles.slate;

    return (
        <div className={`p-4 rounded-2xl border bg-gradient-to-br ${bgStyle} backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-2xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-md">{icon}</span>
            </div>
            <div className="text-2xl font-bold mb-1 text-white tracking-tight">{value}</div>
            <div className="text-[10px] opacity-60 uppercase tracking-widest font-semibold text-gray-300">{label}</div>
        </div>
    );
}
