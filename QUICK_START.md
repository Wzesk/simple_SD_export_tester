# Quick Start Guide - ShapeDiver Export Tester

## What Was Created

A complete, isolated web application for testing ShapeDiver export functionality with detailed debugging capabilities.

## Files Created

```
export_test/
├── .env.export_test          # Environment variables (already existed)
├── index.html                # Main web interface with embedded CSS
├── main.ts                   # TypeScript logic for ShapeDiver integration
├── package.json              # NPM dependencies
├── vite.config.ts            # Vite build configuration
├── tsconfig.json             # TypeScript configuration
├── start.bat                 # Windows batch file to start server
└── README.md                 # Detailed documentation
```

## How to Run

### Option 1: Using npm directly (Recommended)
1. Open a command prompt (cmd.exe, not PowerShell)
2. Navigate to the export_test folder:
   ```
   cd d:\Github\SD-app-template\export_test
   ```
3. Run the dev server:
   ```
   npx vite
   ```
4. Open http://localhost:3001 in your browser

### Option 2: Using the batch file
1. Navigate to the export_test folder in File Explorer
2. Double-click `start.bat`
3. Browser should open automatically

### Option 3: Manual VS Code Terminal
1. Open a new terminal in VS Code
2. Make sure it's set to "Command Prompt" (not PowerShell)
3. Run:
   ```
   cd export_test
   npx vite
   ```

## Features

### User Interface
- **Clean, modern design** with gradient backgrounds and smooth animations
- **Environment display** showing your configured backend ticket and endpoint
- **Status indicators** with color-coded states (idle, connecting, connected, error, processing)
- **Progress bars** for visual feedback during operations
- **Real-time debug log** with timestamps and color-coded message types

### Functionality
1. **Connect to Backend**
   - Establishes a session with ShapeDiver using your ticket
   - Shows session ID and available parameters/exports
   - Logs all session details for debugging

2. **Trigger Export**
   - Requests an export using the first available export definition
   - Shows progress through each step
   - Automatically downloads the result
   - Displays download URL and format information

3. **Debug Logging**
   - Info messages (blue) - General information
   - Success messages (green) - Successful operations
   - Error messages (red) - Failures with stack traces
   - Warning messages (yellow) - Potential issues
   - Debug messages (gray) - Detailed technical information

## Environment Configuration

Your `.env.export_test` file contains:
- `VITE_EXPORT_BACKEND` - Your ShapeDiver backend ticket
- `VITE_SHAPEDIVER_ENDPOINT` - The ShapeDiver API endpoint

These are automatically loaded by Vite and displayed in the UI.

## Debugging Tips

1. **Check the log window** - All operations are logged with timestamps
2. **Browser console** - Open DevTools (F12) for additional console output
3. **Network tab** - Monitor API requests to ShapeDiver in DevTools
4. **Session ID** - Use the displayed session ID for support queries

## How It Works

### Connection Flow
1. Reads environment variables from `.env.export_test`
2. Creates a ShapeDiver session using `@shapediver/viewer.session`
3. Logs all available parameters and exports
4. Enables the export button once connected

### Export Flow
1. Gets the first available export from the session
2. Collects current parameter values
3. Sends export request to ShapeDiver backend
4. Receives export result with download URL
5. Automatically triggers browser download
6. Displays download information

## Troubleshooting

### "Cannot connect: VITE_EXPORT_BACKEND is not set"
- Make sure `.env.export_test` exists in the export_test folder
- Verify the file contains `VITE_EXPORT_BACKEND=...`

### "Connection failed"
- Check if the ticket is valid and not expired
- Verify the ShapeDiver endpoint is correct
- Check browser console for detailed error messages

### "No exports available"
- The ShapeDiver model might not have any exports defined
- Check the session details in the log

### Dependencies not installed
- Run `npm install` in the export_test folder

## Technical Details

- **Framework**: Vanilla TypeScript with Vite
- **ShapeDiver SDK**: @shapediver/viewer.session v3.12.10
- **Build Tool**: Vite 5.x
- **Port**: 3001 (to avoid conflicts with main app on 3000)
- **No React**: Lightweight, no framework overhead for faster loading

## Next Steps

1. Start the development server using one of the methods above
2. Click "Connect to Backend" to establish a session
3. Review the logged session details
4. Click "Trigger Export" to test the export functionality
5. Check the download and review all logged information

The interface provides all the feedback you need to debug export issues!
