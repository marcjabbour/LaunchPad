// File storage service

import { AgentFile, FileVersion } from '../../types';
import { STORAGE_KEYS } from '../../config/constants';

/**
 * Get all files from localStorage
 */
export function getAllFiles(): AgentFile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FILES);
    if (!raw) return [];
    const files: AgentFile[] = JSON.parse(raw);
    return files.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get files for a specific agent
 */
export function getAgentFiles(agentId: string): AgentFile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FILES);
    if (!raw) return [];
    const files: AgentFile[] = JSON.parse(raw);
    return files.filter(f => f.agentId === agentId).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Save a single file (upsert operation)
 */
export function saveAgentFile(file: AgentFile): void {
    const raw = localStorage.getItem(STORAGE_KEYS.FILES);
    let files: AgentFile[] = raw ? JSON.parse(raw) : [];

    const index = files.findIndex(f => f.id === file.id);
    if (index >= 0) {
        files[index] = file;
    } else {
        files.push(file);
    }

    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
}

/**
 * Create a new file
 */
export function createNewFile(
    agentId: string,
    name: string,
    type: AgentFile['type'],
    content: string,
    authorName: string = 'AI Agent'
): AgentFile {
    const initialVersion: FileVersion = {
        content,
        timestamp: Date.now(),
        author: authorName
    };

    const file: AgentFile = {
        id: crypto.randomUUID(),
        name,
        type,
        content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        agentId,
        versions: [initialVersion]
    };

    saveAgentFile(file);
    return file;
}

/**
 * Update file content, creating a new version
 */
export function updateFileContent(fileId: string, newContent: string, editorName: string): void {
    const raw = localStorage.getItem(STORAGE_KEYS.FILES);
    if (!raw) return;
    const files: AgentFile[] = JSON.parse(raw);

    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const newVersion: FileVersion = {
        content: newContent,
        timestamp: Date.now(),
        author: editorName
    };

    file.content = newContent;
    file.updatedAt = Date.now();
    if (!file.versions) file.versions = [];
    file.versions.push(newVersion);

    saveAgentFile(file);
}

/**
 * Revert file to a previous version
 */
export function revertFileVersion(fileId: string, versionIndex: number): void {
    const raw = localStorage.getItem(STORAGE_KEYS.FILES);
    if (!raw) return;
    const files: AgentFile[] = JSON.parse(raw);

    const file = files.find(f => f.id === fileId);
    if (!file || !file.versions || !file.versions[versionIndex]) return;

    const versionToRestore = file.versions[versionIndex];

    // Create a NEW version that is a copy of the old one, to preserve linear history
    const restoreEntry: FileVersion = {
        content: versionToRestore.content,
        timestamp: Date.now(),
        author: 'System Restore'
    };

    file.content = versionToRestore.content;
    file.updatedAt = Date.now();
    file.versions.push(restoreEntry);

    saveAgentFile(file);
}

/**
 * Delete a file by ID
 */
export function deleteFile(fileId: string): void {
    const raw = localStorage.getItem(STORAGE_KEYS.FILES);
    if (!raw) return;
    let files: AgentFile[] = JSON.parse(raw);
    files = files.filter(f => f.id !== fileId);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
}
