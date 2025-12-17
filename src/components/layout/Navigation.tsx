// Navigation component

import React from 'react';
import { ViewState } from '../../types';
import { Users, Phone, FileText, Plug, Settings, Rocket } from 'lucide-react';

interface NavigationProps {
    currentView: ViewState | 'landing';
    onNavigate: (view: ViewState | 'landing') => void;
}

interface NavItem {
    id: ViewState | 'landing';
    label: string;
    icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
    { id: 'landing', label: 'Call', icon: <Phone size={16} /> },
    { id: 'dashboard', label: 'Agents', icon: <Users size={16} /> },
    { id: 'documents', label: 'Files', icon: <FileText size={16} /> },
    { id: 'integrations', label: 'Integrations', icon: <Plug size={16} /> },
];

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
    return (
        <nav className="bg-card border-b border-slate-700 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative h-16 flex items-center justify-between">

                {/* Logo (Left) */}
                <div
                    className="flex items-center gap-3 w-48 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onNavigate('landing')}
                >
                    <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-lg shadow-lg shadow-primary/20">
                        <Rocket className="text-white" size={20} />
                    </div>
                    <h1 className="text-lg font-bold text-white tracking-tight hidden sm:block">LaunchPad</h1>
                </div>

                {/* Centered Links */}
                <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center bg-slate-800/50 rounded-full p-1 border border-slate-700/50 backdrop-blur-sm">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${currentView === item.id
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Right Side (Settings/Profile) */}
                <div className="w-48 flex justify-end">
                    <button className="p-2 text-slate-400 hover:text-white transition-colors">
                        <Settings size={20} />
                    </button>
                </div>
            </div>
        </nav>
    );
};
