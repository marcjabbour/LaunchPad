// Base64 conversion utilities

/**
 * Convert a Base64 string to a Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Convert an ArrayBuffer to a Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Safely encode a string to Base64, handling Unicode characters
 */
export function safeBtoa(str: string): string {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        console.warn("Failed to encode string to Base64", e);
        return btoa("encoding_error");
    }
}
