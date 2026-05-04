/**
 * pywebapp-bridge — Universal IPC bridge for PyWebApp.
 * 
 * Re-exports everything from the modular files for a clean public API.
 * 
 * Usage:
 *   import { call, pickImage, shareText, detectPlatform } from 'pywebapp-bridge';
 */

// Core IPC
export { call, detectPlatform, isBridgeReady, getPlatform } from './bridge.js';

// Native platform APIs
export { 
  getSystemEnv,
  requestPermission,
  pickImage,
  pickFile,
  openCamera,
  launchIntent,
  shareText,
  showToast,
  getBase64FromUri
} from './native.js';

// Mock handlers (for custom dev mode extensions)
export { MOCK_HANDLERS } from './mock.js';
