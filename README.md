# ShapeDiver Export Tester

An isolated testing environment for debugging ShapeDiver export/download functionality with JSON parameter support.

## Overview

This application provides a simple interface to:
- Connect to a ShapeDiver backend using a ticket
- Submit JSON parameters via URL
- Trigger exports and download results
- View detailed logging of all operations

## Architecture

The application is a single-page web app served by Vite's development server. It uses the ShapeDiver Geometry API SDK v2 for all backend interactions.

### File Structure

```
├── index.html           # Main UI with embedded styles
├── main.ts              # TypeScript application logic
├── sample_json/         # Directory for JSON parameter files
│   └── test1.json       # Sample JSON file
├── .env                 # Environment variables
├── start.bat            # Windows batch script to start the app
├── package.json         # Node.js dependencies and scripts
├── vite.config.ts       # Vite configuration
└── README.md            # This file
```

## Setup

### Prerequisites

- Node.js installed on your system
- A ShapeDiver backend ticket

### Installation

1. Clone or download this repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```
   VITE_EXPORT_BACKEND=your-shapediver-ticket-here
   VITE_SHAPEDIVER_ENDPOINT=https://sdr8euc1.eu-central-1.shapediver.com
   ```

## Running the Application

### Quick Start

Simply run:
```bash
start.bat
```

Or manually:
```bash
npm run dev
```

The app will start at: **http://localhost:3001**

## Using the Application

### Step 1: Connect to Backend

1. Open http://localhost:3001 in your browser
2. Verify the environment variables are loaded correctly (shown at the top)
3. Click **"Connect to Backend"** to establish a session with ShapeDiver
4. Wait for the connection to complete (status will show "Connected")

### Step 2: Configure JSON Parameter

The application includes a **JSON URL** input field for the `moda-json` parameter.

**Default URL:** 
```
https://raw.githubusercontent.com/Wzesk/simple_SD_export_tester/refs/heads/main/sample_json/test1.json
```

**To use your own JSON files:**

1. **Commit your JSON files** to the `sample_json/` directory in your GitHub repo
2. **Push to GitHub**
3. **Generate the raw GitHub URL:**
   ```
   https://raw.githubusercontent.com/your-username/your-repo/main/sample_json/your-file.json
   ```
4. **Paste the URL** into the JSON URL field in the app

**Alternative options:**
- Any publicly accessible URL to a JSON file
- Cloud storage (AWS S3, Azure Blob, etc.) configured for public access
- Your own web server

### Step 3: Trigger Export

1. Click **"Trigger Export"**
2. The application will:
   - Find the `moda-json` parameter in the session
   - Submit the JSON URL as a parameter value
   - Request the export computation
   - Download the result automatically
3. Check the debug log for detailed information about each step

## Features

### Connection Management
- **Connect/Disconnect**: Establish or close ShapeDiver backend sessions
- **Session Info**: Displays session ID and available parameters/exports
- **Status Indicators**: Visual feedback for connection state

### Export Functionality
- **Automatic Export**: Triggers export with current parameters
- **JSON Parameter Support**: Submit `moda-json` parameter via URL
- **Auto-Download**: Downloads export result automatically
- **Export Info**: Shows download link and file format

### Debugging Tools
- **Real-time Logging**: Timestamped log entries for all operations
- **Color-coded Messages**: Info, success, error, warning, and debug levels
- **Detailed Error Messages**: Full error details including stack traces
- **Progress Tracking**: Visual progress bars for operations
- **Clear Logs**: Reset log view as needed

## Adding Your Own JSON Files

1. **Create your JSON file** in the `sample_json/` directory
2. **Commit and push** to your GitHub repository
3. **Generate jsDelivr URL:**
   ```
   https://cdn.jsdelivr.net/gh/your-username/your-repo@main/sample_json/your-file.json
   ```
## Adding Your Own JSON Files

1. **Create your JSON file** in the `sample_json/` directory
2. **Commit and push** to your GitHub repository
3. **Generate raw GitHub URL:**
   ```
   https://raw.githubusercontent.com/your-username/your-repo/main/sample_json/your-file.json
   ```
4. **Use the URL** in the JSON URL field in the app

## Troubleshooting

### Connection Fails

- Verify `.env` file contains valid `VITE_EXPORT_BACKEND` ticket
- Check that the ShapeDiver endpoint URL is correct
- Review the debug log for specific error messages

### Export Fails

- Ensure JSON URL is publicly accessible
- Check that `moda-json` parameter exists in your ShapeDiver model
- Review parameter names in the connection log
- Verify the JSON file is valid JSON syntax
- Check the debug log for detailed error information

### No Export Content Returned

- Check the export configuration in your ShapeDiver model
- Verify the export type is correct
- Review the full export response in the debug log

### GitHub Raw URL Not Working

- Make sure your GitHub repository is **public**
- Verify the branch name is correct (use `main` or `master` as appropriate)
- Check the file path is correct (case-sensitive)
- Try accessing the URL directly in a browser to confirm it loads

## Development

### Available Scripts

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Browser Console

All logs are also written to the browser console (F12) for additional debugging with full detail.

## Technical Details

### ShapeDiver Integration

The application uses `@shapediver/sdk.geometry-api-sdk-v2` to:
1. Create sessions with backend tickets using `SessionApi`
2. Retrieve parameter and export information
3. Submit export requests with parameters using `ExportApi`
4. Handle export results and downloads

### Parameter Submission

Parameters are submitted in the format:
```javascript
{
  parameters: {
    "moda-json-parameter-id": "https://url-to-json-file.json"
  },
  exports: ["export-id"]
}
```

The `moda-json` parameter value must be a URL to a publicly accessible JSON file.

### Export Process

1. Connect to ShapeDiver backend with ticket
2. Find the `moda-json` parameter ID from session data
3. Find the desired export ID from session data
4. Submit export computation with JSON URL
5. Extract download URL from export results
6. Auto-download the file

## License

This is a testing tool for development purposes.

