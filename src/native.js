/**
 * Native platform APIs — pickImage, pickFile, openCamera, launchIntent, shareText, showToast.
 * Exact same logic from the original bridge.js, extracted into its own module.
 */

import { detectPlatform, getNextCallbackId } from './bridge.js';

// Shared callback registry (same instance as bridge.js uses via window.__resolveCallback)
const pendingCallbacks = new Map();

// Hook into the global callback resolver
const originalResolver = window.__resolveCallback;
window.__resolveCallback = (callbackId, resultJson) => {
  // Check our local pending callbacks first
  const resolver = pendingCallbacks.get(callbackId);
  if (resolver) {
    try {
      const result = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
      resolver.resolve(result);
    } catch (e) {
      resolver.reject(new Error(`Failed to parse callback result: ${e.message}`));
    }
    pendingCallbacks.delete(callbackId);
  }
  // Also call original resolver (for bridge.js call() callbacks)
  if (originalResolver) {
    originalResolver(callbackId, resultJson);
  }
};

/**
 * Utility: Get system environment from native host.
 * This is the scalable way to get paths/info without changing Java/Kotlin code.
 */
export async function getSystemEnv() {
  const platform = detectPlatform();
  if (platform === 'android') {
    const envJson = window.NativeBridge.getSystemEnv();
    return JSON.parse(envJson);
  }
  // Fallback for desktop/dev
  return {
    platform: platform,
    filesDir: './local_storage',
    isMock: true
  };
}

/**
 * Utility: Request an Android permission dynamically.
 */
export function requestPermission(permission) {
  const platform = detectPlatform();
  if (platform !== 'android') {
    return Promise.resolve({ success: true, granted: true, mock: true });
  }

  return new Promise((resolve, reject) => {
    const callbackId = getNextCallbackId();
    pendingCallbacks.set(callbackId, { resolve, reject });
    window.NativeBridge.requestPermission(permission, callbackId);
  });
}

/**
 * Utility: Pick an image from the native gallery (Universal).
 */
export async function pickImage() {
  const platform = detectPlatform();
  if (platform === 'android') {
    return new Promise((resolve, reject) => {
      const callbackId = getNextCallbackId();
      pendingCallbacks.set(callbackId, { resolve, reject });
      window.NativeBridge.pickImage(callbackId);
    });
  } else if (platform === 'desktop') {
    const jsonResult = await window.pywebview.api.pickFile("Select Image", ["Image Files (*.jpg;*.jpeg;*.png)", "All files (*.*)"]);
    return JSON.parse(jsonResult);
  } else if (platform === 'web' || platform === 'dev') {
    // 🌐 WEB DRIVER: Use standard HTML5 file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({ success: true, uri: event.target.result, isWeb: true });
          };
          reader.readAsDataURL(file);
        } else {
          resolve({ success: false, error: 'No file selected' });
        }
      };
      input.click();
    });
  }
  return Promise.reject(new Error('Image picking not supported on this platform'));
}

/**
 * Utility: Pick ANY file from the system (Universal).
 */
export async function pickFile() {
  const platform = detectPlatform();
  if (platform === 'android') {
    return launchIntent('android.intent.action.GET_CONTENT', '*/*');
  } else if (platform === 'desktop') {
    const jsonResult = await window.pywebview.api.pickFile("Select File", ["All files (*.*)"]);
    return JSON.parse(jsonResult);
  } else if (platform === 'web' || platform === 'dev') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) resolve({ success: true, uri: URL.createObjectURL(file), name: file.name });
        else resolve({ success: false, error: 'Cancelled' });
      };
      input.click();
    });
  }
  return Promise.reject(new Error('File picking not supported on this platform'));
}

/**
 * Utility: Open the Native Camera (Universal).
 */
export async function openCamera() {
  const platform = detectPlatform();
  
  if (platform === 'android') {
    return launchIntent('android.media.action.IMAGE_CAPTURE');
  } else {
    // 🌐 WEB/DESKTOP DRIVER: Use standard MediaDevices
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // We stop it immediately just to verify access, or you can route this to a UI
      stream.getTracks().forEach(track => track.stop());
      return { success: true, mode: 'stream_verified' };
    } catch (err) {
      // Fallback: Trigger file input with camera preference
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) resolve({ success: true, uri: URL.createObjectURL(file) });
          else resolve({ success: false, error: 'Cancelled' });
        };
        input.click();
      });
    }
  }
}

/**
 * Utility: Launch ANY Android Intent (God Mode).
 */
export function launchIntent(action, type = null) {
  const platform = detectPlatform();
  if (platform !== 'android') {
    return Promise.reject(new Error('Intents only available on Android'));
  }

  return new Promise((resolve, reject) => {
    const callbackId = getNextCallbackId();
    pendingCallbacks.set(callbackId, { resolve, reject });
    window.NativeBridge.launchIntent(action, type, callbackId);
  });
}

/**
 * Utility: Share text to other apps.
 */
export function shareText(text) {
  if (detectPlatform() === 'android') {
    window.NativeBridge.shareText(text);
  } else {
    console.log('[Mock Share]:', text);
  }
}

/**
 * Utility: Show a native toast message.
 */
export function showToast(message) {
  if (detectPlatform() === 'android') {
    window.NativeBridge.showToast(message);
  } else {
    alert(message);
  }
}

/**
 * Utility: Convert a native URI to Base64 (Universal).
 */
export async function getBase64FromUri(uri) {
  const platform = detectPlatform();
  if (platform === 'android') {
    return new Promise((resolve, reject) => {
      const callbackId = getNextCallbackId();
      pendingCallbacks.set(callbackId, { resolve, reject });
      window.NativeBridge.getBase64FromUri(uri, callbackId);
    });
  } else if (platform === 'desktop') {
    const jsonResult = await window.pywebview.api.getBase64FromUri(uri);
    return JSON.parse(jsonResult);
  }
  return { success: true, base64: uri }; // Fallback for dev/mock
}
