// IntegrationsView component

import React from 'react';
import { Video, Cast, MonitorSmartphone, Globe, Search } from 'lucide-react';

interface IntegrationPlatform {
    name: string;
    icon: React.ReactNode;
    color: string;
    status: string;
}

const PLATFORMS: IntegrationPlatform[] = [
    { name: 'Google Meet', icon: <Video size={32} />, color: 'text-blue-400', status: 'Coming Soon' },
    { name: 'Zoom', icon: <Video size={32} />, color: 'text-blue-500', status: 'Coming Soon' },
    { name: 'Microsoft Teams', icon: <MonitorSmartphone size={32} />, color: 'text-purple-400', status: 'Coming Soon' },
    { name: 'Slack Huddles', icon: <Cast size={32} />, color: 'text-red-400', status: 'Planned' }
];

export const IntegrationsView: React.FC = () => {
    return (
        <div className="max-w-5xl mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white">Integrations</h2>
                    <p className="text-slate-400 mt-1">Connect your AI workforce to external meeting platforms.</p>
                </div>
                <div className="relative w-64 opacity-50 cursor-not-allowed">
                    <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search integrations..."
                        disabled
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-primary outline-none cursor-not-allowed"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Info Card */}
                <div className="md:col-span-2 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-8 flex items-start gap-6">
                    <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400">
                        <Globe size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Deploy your agents anywhere</h3>
                        <p className="text-slate-300 leading-relaxed">
                            LaunchPad is designed to let your AI agents join real-world meetings.
                            By connecting your accounts below, you will soon be able to dispatch "Alex" or "Sarah"
                            directly into a Google Meet, Zoom, or Microsoft Teams call via a simple calendar invite
                            or meeting link.
                        </p>
                    </div>
                </div>

                {/* Integration Cards */}
                {PLATFORMS.map((platform, idx) => (
                    <div key={idx} className="bg-card border border-slate-700 rounded-xl p-6 flex items-center justify-between group hover:border-slate-600 transition-all opacity-75 hover:opacity-100">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 bg-slate-800 rounded-lg ${platform.color}`}>
                                {platform.icon}
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg">{platform.name}</h4>
                                <span className="text-xs text-slate-500">Video Conferencing</span>
                            </div>
                        </div>
                        <button disabled className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm font-medium border border-slate-700 cursor-not-allowed">
                            {platform.status}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
