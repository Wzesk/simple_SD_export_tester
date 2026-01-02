/**
 * ShapeDiver Export Tester
 * 
 * This is an isolated testing environment for ShapeDiver export functionality.
 * It provides detailed logging and status updates for debugging purposes.
 */

import {
    Configuration,
    SessionApi,
    ExportApi,
} from '@shapediver/sdk.geometry-api-sdk-v2';

// State management
let sessionId: string | undefined;
let sessionData: any;
let isConnected = false;

// DOM Elements
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const clearLogsBtn = document.getElementById('clearLogsBtn') as HTMLButtonElement;
const statusIndicator = document.getElementById('statusIndicator') as HTMLElement;
const statusText = document.getElementById('statusText') as HTMLElement;
const sessionIdElement = document.getElementById('sessionId') as HTMLElement;
const exportStatus = document.getElementById('exportStatus') as HTMLElement;
const logContainer = document.getElementById('logContainer') as HTMLElement;
const envBackend = document.getElementById('envBackend') as HTMLElement;
const envEndpoint = document.getElementById('envEndpoint') as HTMLElement;
const progressBar = document.getElementById('progressBar') as HTMLElement;
const progressFill = document.getElementById('progressFill') as HTMLElement;
const exportInfo = document.getElementById('exportInfo') as HTMLElement;
const jsonInput = document.getElementById('jsonInput') as HTMLInputElement;
const backendSelector = document.getElementById('backendSelector') as HTMLSelectElement;

// Environment variables
const EXPORT_BACKEND = import.meta.env.VITE_EXPORT_BACKEND;
const ALT_EXPORT_BACKEND = import.meta.env.ALT_VITE_EXPORT_BACKEND;
const SHAPEDIVER_ENDPOINT = import.meta.env.VITE_SHAPEDIVER_ENDPOINT;

let currentBackendTicket = EXPORT_BACKEND;

// Logging utilities
type LogLevel = 'info' | 'success' | 'error' | 'warning' | 'debug';

function log(message: string, level: LogLevel = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    const time = document.createElement('span');
    time.className = 'log-timestamp';
    time.textContent = timestamp;
    
    const msg = document.createElement('span');
    msg.className = `log-message ${level}`;
    msg.textContent = message;
    
    entry.appendChild(time);
    entry.appendChild(msg);
    logContainer.appendChild(entry);
    
    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Also log to console with appropriate method
    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${timestamp}] ${message}`);
}

function updateStatus(status: string, indicator: 'idle' | 'connecting' | 'connected' | 'error' | 'processing') {
    statusText.textContent = status;
    statusIndicator.className = `status-indicator ${indicator}`;
}

function updateProgress(percent: number) {
    progressFill.style.width = `${percent}%`;
}

function showProgress() {
    progressBar.style.display = 'block';
    updateProgress(0);
}

function hideProgress() {
    progressBar.style.display = 'none';
    updateProgress(0);
}

function showExportInfo(content: string) {
    exportInfo.innerHTML = content;
    exportInfo.classList.add('show');
}

function hideExportInfo() {
    exportInfo.classList.remove('show');
}

// Initialize UI with environment variables
function initializeUI() {
    const updateBackendDisplay = () => {
        if (currentBackendTicket) {
            const shortTicket = currentBackendTicket.substring(0, 40) + '...';
            envBackend.textContent = shortTicket;
            log(`Backend ticket set to: ${shortTicket}`, 'debug');
        } else {
            envBackend.textContent = 'NOT SET';
            log('⚠️ Backend ticket not found', 'error');
        }
    };

    // Check if Alt backend is available
    if (!ALT_EXPORT_BACKEND) {
        const altOption = backendSelector.querySelector('option[value="alt"]') as HTMLOptionElement;
        if (altOption) {
            altOption.disabled = true;
            altOption.textContent += ' (Not configured)';
        }
    }

    backendSelector.addEventListener('change', () => {
        const selected = backendSelector.value;
        if (selected === 'primary') {
            currentBackendTicket = EXPORT_BACKEND;
            log('Switched to Primary Backend', 'info');
        } else {
            currentBackendTicket = ALT_EXPORT_BACKEND;
            log('Switched to Alt Backend', 'info');
        }
        
        if (isConnected) {
            log('⚠️ Backend changed while connected. Please disconnect and reconnect.', 'warning');
        }
        
        updateBackendDisplay();
    });

    // Initial setup
    if (EXPORT_BACKEND) {
        updateBackendDisplay();
    } else {
        envBackend.textContent = 'NOT SET';
        log('⚠️ VITE_EXPORT_BACKEND not found in environment', 'error');
    }
    
    if (SHAPEDIVER_ENDPOINT) {
        envEndpoint.textContent = SHAPEDIVER_ENDPOINT;
        log(`ShapeDiver endpoint: ${SHAPEDIVER_ENDPOINT}`, 'debug');
    } else {
        envEndpoint.textContent = 'NOT SET';
        log('⚠️ VITE_SHAPEDIVER_ENDPOINT not found in environment', 'error');
    }
}

// Connect to ShapeDiver backend
async function connectToBackend() {
    if (!currentBackendTicket) {
        log('❌ Cannot connect: Backend ticket is not set', 'error');
        updateStatus('Configuration Error', 'error');
        return;
    }
    
    if (isConnected && sessionId) {
        log('ℹ️ Already connected. Closing existing session first...', 'info');
        await disconnectFromBackend();
    }
    
    try {
        log('🔌 Initiating connection to ShapeDiver backend...', 'info');
        updateStatus('Connecting...', 'connecting');
        connectBtn.disabled = true;
        showProgress();
        updateProgress(10);
        
        log(`Using ticket: ${currentBackendTicket.substring(0, 40)}...`, 'debug');
        
        const endpoint = SHAPEDIVER_ENDPOINT || 'https://sdr8euc1.eu-central-1.shapediver.com';
        
        updateProgress(30);
        
        // Create SDK configuration
        const config = new Configuration({ basePath: endpoint });
        
        log('Creating session with SessionApi...', 'debug');
        
        // Create session using SessionApi
        const sessionApi = new SessionApi(config);
        const sessionResponse = await sessionApi.createSessionByTicket(currentBackendTicket);
        
        updateProgress(60);
        
        if (!sessionResponse.data) {
            throw new Error('Session creation returned no data');
        }
        
        sessionData = sessionResponse.data;
        sessionId = sessionData.sessionId;
        
        log('✅ Session created successfully!', 'success');
        log(`Session ID: ${sessionId}`, 'info');
        
        sessionIdElement.textContent = sessionId;
        isConnected = true;
        
        updateProgress(80);
        
        // Log session details
        const paramCount = sessionData.parameters ? Object.keys(sessionData.parameters).length : 0;
        const exportCount = sessionData.exports ? Object.keys(sessionData.exports).length : 0;
        
        log(`Parameters available: ${paramCount}`, 'info');
        log(`Exports available: ${exportCount}`, 'info');
        
        // Log parameter names
        if (sessionData.parameters && paramCount > 0) {
            log('Parameters:', 'debug');
            Object.entries(sessionData.parameters).forEach(([id, param]: [string, any]) => {
                log(`  - ${param.name} (${id}): ${param.type}`, 'debug');
            });
        }
        
        // Log export names
        if (sessionData.exports && exportCount > 0) {
            log('Exports:', 'debug');
            Object.entries(sessionData.exports).forEach(([id, exp]: [string, any]) => {
                log(`  - ${exp.name} (${id})`, 'debug');
            });
        }
        
        updateProgress(100);
        setTimeout(() => hideProgress(), 500);
        
        updateStatus('Connected', 'connected');
        exportBtn.disabled = false;
        connectBtn.textContent = 'Disconnect';
        
        log('🎉 Ready to trigger export!', 'success');
        
    } catch (error: any) {
        log(`❌ Connection failed: ${error.message}`, 'error');
        
        // Log detailed error information
        if (error.response) {
            log(`Response status: ${error.response.status}`, 'error');
            log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
        }
        if (error.stack) {
            log(`Stack trace: ${error.stack}`, 'debug');
        }
        
        updateStatus('Connection Failed', 'error');
        isConnected = false;
        sessionId = undefined;
        sessionData = undefined;
        sessionIdElement.textContent = '-';
        exportBtn.disabled = true;
        hideProgress();
    } finally {
        connectBtn.disabled = false;
    }
}

// Disconnect from backend
async function disconnectFromBackend() {
    if (!sessionId) {
        log('ℹ️ No active session to disconnect', 'info');
        return;
    }
    
    try {
        log('🔌 Disconnecting from backend...', 'info');
        updateStatus('Disconnecting...', 'processing');
        
        // Note: SDK v2 sessions are managed server-side, no explicit close needed
        log('✅ Session cleared', 'success');
        
        sessionId = undefined;
        sessionData = undefined;
        isConnected = false;
        sessionIdElement.textContent = '-';
        exportStatus.textContent = 'Not started';
        
        updateStatus('Disconnected', 'idle');
        exportBtn.disabled = true;
        connectBtn.textContent = 'Connect to Backend';
        hideExportInfo();
        
    } catch (error: any) {
        log(`❌ Disconnect error: ${error.message}`, 'error');
        updateStatus('Disconnect Failed', 'error');
    }
}

// Trigger export
async function triggerExport() {
    if (!sessionId || !sessionData) {
        log('❌ Cannot export: No active session', 'error');
        return;
    }
    
    try {
        log('📦 Starting export process...', 'info');
        updateStatus('Exporting...', 'processing');
        exportStatus.textContent = 'Preparing...';
        exportBtn.disabled = true;
        showProgress();
        updateProgress(10);
        hideExportInfo();
        
        // Get available exports
        const exports = sessionData.exports ? Object.entries(sessionData.exports) : [];
        
        if (exports.length === 0) {
            throw new Error('No exports available in this session');
        }
        
        log(`Found ${exports.length} export(s)`, 'info');
        updateProgress(20);
        
        // Use the first export for testing
        const [exportId, exportDef] = exports[0];
        const exportName = (exportDef as any).name || 'export';
        log(`Using export: ${exportName} (${exportId})`, 'info');
        
        exportStatus.textContent = `Requesting: ${exportName}`;
        updateProgress(25);
        
        // Find the moda-json input parameter
        let modaJsonInputId: string | null = null;
        if (sessionData.parameters) {
            for (const [paramId, paramDef] of Object.entries(sessionData.parameters)) {
                if ((paramDef as any).name === 'moda-json') {
                    modaJsonInputId = paramId;
                    break;
                }
            }
        }
        
        if (!modaJsonInputId) {
            log('⚠️ Warning: moda-json parameter not found', 'warning');
            log('Available parameters:', 'debug');
            if (sessionData.parameters) {
                Object.entries(sessionData.parameters).forEach(([id, param]: [string, any]) => {
                    log(`  - ${param.name} (${id}): ${param.type}`, 'debug');
                });
            }
            throw new Error('Could not find moda-json input parameter');
        }
        
        log(`✓ Found moda-json parameter (${modaJsonInputId})`, 'info');
        updateProgress(30);
        
        // Get JSON URL from input
        const jsonUrlValue = jsonInput.value.trim();
        if (!jsonUrlValue) {
            throw new Error('Please provide a JSON URL');
        }
        
        log(`✓ Using JSON URL: ${jsonUrlValue}`, 'info');
        updateProgress(35);
        
        // Prepare export request (matching the code sample structure)
        const exportRequest: any = {
            parameters: {
                [modaJsonInputId]: jsonUrlValue
            },
            exports: [exportId]
        };
        
        log('🚀 Submitting export computation...', 'info');
        log('Export request:', 'debug');
        log(JSON.stringify(exportRequest, null, 2), 'debug');
        
        updateProgress(40);
        
        // Create ExportApi and submit computation
        const endpoint = SHAPEDIVER_ENDPOINT || 'https://sdr8euc1.eu-central-1.shapediver.com';
        const config = new Configuration({ basePath: endpoint });
        const exportApi = new ExportApi(config);
        
        const exportResults = await exportApi.computeExports(sessionId, exportRequest);
        
        updateProgress(70);
        
        log('✅ Export computation completed!', 'success');
        log('Export results:', 'debug');
        log(JSON.stringify(exportResults.data, null, 2), 'debug');
        
        exportStatus.textContent = 'Processing export...';
        updateProgress(85);
        
        // Get the export data from the results
        const exportData = exportResults.data;
        if (!exportData.exports || !exportData.exports[exportId]) {
            throw new Error('Export not found in results');
        }
        
        const selectedExportData = exportData.exports[exportId] as any;
        log('Selected export data:', 'debug');
        log(JSON.stringify(selectedExportData, null, 2), 'debug');
        
        // Check for export content
        if (selectedExportData.content && Array.isArray(selectedExportData.content) && selectedExportData.content.length > 0) {
            const content = selectedExportData.content[0];
            log(`✅ Export content received`, 'success');
            log(`Content format: ${content.format || 'unknown'}`, 'info');
            log(`Content type: ${content.contentType || 'unknown'}`, 'info');
            
            exportStatus.textContent = 'Export ready!';
            updateProgress(100);
            
            // Get download URL
            let downloadUrl = content.href || content.url || content.downloadUrl;
            
            if (downloadUrl) {
                log(`Download URL: ${downloadUrl}`, 'info');
                
                // Create download link
                const downloadInfo = `
                    <strong>✅ Export successful!</strong><br>
                    <strong>Format:</strong> ${content.format || 'unknown'}<br>
                    <strong>Content Type:</strong> ${content.contentType || 'unknown'}<br>
                    <strong>Download URL:</strong><br>
                    <a href="${downloadUrl}" target="_blank" download>${downloadUrl}</a>
                `;
                showExportInfo(downloadInfo);
                
                // Auto-download
                log('📥 Initiating download...', 'info');
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `export.${content.format || 'file'}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                log('🎉 Export download triggered!', 'success');
            } else {
                log('⚠️ Export completed but no download URL found', 'warning');
                exportStatus.textContent = 'No download URL';
                
                const info = `
                    <strong>⚠️ Export completed</strong><br>
                    No download URL available in response
                `;
                showExportInfo(info);
            }
            
        } else {
            log('⚠️ Export completed but no content was returned', 'warning');
            log('Export data structure:', 'debug');
            log(JSON.stringify(selectedExportData, null, 2), 'debug');
            exportStatus.textContent = 'No content returned';
            
            const info = `
                <strong>⚠️ Export completed</strong><br>
                No content array found in response
            `;
            showExportInfo(info);
        }
        
        setTimeout(() => hideProgress(), 1000);
        updateStatus('Connected', 'connected');
        
    } catch (error: any) {
        log(`❌ Export failed: ${error.message}`, 'error');
        
        // Log detailed error information
        if (error.response) {
            log(`Response status: ${error.response.status}`, 'error');
            log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
        }
        if (error.config) {
            log(`Request URL: ${error.config.url}`, 'debug');
            log(`Request method: ${error.config.method}`, 'debug');
            if (error.config.data) {
                log(`Request data: ${error.config.data}`, 'debug');
            }
        }
        if (error.stack) {
            log(`Stack trace: ${error.stack}`, 'debug');
        }
        
        exportStatus.textContent = 'Export failed';
        updateStatus('Export Failed', 'error');
        hideProgress();
        
        const errorInfo = `
            <strong>❌ Export failed</strong><br>
            <strong>Error:</strong> ${error.message}<br>
            ${error.response ? `<strong>Status:</strong> ${error.response.status}<br>` : ''}
            ${error.response?.data ? `<strong>Details:</strong> ${JSON.stringify(error.response.data)}` : ''}
        `;
        showExportInfo(errorInfo);
        
    } finally {
        exportBtn.disabled = false;
    }
}

// Clear logs
function clearLogs() {
    logContainer.innerHTML = '';
    log('🗑️ Logs cleared', 'info');
}

// Event listeners
connectBtn.addEventListener('click', async () => {
    if (isConnected) {
        await disconnectFromBackend();
    } else {
        await connectToBackend();
    }
});

exportBtn.addEventListener('click', triggerExport);
clearLogsBtn.addEventListener('click', clearLogs);

// Initialize
log('🚀 ShapeDiver Export Tester initialized', 'success');
initializeUI();

// Check if we can auto-connect
if (EXPORT_BACKEND && SHAPEDIVER_ENDPOINT) {
    log('✓ Environment configured correctly', 'success');
} else {
    log('⚠️ Missing required environment variables', 'warning');
}
