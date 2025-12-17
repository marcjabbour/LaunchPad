// LandingView component

import React, { useState } from 'react';
import { Agent } from '../types';
import { Phone, Users, Check, Sparkles } from 'lucide-react';

interface LandingViewProps {
    agents: Agent[];
    onStartCall: (agents: Agent[]) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ agents, onStartCall }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleStartCall = () => {
        const selected = agents.filter(a => selectedIds.has(a.id));
        if (selected.length > 0) {
            onStartCall(selected);
        }
    };

    const selectedAgents = agents.filter(a => selectedIds.has(a.id));

    return (
        <div className="max-w-7xl mx-auto flex flex-col items-center py-12 px-4">

            {/* Header */}
            <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="inline-flex items-center justify-center p-3 bg-slate-800/50 rounded-2xl mb-4 ring-1 ring-white/10 shadow-xl">
                    <Users className="text-primary mr-2" size={24} />
                    <span className="text-slate-200 font-semibold tracking-wide">Team Lobby</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                    Assemble Your Team
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Select the AI agents you want to bring into the meeting room.
                </p>
            </div>

            {/* Main Action Stage (Centered) */}
            <div className="w-full max-w-2xl mb-16 relative z-10">
                <div className={`
            relative bg-gradient-to-b from-slate-800 to-slate-900 
            rounded-3xl border border-slate-700 p-8 text-center shadow-2xl transition-all duration-300
            ${selectedIds.size > 0 ? 'ring-2 ring-primary/50 scale-105' : 'opacity-90'}
        `}>

                    {/* Selected Avatars */}
                    <div className="h-24 flex items-center justify-center mb-6">
                        {selectedAgents.length === 0 ? (
                            <div className="text-slate-500 flex flex-col items-center animate-pulse">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center mb-2">
                                    <Users size={24} />
                                </div>
                                <span className="text-sm">No agents selected</span>
                            </div>
                        ) : (
                            <div className="flex -space-x-4">
                                {selectedAgents.map((agent, i) => (
                                    <div key={agent.id} className="relative group" style={{ zIndex: 10 - i }}>
                                        <img
                                            src={`https://picsum.photos/id/${agent.avatarId}/150`}
                                            className="w-20 h-20 rounded-full border-4 border-slate-800 shadow-lg object-cover"
                                            alt={agent.name}
                                        />
                                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                                            {agent.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleStartCall}
                        disabled={selectedIds.size === 0}
                        className={`
                    w-full sm:w-auto min-w-[240px] py-4 px-8 rounded-xl font-bold text-lg flex items-center justify-center gap-3 mx-auto transition-all
                    ${selectedIds.size > 0
                                ? 'bg-primary hover:bg-secondary text-white shadow-lg shadow-primary/25 transform hover:-translate-y-1'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            }
                `}
                    >
                        <Phone size={22} className={selectedIds.size > 0 ? 'animate-bounce' : ''} />
                        {selectedIds.size > 0 ? `Start Meeting (${selectedIds.size})` : 'Select Agents Below'}
                    </button>
                </div>

                {/* Glow Effect behind stage */}
                {selectedIds.size > 0 && (
                    <div className="absolute -inset-4 bg-primary/20 blur-3xl -z-10 rounded-full opacity-50 transition-opacity duration-1000"></div>
                )}
            </div>

            {/* Roster Container */}
            <div className="w-full max-w-7xl">
                <div className="flex items-center gap-4 mb-8 justify-center">
                    <div className="h-[1px] w-24 bg-slate-800"></div>
                    <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Available Roster</span>
                    <div className="h-[1px] w-24 bg-slate-800"></div>
                </div>

                {/* Centered Flex Layout for Agents */}
                <div className="flex flex-wrap justify-center gap-6">
                    {agents.map(agent => {
                        const isSelected = selectedIds.has(agent.id);
                        return (
                            <div
                                key={agent.id}
                                onClick={() => toggleSelection(agent.id)}
                                className={`
                            relative group cursor-pointer rounded-xl border p-5 transition-all duration-200
                            w-full sm:w-64 flex flex-col items-center
                            ${isSelected
                                        ? 'bg-slate-800 border-primary shadow-lg shadow-primary/10 transform -translate-y-1'
                                        : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-600'
                                    }
                        `}
                            >
                                {/* Selection Checkbox */}
                                <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-slate-600 bg-slate-900'}`}>
                                    {isSelected && <Check size={14} className="text-white" />}
                                </div>

                                <div className="relative mb-4">
                                    <img
                                        src={`https://picsum.photos/id/${agent.avatarId}/150`}
                                        alt={agent.name}
                                        className={`w-24 h-24 rounded-full object-cover border-4 transition-colors ${isSelected ? 'border-primary' : 'border-slate-700 group-hover:border-slate-500'}`}
                                    />
                                    {isSelected && (
                                        <div className="absolute bottom-0 right-0 bg-primary p-1.5 rounded-full border-2 border-slate-800 shadow-sm">
                                            <Sparkles size={12} className="text-white" />
                                        </div>
                                    )}
                                </div>

                                <h3 className={`font-bold text-lg mb-1 ${isSelected ? 'text-white' : 'text-slate-200'}`}>{agent.name}</h3>
                                <p className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded mb-3">{agent.role}</p>

                                <div className="w-full border-t border-slate-800 pt-3 flex justify-between items-center text-xs text-slate-500 w-full px-2">
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                        {agent.voice}
                                    </span>
                                    <span>{agent.personality.tone}</span>
                                </div>
                            </div>
                        );
                    })}
                    {agents.length === 0 && (
                        <div className="w-full py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                            <p className="text-slate-500">No agents configured yet.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
