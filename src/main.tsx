// main.tsx - Application Entry Point

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Note: StrictMode removed to prevent double-mounting which breaks
// live audio sessions and WebSocket connections in development
root.render(<App />);
