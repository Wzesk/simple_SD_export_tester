# ShapeDiver Export Tester

This is an isolated testing environment for debugging ShapeDiver export/download functionality.

## Setup

1. Make sure the `.env.export_test` file contains the required environment variables:
   - `VITE_EXPORT_BACKEND`: Your ShapeDiver backend ticket
   - `VITE_SHAPEDIVER_ENDPOINT`: The ShapeDiver endpoint URL

2. Install dependencies (if not already installed):
   ```bash
   cd export_test
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   Or using PowerShell with execution policy bypass:
   ```powershell
   powershell -ExecutionPolicy Bypass -Command "npm run dev"
   ```

   The app will open automatically at http://localhost:3001

## Features

- **Connect to Backend**: Establishes a session with the ShapeDiver backend using the provided ticket
- **Trigger Export**: Requests an export and automatically downloads the result
- **Detailed Logging**: All operations are logged with timestamps for easy debugging
- **Status Indicators**: Visual feedback shows the current state of the connection and export process
- **Progress Tracking**: Progress bars indicate the current stage of operations

## Usage

1. Click "Connect to Backend" to establish a session
2. Once connected, the "Trigger Export" button will be enabled
3. Click "Trigger Export" to request and download an export
4. Check the debug log for detailed information about each step
5. Use "Clear" to reset the log if needed

## Debugging

The interface provides:
- Real-time status updates
- Detailed parameter and export information
- Full error messages with stack traces
- Timestamped log entries
- Session ID for troubleshooting

All logs are also written to the browser console for additional debugging.

## Architecture

- **index.html**: The single-page interface with embedded styles
- **main.ts**: TypeScript code that handles all ShapeDiver interactions
- **.env.export_test**: Environment variables (backend ticket and endpoint)
- **vite.config.ts**: Vite configuration for building and serving the app

