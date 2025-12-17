// GenAI tool definitions for live sessions

import { FunctionDeclaration, Type } from '@google/genai';

export const createFileTool: FunctionDeclaration = {
    name: 'createFile',
    description: 'Creates a new TEXT based file (doc, code, sheet) in the shared workspace.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            fileName: { type: Type.STRING, description: 'Name of the file (e.g., prd.txt)' },
            content: { type: Type.STRING, description: 'The text content of the file.' },
            fileType: { type: Type.STRING, description: 'The type of file. Must be one of: doc, code, sheet' },
            agentId: { type: Type.STRING, description: 'The ID of the agent creating the file.' }
        },
        required: ['fileName', 'content', 'fileType', 'agentId']
    }
};

export const generateImageTool: FunctionDeclaration = {
    name: 'generateImage',
    description: 'Generates an image using an AI model (Nano Banana) and saves it to the workspace. Use this when the user asks for a visual, diagram, or drawing.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            prompt: { type: Type.STRING, description: 'The prompt to generate the image.' },
            fileName: { type: Type.STRING, description: 'The name of the image file (e.g., diagram.png).' },
            agentId: { type: Type.STRING, description: 'The ID of the agent generating the image.' }
        },
        required: ['prompt', 'fileName', 'agentId']
    }
};

export const presentFileTool: FunctionDeclaration = {
    name: 'presentFile',
    description: 'Shares your screen to show a specific file to the user.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            fileName: { type: Type.STRING, description: 'The name of the existing file to show' }
        },
        required: ['fileName']
    }
};

// All available tools for live sessions
export const SESSION_TOOLS: FunctionDeclaration[] = [
    createFileTool,
    generateImageTool,
    presentFileTool,
];
