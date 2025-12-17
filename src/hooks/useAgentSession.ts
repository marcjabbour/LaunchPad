// useAgentSession - React hook for Agent Runtime integration

import { useState, useEffect, useRef, useCallback } from 'react';
import { Agent, AgentFile } from '../types';
import { AgentSession, SessionState, AttachedDocument } from '../services/agent-runtime';

interface UseAgentSessionConfig {
    agents: Agent[];
    onSessionEnd?: () => void;
}

interface UseAgentSessionReturn {
    // Session state
    state: SessionState;
    error: string | null;

    // Audio state
    volumeLevel: number;
    isMuted: boolean;
    setMuted: (muted: boolean) => void;

    // Files
    files: AgentFile[];
    presentedFile: AgentFile | null;
    setPresentedFile: (file: AgentFile | null) => void;

    // Actions
    notifyAgentJoined: (agent: Agent) => void;
    attachDocument: (doc: AttachedDocument) => void;
    uploadAndAttachDocument: (file: File) => Promise<void>;
    attachedDocuments: AttachedDocument[];
}

/**
 * React hook that wraps AgentSession for easy integration with UI components
 */
export function useAgentSession(config: UseAgentSessionConfig): UseAgentSessionReturn {
    const [state, setState] = useState<SessionState>('connecting');
    const [error, setError] = useState<string | null>(null);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [files, setFiles] = useState<AgentFile[]>([]);
    const [presentedFile, setPresentedFile] = useState<AgentFile | null>(null);
    const [attachedDocuments, setAttachedDocuments] = useState<AttachedDocument[]>([]);

    const sessionRef = useRef<AgentSession | null>(null);
    const hasStartedRef = useRef(false);

    // Initialize session
    useEffect(() => {
        // Prevent double-start from React StrictMode
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const session = new AgentSession({
            agents: config.agents,
            // Note: We subscribe to fileCreated event below, so no need for callback here
            onSessionEnd: config.onSessionEnd,
        });

        sessionRef.current = session;

        // Subscribe to events
        const unsubscribe: (() => void)[] = [];

        unsubscribe.push(
            session.events.on('stateChange', (newState, errorMsg) => {
                setState(newState);
                if (errorMsg) setError(errorMsg);
            })
        );

        unsubscribe.push(
            session.events.on('volumeLevel', (level) => {
                setVolumeLevel(level);
            })
        );

        unsubscribe.push(
            session.events.on('fileCreated', (file) => {
                setFiles(prev => [file, ...prev]);
            })
        );

        unsubscribe.push(
            session.events.on('filePresented', (file) => {
                setPresentedFile(file);
            })
        );

        unsubscribe.push(
            session.events.on('documentAttached', (doc) => {
                setAttachedDocuments(prev => [...prev, doc]);
            })
        );

        unsubscribe.push(
            session.events.on('error', (err) => {
                setError(err.message);
            })
        );

        // Set initial files and documents
        setFiles(session.currentFiles);
        setAttachedDocuments(session.getAttachedDocuments());

        // Connect
        session.connect();

        // Cleanup
        return () => {
            hasStartedRef.current = false;
            unsubscribe.forEach(unsub => unsub());
            session.disconnect();
            sessionRef.current = null;
        };
    }, []); // Empty deps - agents are passed at creation time

    // Mute handler
    const handleSetMuted = useCallback((muted: boolean) => {
        setIsMuted(muted);
        sessionRef.current?.setMuted(muted);
    }, []);

    // Notify agent joined
    const notifyAgentJoined = useCallback((agent: Agent) => {
        sessionRef.current?.notifyAgentJoined(agent);
    }, []);

    // Attach document
    const attachDocument = useCallback((doc: AttachedDocument) => {
        sessionRef.current?.attachDocument(doc);
    }, []);

    // Upload and attach document
    const uploadAndAttachDocument = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const doc: AttachedDocument = {
                name: file.name,
                content: text,
                type: file.type || 'text/plain'
            };
            sessionRef.current?.attachDocument(doc);
        } catch (e) {
            console.error('Failed to read file:', e);
            setError('Failed to read file content');
        }
    }, []);

    return {
        state,
        error,
        volumeLevel,
        isMuted,
        setMuted: handleSetMuted,
        files,
        presentedFile,
        setPresentedFile,
        notifyAgentJoined,
        attachDocument,
        uploadAndAttachDocument,
        attachedDocuments
    };
}
