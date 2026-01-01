/**
 * ShapeDiver Export Tester
 * 
 * This is an isolated testing environment for ShapeDiver export functionality.
 * It provides detailed logging and status updates for debugging purposes.
 */

import { createSession, ISessionApi } from '@shapediver/viewer.session';

// State management
let session: ISessionApi | undefined;
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
const jsonInput = document.getElementById('jsonInput') as HTMLTextAreaElement;

// Environment variables
const EXPORT_BACKEND = import.meta.env.VITE_EXPORT_BACKEND;
const SHAPEDIVER_ENDPOINT = import.meta.env.VITE_SHAPEDIVER_ENDPOINT;

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
    if (EXPORT_BACKEND) {
        const shortTicket = EXPORT_BACKEND.substring(0, 40) + '...';
        envBackend.textContent = shortTicket;
        log(`Export backend ticket loaded (${EXPORT_BACKEND.length} chars)`, 'debug');
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
    if (!EXPORT_BACKEND) {
        log('❌ Cannot connect: VITE_EXPORT_BACKEND is not set', 'error');
        updateStatus('Configuration Error', 'error');
        return;
    }
    
    if (isConnected && session) {
        log('ℹ️ Already connected. Closing existing session first...', 'info');
        await disconnectFromBackend();
    }
    
    try {
        log('🔌 Initiating connection to ShapeDiver backend...', 'info');
        updateStatus('Connecting...', 'connecting');
        connectBtn.disabled = true;
        showProgress();
        updateProgress(10);
        
        log(`Using ticket: ${EXPORT_BACKEND.substring(0, 40)}...`, 'debug');
        
        const sessionDto = {
            id: 'export-test-session',
            ticket: EXPORT_BACKEND,
            modelViewUrl: SHAPEDIVER_ENDPOINT || 'https://sdr8euc1.eu-central-1.shapediver.com',
        };
        
        log('Creating session with configuration:', 'debug');
        log(JSON.stringify(sessionDto, null, 2), 'debug');
        
        updateProgress(30);
        
        session = await createSession(sessionDto);
        
        updateProgress(60);
        
        if (!session) {
            throw new Error('Session creation returned undefined');
        }
        
        log('✅ Session created successfully!', 'success');
        log(`Session ID: ${session.id}`, 'info');
        
        sessionIdElement.textContent = session.id;
        isConnected = true;
        
        updateProgress(80);
        
        // Log session details
        log(`Parameters available: ${Object.keys(session.parameters).length}`, 'info');
        log(`Exports available: ${Object.keys(session.exports).length}`, 'info');
        log(`Outputs available: ${Object.keys(session.outputs).length}`, 'info');
        
        // Log parameter names
        if (Object.keys(session.parameters).length > 0) {
            log('Parameters:', 'debug');
            Object.entries(session.parameters).forEach(([id, param]) => {
                log(`  - ${param.name} (${id}): ${param.type}`, 'debug');
            });
        }
        
        // Log export names
        if (Object.keys(session.exports).length > 0) {
            log('Exports:', 'debug');
            Object.entries(session.exports).forEach(([id, exp]) => {
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
        if (error.request) {
            log(`Request config: ${JSON.stringify({
                url: error.config?.url,
                method: error.config?.method,
                baseURL: error.config?.baseURL
            }, null, 2)}`, 'debug');
        }
        if (error.stack) {
            log(`Stack trace: ${error.stack}`, 'debug');
        }
        
        updateStatus('Connection Failed', 'error');
        isConnected = false;
        session = undefined;
        sessionIdElement.textContent = '-';
        exportBtn.disabled = true;
        hideProgress();
    } finally {
        connectBtn.disabled = false;
    }
}

// Disconnect from backend
async function disconnectFromBackend() {
    if (!session) {
        log('ℹ️ No active session to disconnect', 'info');
        return;
    }
    
    try {
        log('🔌 Disconnecting from backend...', 'info');
        updateStatus('Disconnecting...', 'processing');
        
        await session.close();
        
        log('✅ Session closed successfully', 'success');
        
        session = undefined;
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
    if (!session) {
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
        const exports = Object.entries(session.exports);
        
        if (exports.length === 0) {
            throw new Error('No exports available in this session');
        }
        
        log(`Found ${exports.length} export(s)`, 'info');
        updateProgress(20);
        
        // Use the first export for testing
        const [exportId, exportApi] = exports[0];
        log(`Using export: ${exportApi.name} (${exportId})`, 'info');
        
        exportStatus.textContent = `Requesting: ${exportApi.name}`;
        updateProgress(30);
        
        // Get current parameter values
        const parameters: { [key: string]: string } = {};
        for (const [paramId, param] of Object.entries(session.parameters)) {
            parameters[paramId] = param.stringify();
            log(`  Parameter ${param.name}: ${param.stringify()}`, 'debug');
        }
        
        // Add JSON input if provided
        const jsonInputValue = jsonInput.value.trim();
        if (jsonInputValue) {
            try {
                // Validate JSON
                JSON.parse(jsonInputValue);
                
                // Check if moda-json parameter exists in session
                const hasModaJsonParam = Object.entries(session.parameters).some(
                    ([id, param]) => id === 'moda-json' || param.name === 'moda-json'
                );
                
                if (hasModaJsonParam) {
                    parameters['moda-json'] = jsonInputValue;
                    log(`✓ Adding moda-json parameter: ${jsonInputValue.substring(0, 100)}${jsonInputValue.length > 100 ? '...' : ''}`, 'info');
                } else {
                    log(`⚠️ Warning: 'moda-json' parameter not found in session parameters`, 'warning');
                    log('Available parameters:', 'debug');
                    Object.entries(session.parameters).forEach(([id, param]) => {
                        log(`  - ID: ${id}, Name: ${param.name}`, 'debug');
                    });
                    log('Attempting to add moda-json parameter anyway...', 'info');
                    parameters['moda-json'] = jsonInputValue;
                }
            } catch (e: any) {
                log(`⚠️ Warning: JSON input is not valid JSON: ${e.message}`, 'warning');
                log('Continuing without moda-json parameter', 'warning');
            }
        }
        
        updateProgress(40);
        
        log('🚀 Requesting export from backend...', 'info');
        log(`Sending parameters: ${JSON.stringify(parameters, null, 2)}`, 'debug');
        
        const exportResult = await exportApi.request(parameters);
        
        updateProgress(70);
        
        log('✅ Export request completed!', 'success');
        log(`Export result:`, 'debug');
        log(JSON.stringify(exportResult, null, 2), 'debug');
        
        exportStatus.textContent = 'Processing export...';
        updateProgress(85);
        
        // Check for export content
        if (exportResult.content && exportResult.content.length > 0) {
            const content = exportResult.content[0];
            log(`Export content received: ${content.href}`, 'success');
            log(`Content type: ${content.format}`, 'info');
            
            exportStatus.textContent = 'Export ready!';
            updateProgress(100);
            
            // Create download link
            const downloadInfo = `
                <strong>✅ Export successful!</strong><br>
                <strong>Format:</strong> ${content.format}<br>
                <strong>Download URL:</strong><br>
                <a href="${content.href}" target="_blank" download>${content.href}</a>
            `;
            showExportInfo(downloadInfo);
            
            // Auto-download
            log('📥 Initiating download...', 'info');
            const link = document.createElement('a');
            link.href = content.href;
            link.download = `export.${content.format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            log('🎉 Export download triggered!', 'success');
            
        } else {
            log('⚠️ Export completed but no content was returned', 'warning');
            exportStatus.textContent = 'No content returned';
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
