/**
 * NativeBridge — Universal IPC bridge for JS ↔ Python communication.
 *
 * Abstracts the platform-specific communication layer:
 *   - Desktop (pywebview): Uses window.pywebview.api.call()
 *   - Android (Chaquopy):  Uses window.NativeBridge.call() + callback
 *   - Dev mode:            Uses mock responses for UI development
 *
 * Usage:
 *   import { call } from 'pywebapp-bridge';
 *   const result = await call('add', [5, 7]);
 *   // result = { success: true, result: 12, method: 'add' }
 */

import { MOCK_HANDLERS } from './mock.js';

// Pending callback registry for Android async responses
const pendingCallbacks = new Map();
let callbackIdCounter = 0;

/**
 * Resolve a pending Android callback.
 * Called from Kotlin via webView.evaluateJavascript().
 */
window.__resolveCallback = (callbackId, resultJson) => {
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
};

/**
 * Detect the current platform/environment.
 */
export function detectPlatform() {
  if (window.pywebview && window.pywebview.api) {
    return 'desktop';
  }
  if (window.NativeBridge) {
    return 'android';
  }
  if (window.__PYWEBAPP_API_URL__) {
    return 'web';
  }
  return 'dev';
}

/**
 * Generic IPC: Call a Python method from Javascript.
 * Works across Android (Chaquopy), Desktop (pywebview), and Web (Mock).
 */
export async function call(method, params = []) {
  const platform = detectPlatform();
  const startTime = performance.now();

  console.log(`[IPC Request] ${method}:`, params);

  try {
    let response;
    
    if (platform === 'android') {
      // Async bridge with callback registry
      return new Promise((resolve, reject) => {
        const callbackId = `call_${++callbackIdCounter}`;
        pendingCallbacks.set(callbackId, { resolve, reject });
        
        try {
          const jsonParams = JSON.stringify(params);
          window.NativeBridge.call(method, jsonParams, callbackId);
        } catch (e) {
          pendingCallbacks.delete(callbackId);
          reject(e);
        }
      });
    } else if (platform === 'desktop') {
      // Direct Promise from pywebview
      const jsonParams = JSON.stringify(params);
      const jsonResult = await window.pywebview.api.dispatch(method, jsonParams);
      response = JSON.parse(jsonResult);
    } else if (platform === 'web') {
      // HTTP transport — communicates with the Python Flask server
      const apiUrl = window.__PYWEBAPP_API_URL__ || '/api/dispatch';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params }),
      });
      response = await res.json();
    } else {
      // Mock for web development (no server running)
      await new Promise(r => setTimeout(r, 100));
      const handler = MOCK_HANDLERS[method];
      if (handler) {
        response = handler(params);
      } else {
        response = { 
          success: true, 
          result: `Mock response for ${method}`,
          method 
        };
      }
    }
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`[IPC Response] ${method} (${duration}ms):`, response);
    return response;
  } catch (err) {
    console.error(`[IPC Error] ${method}:`, err);
    return { success: false, error: err.message, method };
  }
}

/**
 * Desktop (pywebview) — Direct Python call via js_api.
 */
async function callDesktop(method, params) {
  try {
    const paramsJson = JSON.stringify(params);
    const resultJson = await window.pywebview.api.call(method, paramsJson);
    return typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
  } catch (err) {
    console.error('[Bridge] Desktop call error:', err);
    return {
      success: false,
      error: `Desktop bridge error: ${err.message}`,
      method,
    };
  }
}

/**
 * Android (Chaquopy) — JavascriptInterface call with callback Promise.
 */
function callAndroid(method, params) {
  return new Promise((resolve, reject) => {
    const callbackId = `cb_${++callbackIdCounter}`;
    pendingCallbacks.set(callbackId, { resolve, reject });

    // Set a timeout to prevent hanging if callback never fires
    const timeout = setTimeout(() => {
      if (pendingCallbacks.has(callbackId)) {
        pendingCallbacks.delete(callbackId);
        reject(new Error(`Android IPC timeout for method '${method}'`));
      }
    }, 30000); // 30 second timeout

    // Store timeout handle so it can be cleared on success
    const original = pendingCallbacks.get(callbackId);
    pendingCallbacks.set(callbackId, {
      resolve: (val) => {
        clearTimeout(timeout);
        original.resolve(val);
      },
      reject: (err) => {
        clearTimeout(timeout);
        original.reject(err);
      },
    });

    try {
      const paramsJson = JSON.stringify(params);
      window.NativeBridge.call(method, paramsJson, callbackId);
    } catch (err) {
      clearTimeout(timeout);
      pendingCallbacks.delete(callbackId);
      reject(new Error(`Android bridge error: ${err.message}`));
    }
  });
}

/**
 * Dev mode — Returns mock data with simulated latency.
 */
async function callMock(method, params) {
  // Simulate network-like latency
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

  const handler = MOCK_HANDLERS[method];
  if (handler) {
    return handler(params);
  }

  return {
    success: false,
    error: `[Dev Mock] Unknown method: '${method}'`,
    method,
  };
}

/**
 * Utility: Check if the native bridge is ready.
 */
export function isBridgeReady() {
  return detectPlatform() !== 'dev' || true; // Dev mode is always "ready"
}

/**
 * Utility: Get current platform name.
 */
export function getPlatform() {
  return detectPlatform();
}

// Export pendingCallbacks and callbackIdCounter for use by native.js
export { pendingCallbacks, callbackIdCounter };

// Mutable counter export workaround
export function getNextCallbackId() {
  return `native_${++callbackIdCounter}`;
}
