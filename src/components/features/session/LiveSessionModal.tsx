// LiveSessionModal component - Refactored to use Agent Runtime

import React, { useEffect, useRef, useState } from 'react';
import { Agent, AgentFile } from '../../../types';
import { useAgentSession } from '../../../hooks';
import { X, Mic, MicOff, FileText, Image as ImageIcon, Monitor, Code, Users, Plus, Paperclip } from 'lucide-react';

interface LiveSessionModalProps {
    activeAgents: Agent[];
    allAgents: Agent[];
    onClose: () => void;
    onAddAgent: (agentId: string) => void;
}

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({ activeAgents, allAgents, onClose, onAddAgent }) => {
    const [showInvitePanel, setShowInvitePanel] = useState(false);

    // Track the previous length of active agents to detect new additions
    const prevAgentsLengthRef = useRef(activeAgents.length);

    // Use the Agent Runtime hook
    const {
        state: status,
        error: errorMsg,
        volumeLevel,
        isMuted,
        setMuted,
        files,
        presentedFile,
        setPresentedFile,
        notifyAgentJoined,
        uploadAndAttachDocument,
        attachedDocuments,
    } = useAgentSession({
        agents: activeAgents,
        onSessionEnd: onClose,
    });

    const [showAttachPanel, setShowAttachPanel] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await uploadAndAttachDocument(file);
            setShowAttachPanel(false);
        }
    };

    // Watch for new agents added to the prop
    useEffect(() => {
        if (activeAgents.length > prevAgentsLengthRef.current) {
            const newAgent = activeAgents[activeAgents.length - 1];
            notifyAgentJoined(newAgent);
        }
        prevAgentsLengthRef.current = activeAgents.length;
    }, [activeAgents, notifyAgentJoined]);

    const renderFileIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon size={24} className="text-purple-400" />;
            case 'code': return <Code size={24} className="text-blue-400" />;
            default: return <FileText size={24} className="text-slate-400" />;
        }
    };

    const activeAgentIds = new Set(activeAgents.map(a => a.id));
    const availableToInvite = allAgents.filter(a => !activeAgentIds.has(a.id));

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl h-[85vh] bg-dark rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col relative">

                {/* Header */}
                <div className="h-16 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-600/10 text-red-500 rounded-full text-xs font-bold uppercase tracking-wider border border-red-600/20">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            Live Meet
                        </div>
                        <span className="text-slate-400">|</span>
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            {activeAgents.length > 1 ? (
                                <>
                                    <Users size={20} />
                                    Team Session ({activeAgents.length})
                                </>
                            ) : (
                                activeAgents[0]?.name || 'Connecting...'
                            )}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Main Stage */}
                <div className="flex-1 flex overflow-hidden relative">

                    {/* Left: Avatar Grid */}
                    <div className={`${presentedFile ? 'w-1/3' : 'w-full'} transition-all duration-500 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 relative border-r border-slate-800`}>

                        {/* Connection Status */}
                        {status !== 'connected' && (
                            <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center">
                                <div className="text-white font-medium">{status === 'connecting' ? 'Connecting...' : errorMsg}</div>
                            </div>
                        )}

                        <div className="flex flex-wrap justify-center items-center gap-8 p-8 w-full">
                            {activeAgents.map((agent) => (
                                <div key={agent.id} className="relative flex flex-col items-center group animate-in zoom-in duration-300">
                                    <div
                                        className="absolute inset-0 rounded-full bg-primary/20 blur-xl transition-all duration-75"
                                        style={{ transform: `scale(${1 + volumeLevel * 0.5})`, opacity: volumeLevel }}
                                    ></div>

                                    <img
                                        src={`https://picsum.photos/id/${agent.avatarId}/300/300`}
                                        alt={agent.name}
                                        className="w-24 h-24 lg:w-32 lg:h-32 rounded-full border-4 border-slate-800 shadow-2xl relative z-10 object-cover"
                                    />
                                    <div className="mt-2 bg-slate-800/80 px-3 py-1 rounded-full text-sm font-medium text-white backdrop-blur-sm border border-slate-700">
                                        {agent.name}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="mt-auto mb-8 flex gap-4">
                            <button
                                onClick={() => setMuted(!isMuted)}
                                className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                            >
                                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowInvitePanel(!showInvitePanel)}
                                    className={`px-6 py-3 rounded-full transition-all text-white hover:bg-slate-700 flex items-center gap-2 font-bold shadow-lg ${showInvitePanel ? 'bg-primary' : 'bg-slate-800'}`}
                                >
                                    <Plus size={20} />
                                    Invite Agent
                                </button>

                                {/* Invite Popover */}
                                {showInvitePanel && (
                                    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-30">
                                        <div className="px-4 py-3 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50">Available to Join</div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {availableToInvite.length === 0 ? (
                                                <div className="p-6 text-sm text-slate-500 text-center italic">All agents are already in the call.</div>
                                            ) : (
                                                availableToInvite.map(agent => (
                                                    <button
                                                        key={agent.id}
                                                        onClick={() => { onAddAgent(agent.id); setShowInvitePanel(false); }}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center gap-3 transition-colors border-b border-slate-700/50 last:border-0"
                                                    >
                                                        <div className="relative">
                                                            <img src={`https://picsum.photos/id/${agent.avatarId}/50`} className="w-8 h-8 rounded-full border border-slate-600" />
                                                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-slate-800"></div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-200">{agent.name}</div>
                                                            <div className="text-xs text-slate-400">{agent.role}</div>
                                                        </div>
                                                        <Plus size={16} className="ml-auto text-slate-500" />
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setShowAttachPanel(!showAttachPanel)}
                                    className={`px-6 py-3 rounded-full transition-all text-white hover:bg-slate-700 flex items-center gap-2 font-bold shadow-lg ${showAttachPanel ? 'bg-primary' : 'bg-slate-800'}`}
                                >
                                    <Paperclip size={20} />
                                    Attach
                                </button>

                                {/* Attach Popover */}
                                {showAttachPanel && (
                                    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-30">
                                        <div className="px-4 py-3 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50">Add Context</div>

                                        <div className="p-2">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-700 rounded-lg flex items-center gap-3 transition-colors text-slate-200"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="font-medium">Upload from Computer</div>
                                            </button>
                                        </div>

                                        {attachedDocuments.length > 0 && (
                                            <>
                                                <div className="px-4 py-2 border-t border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-900/30">Attached</div>
                                                <div className="max-h-40 overflow-y-auto">
                                                    {attachedDocuments.map((doc, i) => (
                                                        <div key={i} className="px-4 py-2 flex items-center gap-2 text-sm text-slate-300 border-b border-slate-700/50 last:border-0">
                                                            <Paperclip size={14} className="text-slate-500" />
                                                            <span className="truncate">{doc.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button onClick={onClose} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium shadow-lg shadow-red-900/20">
                                End Meeting
                            </button>
                        </div>
                    </div>

                    {/* Right: Screen Share / Files */}
                    {presentedFile && (
                        <div className="flex-1 bg-slate-100 flex flex-col animate-in slide-in-from-right duration-500">
                            <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
                                <div className="flex items-center gap-2">
                                    <Monitor size={16} className="text-blue-600" />
                                    <span className="font-semibold text-slate-700 text-sm">Screen Sharing: {presentedFile.name}</span>
                                </div>
                                <button onClick={() => setPresentedFile(null)} className="text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 p-8 overflow-auto flex items-center justify-center bg-slate-50">
                                {presentedFile.type === 'image' ? (
                                    <div className="flex flex-col items-center">
                                        <img
                                            src={`data:image/png;base64,${presentedFile.content}`}
                                            alt="Generated"
                                            className="max-w-full max-h-[60vh] rounded-lg shadow-lg border border-slate-200"
                                        />
                                        <p className="mt-4 text-slate-500 text-sm italic">Generated by {activeAgents.find(a => a.id === presentedFile.agentId)?.name || 'AI'}</p>
                                    </div>
                                ) : (
                                    <pre className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-slate-800 font-mono text-sm w-full h-full overflow-auto whitespace-pre-wrap">
                                        {presentedFile.content}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Bottom Bar: Shared Files */}
                <div className="h-48 bg-slate-900 border-t border-slate-800 flex flex-col shrink-0">
                    <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shared Drive</span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-xs">{files.length} files</span>
                    </div>
                    <div className="flex-1 p-4 overflow-x-auto flex gap-4">
                        {files.length === 0 ? (
                            <div className="w-full flex items-center justify-center text-slate-600 text-sm italic">
                                No files generated in this session yet. Ask the team to create one.
                            </div>
                        ) : (
                            files.map(file => (
                                <div
                                    key={file.id}
                                    onClick={() => setPresentedFile(file)}
                                    className="min-w-[160px] w-[160px] bg-card hover:bg-slate-800 border border-slate-700 hover:border-primary/50 rounded-xl p-4 cursor-pointer transition-all group flex flex-col"
                                >
                                    <div className="flex-1 flex items-center justify-center mb-3">
                                        {renderFileIcon(file.type)}
                                    </div>
                                    <div className="text-sm font-medium text-slate-200 truncate">{file.name}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex justify-between">
                                        <span>{file.type.toUpperCase()}</span>
                                        <span className="group-hover:text-primary transition-colors">Open</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
