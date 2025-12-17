// Lightweight typed event emitter for decoupled communication

type EventCallback<T = unknown> = (data: T) => void;

export class EventEmitter<TEvents extends Record<string, EventCallback>> {
    private listeners: Map<keyof TEvents, Set<EventCallback>> = new Map();

    /**
     * Subscribe to an event
     */
    on<K extends keyof TEvents>(event: K, callback: TEvents[K]): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback as EventCallback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     */
    off<K extends keyof TEvents>(event: K, callback: TEvents[K]): void {
        this.listeners.get(event)?.delete(callback as EventCallback);
    }

    /**
     * Emit an event to all subscribers
     */
    emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): void {
        this.listeners.get(event)?.forEach(callback => {
            try {
                (callback as (...args: unknown[]) => void)(...args);
            } catch (error) {
                console.error(`Error in event handler for ${String(event)}:`, error);
            }
        });
    }

    /**
     * Remove all listeners for an event (or all events if no event specified)
     */
    removeAllListeners(event?: keyof TEvents): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}
