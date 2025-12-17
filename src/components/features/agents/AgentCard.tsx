// AgentCard component

import React from 'react';
import { Agent } from '../../../types';
import { Mic, Trash2, Video, FileText, Brain, Settings } from 'lucide-react';

interface AgentCardProps {
    agent: Agent;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onTalk: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit, onDelete, onTalk }) => {
    return (
        <div
            className="h-full flex flex-col relative bg-card border border-slate-700 rounded-xl p-5 transition-all shadow-lg group overflow-hidden hover:border-primary/50"
        >

            {/* Top Right Edit Button */}
            <button
                onClick={() => onEdit(agent.id)}
                className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-slate-800/50 hover:bg-primary hover:text-white text-slate-400 border border-slate-700 hover:border-primary transition-all"
                title="Edit Agent Configuration"
            >
                <Settings size={16} />
            </button>

            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-primary/10 transition-all pointer-events-none"></div>

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <img
                        src={`https://picsum.photos/id/${agent.avatarId}/200/200`}
                        alt={agent.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 shadow-md"
                    />
                    <div>
                        <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                        <p className="text-primary text-sm font-medium">{agent.role}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3 mb-6 relative z-10 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-slate-400 text-sm">
                    <span className="bg-slate-800 px-2 py-1 rounded text-xs border border-slate-700">{agent.voice}</span>
                    <span className="bg-slate-800 px-2 py-1 rounded text-xs border border-slate-700">{agent.personality.tone}</span>
                    {agent.memory?.enabled && (
                        <span className="bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded text-xs border border-indigo-800/50 flex items-center gap-1">
                            <Brain size={10} />
                            Memory On
                        </span>
                    )}
                </div>
                <p className="text-slate-300 text-sm line-clamp-2 min-h-[2.5rem]">{agent.description}</p>

                {/* Knowledge Base Section - Fixed Height & Scrollable */}
                <div className="h-8 w-full mt-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {agent.knowledgeBase ? (
                        <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                            <FileText size={12} />
                            {agent.knowledgeBase}
                        </div>
                    ) : (
                        <div className="h-full w-full"></div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 mt-auto relative z-10">
                <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => onDelete(agent.id)}
                        className="text-slate-400 hover:text-red-400 p-2 hover:bg-slate-700 rounded-md transition-colors"
                        title="Delete Agent"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="flex-1 flex gap-2">
                    <button
                        onClick={() => onTalk(agent)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all"
                    >
                        <Mic size={16} />
                        Interview
                    </button>
                    <button
                        className="bg-primary hover:bg-secondary text-white py-2 px-3 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-primary/20"
                        onClick={() => onTalk(agent)}
                        title="Quick Call"
                    >
                        <Video size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
