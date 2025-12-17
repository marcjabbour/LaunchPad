// AgentEditor component

import React, { useState } from 'react';
import { Agent, PersonalityConfig, VoiceName, MemoryConfig } from '../../../../types';
import { VOICE_OPTIONS } from '../../../../config/agents';
import { clearAgentMemory } from '../../../../services/storage/memoryStorage';
import { enhanceAgentDescription } from '../../../../services/genai/textGeneration';
import { generateVoicePreview, playAudioBuffer } from '../../../../services/genai/tts';
import { Save, X, Mic, Upload, User, Briefcase, Sparkles, Brain, Trash2, Loader2, Zap, Play, Square } from 'lucide-react';

interface AgentEditorProps {
    initialAgent?: Agent;
    onSave: (agent: Agent) => void;
    onCancel: () => void;
}

const DEFAULT_PERSONALITY: PersonalityConfig = {
    tone: 'Professional',
    verbosity: 'Concise',
    style: 'Direct'
};

const DEFAULT_MEMORY: MemoryConfig = {
    enabled: true,
    historyLimit: 10
};

export const AgentEditor: React.FC<AgentEditorProps> = ({ initialAgent, onSave, onCancel }) => {
    const [name, setName] = useState(initialAgent?.name || '');
    const [role, setRole] = useState(initialAgent?.role || '');
    const [description, setDescription] = useState(initialAgent?.description || '');
    const [voice, setVoice] = useState<VoiceName>(initialAgent?.voice || 'Puck');
    const [speechSpeed, setSpeechSpeed] = useState<Agent['speechSpeed']>(initialAgent?.speechSpeed || 'Normal');
    const [personality, setPersonality] = useState<PersonalityConfig>(initialAgent?.personality || DEFAULT_PERSONALITY);
    const [memory, setMemory] = useState<MemoryConfig>(initialAgent?.memory || DEFAULT_MEMORY);
    const [knowledgeBase, setKnowledgeBase] = useState(initialAgent?.knowledgeBase || '');

    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const agent: Agent = {
            id: initialAgent?.id || crypto.randomUUID(),
            name,
            role,
            description,
            voice,
            speechSpeed,
            personality,
            memory,
            knowledgeBase: knowledgeBase || undefined,
            avatarId: initialAgent?.avatarId || Math.floor(Math.random() * 1000),
        };
        onSave(agent);
    };

    const handleEnhanceDescription = async () => {
        if (!description) return;
        setIsEnhancing(true);

        try {
            const enhanced = await enhanceAgentDescription(description, personality);
            if (enhanced) {
                setDescription(enhanced);
            } else {
                alert("Failed to enhance description. Check API key.");
            }
        } catch (error) {
            console.error("Failed to enhance:", error);
            alert("Failed to enhance description. Check API key.");
        } finally {
            setIsEnhancing(false);
        }
    };

    const handlePreviewVoice = async (voiceName: string) => {
        if (isPlayingPreview) return;

        setIsPlayingPreview(voiceName);

        try {
            const audioBuffer = await generateVoicePreview(voiceName, name || 'your agent');

            if (audioBuffer) {
                const { context } = playAudioBuffer(audioBuffer, () => {
                    setIsPlayingPreview(null);
                    context.close();
                });
            } else {
                setIsPlayingPreview(null);
            }
        } catch (e) {
            console.error("TTS Error", e);
            setIsPlayingPreview(null);
        }
    };

    const handleClearMemory = () => {
        if (initialAgent && confirm("Are you sure? This will wipe all conversation history for this agent.")) {
            clearAgentMemory(initialAgent.id);
            alert("Memory cleared.");
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white">{initialAgent ? 'Edit Agent' : 'Create New Agent'}</h2>
                    <p className="text-slate-400 mt-1">Configure your AI employee's identity and behavior.</p>
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-white">
                    <X size={32} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column (Identity & Behavior) */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Identity Section */}
                    <div className="bg-card p-6 rounded-xl border border-slate-700 space-y-6">
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                            <User size={20} className="text-primary" />
                            Identity
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="e.g. Alex"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Role / Title</label>
                                    <input
                                        type="text"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="e.g. Senior Product Manager"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Knowledge Base (Optional)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={knowledgeBase}
                                            readOnly
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white pl-10 cursor-not-allowed"
                                            placeholder="No file selected"
                                        />
                                        <Briefcase className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                    </div>
                                    <label className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-lg flex items-center cursor-pointer transition-colors">
                                        <Upload size={18} />
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    setKnowledgeBase(e.target.files[0].name);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Upload a PDF or TXT file to give this agent context about your specific projects.</p>
                            </div>
                        </div>
                    </div>

                    {/* System Instruction */}
                    <div className="bg-card p-6 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-white">Core Instructions</h3>
                            <button
                                type="button"
                                onClick={handleEnhanceDescription}
                                disabled={isEnhancing}
                                className="text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all"
                            >
                                {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                Enhance with Gemini
                            </button>
                        </div>
                        <div className="relative">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-h-[180px] text-base leading-relaxed"
                                placeholder="You are a Product Manager specializing in..."
                                required
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Describe the agent's expertise, constraints, and operational guidelines.
                        </p>
                    </div>
                </div>

                {/* Right Column (Config) */}
                <div className="lg:col-span-5 space-y-6">

                    {/* Memory Section */}
                    <div className="bg-card p-6 rounded-xl border border-slate-700 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Brain size={20} className="text-primary" />
                                Memory
                            </h3>
                            {initialAgent && (
                                <button type="button" onClick={handleClearMemory} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                    <Trash2 size={12} /> Reset
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-600">
                            <span className="text-sm font-medium text-slate-300">Enable Recall</span>
                            <button
                                type="button"
                                onClick={() => setMemory({ ...memory, enabled: !memory.enabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${memory.enabled ? 'bg-primary' : 'bg-slate-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${memory.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {memory.enabled && (
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-300">Context Window</span>
                                    <span className="text-primary font-mono">{memory.historyLimit} sessions</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={memory.historyLimit}
                                    onChange={(e) => setMemory({ ...memory, historyLimit: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Controls how many previous conversations the agent can access.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Voice & Personality */}
                    <div className="bg-card p-6 rounded-xl border border-slate-700 space-y-6">
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Mic size={20} className="text-primary" />
                            Voice & Personality
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Voice Model</label>
                            <div className="grid grid-cols-1 gap-2">
                                {VOICE_OPTIONS.map((v) => (
                                    <div
                                        key={v.name}
                                        className={`flex items-center rounded-lg border transition-all ${voice === v.name
                                            ? 'bg-primary/20 border-primary'
                                            : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                                            }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setVoice(v.name)}
                                            className={`flex-1 px-3 py-2.5 text-left flex items-center justify-between outline-none ${voice === v.name ? 'text-white' : 'text-slate-300'}`}
                                        >
                                            <span className="font-medium">{v.name}</span>
                                            <span className="text-xs opacity-70">{v.description}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.name); }}
                                            disabled={isPlayingPreview !== null}
                                            className={`p-2 mr-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white ${isPlayingPreview === v.name ? 'text-primary animate-pulse' : ''}`}
                                            title="Preview Voice"
                                        >
                                            {isPlayingPreview === v.name ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Speech Speed */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Zap size={14} className="text-yellow-400" />
                                Speech Speed
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {(['Slow', 'Normal', 'Fast', 'Hyper'] as const).map((speed) => (
                                    <button
                                        key={speed}
                                        type="button"
                                        onClick={() => setSpeechSpeed(speed)}
                                        className={`py-2 text-xs font-medium rounded-lg border transition-colors ${speechSpeed === speed
                                            ? 'bg-primary border-primary text-white'
                                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        {speed}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Determines the pacing and energy of the agent's speech.</p>
                        </div>

                        <div className="space-y-4 pt-2 border-t border-slate-700">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tone</label>
                                <select
                                    value={personality.tone}
                                    onChange={(e) => setPersonality({ ...personality, tone: e.target.value as PersonalityConfig['tone'] })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                                >
                                    <option>Professional</option>
                                    <option>Casual</option>
                                    <option>Friendly</option>
                                    <option>Strict</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Verbosity</label>
                                <select
                                    value={personality.verbosity}
                                    onChange={(e) => setPersonality({ ...personality, verbosity: e.target.value as PersonalityConfig['verbosity'] })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                                >
                                    <option>Concise</option>
                                    <option>Detailed</option>
                                    <option>Conversational</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            type="submit"
                            className="w-full py-4 rounded-xl bg-primary hover:bg-secondary text-white font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            Save Agent Configuration
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full py-3 rounded-xl text-slate-400 font-medium hover:bg-slate-800 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>

                </div>
            </form>
        </div>
    );
};
