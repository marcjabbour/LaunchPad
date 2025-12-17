// App.tsx - Main Application Component

import React, { useState } from 'react';
import { Agent, ViewState } from './types';
import { useAgents } from './hooks';
import { Navigation } from './components/layout';
import { AgentCard, AgentEditor } from './components/features/agents';
import { LiveSessionModal } from './components/features/session';
import { DocumentsView } from './components/features/documents';
import { IntegrationsView } from './components/features/integrations';
import { LandingView } from './views';
import { Plus } from 'lucide-react';

export default function App() {
    const { agents, addAgent, updateAgent, deleteAgent, getAgentById } = useAgents();

    // Navigation state - default to landing (Call-centric view)
    const [view, setView] = useState<ViewState | 'landing'>('landing');
    const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

    // Live Session State
    const [sessionAgents, setSessionAgents] = useState<Agent[] | null>(null);

    const handleSaveAgent = (agent: Agent) => {
        if (editingAgentId) {
            updateAgent(agent);
        } else {
            addAgent(agent);
        }
        setView('dashboard');
        setEditingAgentId(null);
    };

    const handleDeleteAgent = (id: string) => {
        if (confirm('Are you sure you want to remove this agent?')) {
            deleteAgent(id);
        }
    };

    const startEdit = (id: string) => {
        setEditingAgentId(id);
        setView('edit');
    };

    const startCreate = () => {
        setEditingAgentId(null);
        setView('create');
    };

    const handleAddAgentToSession = (agentId: string) => {
        const agentToAdd = getAgentById(agentId);
        if (agentToAdd && sessionAgents) {
            setSessionAgents(prev => prev ? [...prev, agentToAdd] : [agentToAdd]);
        }
    };

    const renderContent = () => {
        if (view === 'landing') {
            return (
                <LandingView
                    agents={agents}
                    onStartCall={(selectedAgents) => setSessionAgents(selectedAgents)}
                />
            );
        }

        if (view === 'dashboard') {
            return (
                <div className="relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {agents.map(agent => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                onEdit={startEdit}
                                onDelete={handleDeleteAgent}
                                onTalk={(a) => setSessionAgents([a])}
                            />
                        ))}

                        {/* Add New Card */}
                        <button
                            onClick={startCreate}
                            className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-primary hover:border-primary hover:bg-slate-800/50 transition-all group"
                        >
                            <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
                                <Plus size={32} />
                            </div>
                            <span className="font-semibold text-lg">Hire New Agent</span>
                            <span className="text-sm mt-1">Configure persona & voice</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (view === 'documents') {
            return <DocumentsView agents={agents} />;
        }

        if (view === 'integrations') {
            return <IntegrationsView />;
        }

        if (view === 'create' || view === 'edit') {
            const initialAgent = editingAgentId
                ? getAgentById(editingAgentId)
                : undefined;

            return (
                <AgentEditor
                    initialAgent={initialAgent}
                    onSave={handleSaveAgent}
                    onCancel={() => {
                        setView('dashboard');
                        setEditingAgentId(null);
                    }}
                />
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-dark flex flex-col font-sans">
            <Navigation
                currentView={view}
                onNavigate={(newView) => setView(newView)}
            />

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderContent()}
            </main>

            {/* Active Live Session Modal */}
            {sessionAgents && (
                <LiveSessionModal
                    activeAgents={sessionAgents}
                    allAgents={agents}
                    onClose={() => setSessionAgents(null)}
                    onAddAgent={handleAddAgentToSession}
                />
            )}
        </div>
    );
}
