# pywebapp-bridge

Universal IPC bridge for PyWebApp — JS ↔ Python communication across Android, Desktop, and Web.

## Installation

```bash
npm install pywebapp-bridge
```

## Usage

```jsx
import { call, pickImage, shareText, detectPlatform } from 'pywebapp-bridge';

// Call any Python function
const result = await call('add', [5, 7]);
// result = { success: true, result: 12, method: 'add' }

// Pick an image (works on Android, Desktop, and Web)
const image = await pickImage();

// Detect current platform
const platform = detectPlatform(); // 'android' | 'desktop' | 'dev'
```

## API

| Function | Description |
|---|---|
| `call(method, params)` | Call a Python function by name |
| `detectPlatform()` | Returns 'android', 'desktop', or 'dev' |
| `pickImage()` | Pick an image from gallery/file system |
| `pickFile()` | Pick any file |
| `openCamera()` | Open device camera |
| `shareText(text)` | Share text to other apps |
| `showToast(message)` | Show a native toast |
| `getBase64FromUri(uri)` | Convert URI to Base64 |
| `launchIntent(action, type)` | Launch any Android Intent |
| `requestPermission(permission)` | Request Android permission |
| `getSystemEnv()` | Get native system environment |

## License

Developed by **Sonu Vishwakarma**. (c) 2026. All rights reserved.
