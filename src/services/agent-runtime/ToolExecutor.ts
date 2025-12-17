// Tool Executor - Plugin-based tool execution system

import { ToolHandler, ToolContext, ToolResult } from './types';
import { AgentFile } from '../../types';
import { createNewFile } from '../storage/fileStorage';
import { generateImage } from '../genai/imageGeneration';

/**
 * ToolExecutor manages tool registration and execution
 * Implements a plugin architecture for easy tool extension
 */
export class ToolExecutor {
    private tools: Map<string, ToolHandler> = new Map();
    private context: ToolContext;

    constructor(context: ToolContext) {
        this.context = context;
    }

    /**
     * Register a tool handler
     */
    registerTool(handler: ToolHandler): void {
        this.tools.set(handler.name, handler);
    }

    /**
     * Update the execution context (e.g., when files change)
     */
    updateContext(updates: Partial<ToolContext>): void {
        this.context = { ...this.context, ...updates };
    }

    /**
     * Get all registered tool declarations for AI configuration
     */
    getToolDeclarations(): object[] {
        return Array.from(this.tools.values()).map(t => t.declaration);
    }

    /**
     * Execute a tool by name
     */
    async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
        const handler = this.tools.get(name);

        if (!handler) {
            return {
                success: false,
                error: `Unknown tool: ${name}`
            };
        }

        try {
            return await handler.execute(args, this.context);
        } catch (error) {
            console.error(`Tool execution error for ${name}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// ============================================================================
// Built-in Tool Handlers
// ============================================================================

import { createFileTool, generateImageTool, presentFileTool } from '../../config/tools';

export const createFileHandler: ToolHandler = {
    name: 'createFile',
    declaration: createFileTool,
    execute: async (args, context): Promise<ToolResult> => {
        const { fileName, content, fileType, agentId } = args as {
            fileName: string;
            content: string;
            fileType: 'pdf' | 'doc' | 'image' | 'sheet' | 'code';
            agentId: string;
        };

        const creatorId = agentId || context.agents[0]?.id;
        const agentName = context.getAgentName(creatorId);
        const newFile = createNewFile(creatorId, fileName, fileType, content, agentName);

        return {
            success: true,
            data: { file: newFile, message: `File '${fileName}' created successfully.` }
        };
    }
};

export const generateImageHandler: ToolHandler = {
    name: 'generateImage',
    declaration: generateImageTool,
    execute: async (args, context): Promise<ToolResult> => {
        const { prompt, fileName, agentId } = args as {
            prompt: string;
            fileName: string;
            agentId: string;
        };

        const creatorId = agentId || context.agents[0]?.id;
        const agentName = context.getAgentName(creatorId);

        const base64Image = await generateImage(prompt);

        if (!base64Image) {
            return {
                success: false,
                error: 'Failed to generate image.'
            };
        }

        const newFile = createNewFile(creatorId, fileName, 'image', base64Image, agentName);

        return {
            success: true,
            data: { file: newFile, present: true, message: `Image '${fileName}' generated and displayed.` }
        };
    }
};

export const presentFileHandler: ToolHandler = {
    name: 'presentFile',
    declaration: presentFileTool,
    execute: async (args, context): Promise<ToolResult> => {
        const { fileName } = args as { fileName: string };
        const file = context.files.find(f => f.name === fileName);

        if (!file) {
            return {
                success: false,
                error: `File '${fileName}' not found.`
            };
        }

        return {
            success: true,
            data: { file, present: true, message: `Presenting file '${fileName}' on screen.` }
        };
    }
};

/**
 * Create a ToolExecutor with all built-in tools registered
 */
export function createToolExecutor(context: ToolContext): ToolExecutor {
    const executor = new ToolExecutor(context);
    executor.registerTool(createFileHandler);
    executor.registerTool(generateImageHandler);
    executor.registerTool(presentFileHandler);
    return executor;
}
