import express from 'express';
import cors from 'cors';
import { MongoClient, Db, Collection, ObjectId, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

import {
  Configuration,
  SessionApi,
  ExportApi,
} from '@shapediver/sdk.geometry-api-sdk-v2';
// Conditional Firebase caching (optional)
import { getCachedExport, putCachedExport } from './services/firebaseCache';
// Firebase admin (optional); suppress type requirement if not installed at build time
// @ts-ignore
import admin from 'firebase-admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI!;
const DATABASE_NAME = process.env.DATABASE_NAME || 'moda-test';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'moda-designs';
const RENDER_DEPLOYMENT_URI = 'https://mongo-sd-server.onrender.com'; // Hardcoded for Render deployment
//const RENDER_DEPLOYMENT_URI =  process.env.RENDER_EXTERNAL_HOSTNAME; // not working on render.com deployment
const DOWNLOAD_TICKET = '80e664af137358eb815863befd67a2e95848ab0f38a6c6dd2782e67be2b314b7729c849b8455089fd96ebbcd029af8a85d956598a8f64381885bc229f4225c3e7737018c7c9c1eb1da9b0629b35656d9a2424c385fd0be81933e6a1ae7bc155e492f0f252d8eeee2b9db0d03613623914e459aa17f30a5ca-16b0fd83018df447ae8af036efb925f8';

// Validate required environment variables
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Request logging for production debugging
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

let db: Db;
let collection: Collection;
let isMongoConnected = false;

// MongoDB connection
async function connectToMongoDB() {
  try {
    // Create a MongoClient with a MongoClientOptions object to set the Stable API version
    const client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    
    // Connect the client to the server
    await client.connect();
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB Atlas!");
    
    db = client.db(DATABASE_NAME);
    collection = db.collection(COLLECTION_NAME);
    isMongoConnected = true;
    console.log(`✅ Connected to MongoDB Atlas database: ${DATABASE_NAME}`);
    return true;
  } catch (error) {
    isMongoConnected = false;
    console.warn('⚠️ MongoDB Atlas connection failed:', error instanceof Error ? error.message : error);
    console.warn('📝 The server will continue without database functionality');
    console.warn('💡 To enable MongoDB: Check your Atlas connection string and credentials in .env');
    return false;
  }
}

// Middleware to check MongoDB connection
const requireMongo = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!isMongoConnected) {
    return res.status(503).json({ 
      error: 'Database unavailable', 
      message: 'MongoDB is not connected. Please start MongoDB and restart the server.' 
    });
  }
  next();
};

// Routes

// Get all JSON data
app.get('/api/data', requireMongo, async (req, res) => {
  try {
    const data = await collection.find({}).toArray();
    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get list of items with only ID and name
app.get('/api/data/list', requireMongo, async (req, res) => {
  try {
    // Project only _id and name fields
    const items = await collection.find({}, { 
      projection: { 
        _id: 1, 
        name: 1 
      } 
    }).toArray();
    
    // Transform the data to ensure consistent structure
    const itemList = items.map(item => ({
      id: item._id,
      name: item.name || 'Unnamed Item'
    }));
    
    res.json(itemList);
  } catch (error) {
    console.error('Error fetching item list:', error);
    res.status(500).json({ error: 'Failed to fetch item list' });
  }
});

// Get list of unique designs (latest version only)
app.get('/api/data/list_latest', requireMongo, async (req, res) => {
  try {
    console.log('📝 List latest designs endpoint called');
    
    // Get all items and process them manually
    const allItems = await collection.find({}).toArray();
    console.log(`Found ${allItems.length} total items in database`);
    
    // Group items by name and find the latest version of each
    const designGroups: Record<string, unknown[]> = {};
    
    allItems.forEach(item => {
      const name = item.name || 'Unnamed Item';
      if (!designGroups[name]) {
        designGroups[name] = [];
      }
      designGroups[name].push(item);
    });
    
    // For each design group, find the latest version
    const latestDesigns: unknown[] = [];
    
    Object.entries(designGroups).forEach(([, versions]) => {
      // Sort versions by uploadedAt (descending)
      versions.sort((a: any, b: any) => {
        const timeA = a.uploadedAt;
        const timeB = b.uploadedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
      
      // Take the first (latest) version
      const latestVersion: any = versions[0];
      latestDesigns.push({
        id: latestVersion._id,
        name: latestVersion.name || 'Unnamed Item',
        uploadedAt: latestVersion.uploadedAt,
        isLatestVersion: true,
        totalVersions: versions.length
      });
    });
    
    console.log(`Returning ${latestDesigns.length} unique designs`);
    res.json(latestDesigns);
  } catch (error) {
    console.error('Error fetching design list:', error);
    res.status(500).json({ error: 'Failed to fetch design list' });
  }
});

// Get list of designs with only the most recent version of each design
app.get('/api/designs/list', requireMongo, async (req, res) => {
  try {
    console.log('📝 List designs endpoint called');
    
    // First, let's get all items and process them manually to debug
    const allItems = await collection.find({}).toArray();
    console.log(`Found ${allItems.length} total items in database`);
    
    // Group items by name and find the latest version of each
    const designGroups: Record<string, unknown[]> = {};
    
    allItems.forEach(item => {
      const name = item.name || 'Unnamed Item';
      if (!designGroups[name]) {
        designGroups[name] = [];
      }
      designGroups[name].push(item);
    });
    
    // For each design group, find the latest version
    const latestDesigns: unknown[] = [];
    
    Object.entries(designGroups).forEach(([_, versions]) => {
      // Sort versions by uploadedAt (descending)
      versions.sort((a: any, b: any) => {
        const timeA = a.uploadedAt;
        const timeB = b.uploadedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
      
      // Take the first (latest) version
      const latestVersion: any = versions[0];
      latestDesigns.push({
        id: latestVersion._id,
        name: latestVersion.name || 'Unnamed Item',
        uploadedAt: latestVersion.uploadedAt,
        isLatestVersion: true,
        totalVersions: versions.length
      });
    });
    
    console.log(`Returning ${latestDesigns.length} unique designs`);
    res.json(latestDesigns);
  } catch (error) {
    console.error('Error fetching design list:', error);
    res.status(500).json({ error: 'Failed to fetch design list' });
  }
});

// Search items by name with ID and name only
app.get('/api/data/search', requireMongo, async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;
    
    let query = {};
    
    // If search query is provided, search by name (case-insensitive)
    if (q && typeof q === 'string') {
      query = {
        name: { $regex: q, $options: 'i' }
      };
    }
    
    // Project only _id and name fields, limit results
    const items = await collection.find(query, { 
      projection: { 
        _id: 1, 
        name: 1 
      } 
    }).limit(parseInt(limit as string)).toArray();
    
    // Transform the data to ensure consistent structure
    const searchResults = items.map(item => ({
      id: item._id,
      name: item.name || 'Unnamed Item'
    }));
    
    res.json({
      query: q || 'all',
      count: searchResults.length,
      results: searchResults
    });
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ error: 'Failed to search items' });
  }
});

// Get specific JSON data by ID
app.get('/api/data/:id', requireMongo, async (req, res) => {
  try {
    const { id } = req.params;
    let filter: any;
    
    // Try to use ObjectId if it's a valid MongoDB ObjectId, otherwise use as string
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      filter = { _id: id };
    }
    
    const data = await collection.findOne(filter);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching data by ID:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get versions of a design by name
app.get('/api/data/versions/:name', requireMongo, async (req, res) => {
  try {
    const { name } = req.params;
    
    // Find all documents with the same name, sorted by uploadedAt descending (newest first)
    const versions = await collection.find(
      { name: name },
      { 
        projection: { 
          _id: 1, 
          name: 1, 
          uploadedAt: 1
        } 
      }
    ).sort({ uploadedAt: -1 }).toArray();
    
    if (versions.length === 0) {
      return res.status(404).json({ error: 'No versions found for this design name' });
    }
    
    // Add version numbers (0 = current, 1 = previous, etc.)
    const versionList = versions.map((version, index) => ({
      id: version._id,
      name: version.name,
      versionNumber: index,
      uploadedAt: version.uploadedAt,
      isCurrent: index === 0
    }));
    
    res.json({
      designName: name,
      totalVersions: versionList.length,
      versions: versionList
    });
  } catch (error) {
    console.error('Error fetching design versions:', error);
    res.status(500).json({ error: 'Failed to fetch design versions' });
  }
});

// Get specific version of a design by name and version number
app.get('/api/data/versions/:name/:versionNumber', requireMongo, async (req, res) => {
  try {
    const { name, versionNumber } = req.params;
    const versionNum = parseInt(versionNumber);
    
    if (isNaN(versionNum) || versionNum < 0) {
      return res.status(400).json({ 
        error: 'Invalid version number', 
        message: 'Version number must be a non-negative integer (0 = current, 1 = previous, etc.)' 
      });
    }
    
    // Find all documents with the same name, sorted by uploadedAt descending
    const versions = await collection.find({ name: name })
      .sort({ uploadedAt: -1 })
      .toArray();
    
    if (versions.length === 0) {
      return res.status(404).json({ error: 'No versions found for this design name' });
    }
    
    if (versionNum >= versions.length) {
      return res.status(404).json({ 
        error: 'Version not found', 
        message: `Version ${versionNum} does not exist. Available versions: 0-${versions.length - 1}`,
        totalVersions: versions.length
      });
    }
    
    const requestedVersion = versions[versionNum];
    
    // Add version metadata to the response
    res.json({
      ...requestedVersion,
      versionInfo: {
        versionNumber: versionNum,
        totalVersions: versions.length,
        isCurrent: versionNum === 0,
        uploadedAt: requestedVersion.uploadedAt
      }
    });
  } catch (error) {
    console.error('Error fetching design version:', error);
    res.status(500).json({ error: 'Failed to fetch design version' });
  }
});

// Upload design from JSON file
app.post('/api/data/upload', requireMongo, async (req, res) => {
  try {
    const designData = req.body;
    
    // Validate required fields
    if (!designData.name) {
      return res.status(400).json({ 
        error: 'Invalid design data', 
        message: 'Design must have a name field' 
      });
    }
    
    // Always insert the design with version metadata (using MongoDB _id for unique identification)
    const now = new Date();
    const result = await collection.insertOne({
      ...designData,
      uploadedAt: now,
    });
    
    res.status(201).json({ 
      message: 'Design uploaded successfully', 
      id: result.insertedId,
      name: designData.name,
      uploadedAt: now.toISOString()
    });
  } catch (error) {
    console.error('Error uploading design:', error);
    res.status(500).json({ error: 'Failed to upload design' });
  }
});

// Update existing JSON data
app.put('/api/data/:id', requireMongo, async (req, res) => {
  try {
    const { id } = req.params;
    const jsonData = req.body;
    
    let filter: any;
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      filter = { _id: id };
    }
    
    const result = await collection.updateOne(
      filter,
      { 
        $set: { 
          ...jsonData, 
          uploadedAt: new Date() 
        } 
      }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Data not found' });
    }
    res.json({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).json({ error: 'Failed to update data' });
  }
});

// Delete JSON data
app.delete('/api/data/:id', requireMongo, async (req, res) => {
  try {
    const { id } = req.params;
    
    let filter: any;
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      filter = { _id: id };
    }
    
    const result = await collection.deleteOne(filter);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Data not found' });
    }
    res.json({ message: 'Data deleted successfully' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// Flexible ShapeDiver export download endpoint
app.post('/api/data/download', requireMongo, async (req, res) => {
  try {
    const {
      designId,
      shapediverEndpoint,
      // Flexible selection criteria
      exportType = 'download',           // e.g. 'download', 'data'
      exportNameContains,                // e.g. 'pdf', 'csv'
      contentType                        // preferred MIME type when multiple contents are present
    } = req.body || {};
  const { bypassCache = false } = req.body || {};

    // Validate required parameters
    if (!designId) {
      return res.status(400).json({ error: 'Missing required parameter', message: 'designId is required' });
    }
  // Ticket now provided by server-side configuration

    const endpoint = shapediverEndpoint || 'https://sdr8euc1.eu-central-1.shapediver.com';
    const databaseApiUrl = RENDER_DEPLOYMENT_URI || `http://localhost:${PORT}`;

    // Optional cache lookup before any ShapeDiver calls
    if (!bypassCache) {
      let cached = await getCachedExport({ designId, exportType, exportNameContains, contentType });
      if (cached.hit && cached.buffer) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', cached.contentType || 'application/octet-stream');
        if (cached.filename) {
          res.setHeader('Content-Disposition', `attachment; filename="${cached.filename}"`);
        }
        res.setHeader('Content-Length', cached.buffer.byteLength.toString());
        return res.send(cached.buffer);
      }
    }

    // Step 1: Create SDK configuration
    const config = new Configuration({ basePath: endpoint });

    // Step 2: Create session using server-side export backend ticket
    const sessionApi = new SessionApi(config);
    let sessionResponse;
    try {
      sessionResponse = await sessionApi.createSessionByTicket(DOWNLOAD_TICKET);
    } catch (sessionError: any) {
      console.error('Session creation failed:', sessionError.message);
      throw new Error(`Failed to create ShapeDiver session: ${sessionError.message}`);
    }

    const sessionData = sessionResponse.data;
    const sessionId = sessionData.sessionId;

    // Step 3: Find the moda-json input parameter
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
      throw new Error('Could not find moda-json input parameter');
    }

    // Step 4: Select export dynamically by type and optional name filter
    let selectedExportId: string | null = null;
    let selectedExportName: string = '';
    if (sessionData.exports) {
      for (const [exportId, exportDef] of Object.entries(sessionData.exports)) {
        const e: any = exportDef as any;
        const typeMatches = String(e.type || '').toLowerCase() === String(exportType).toLowerCase();
        const nameMatches = exportNameContains
          ? String(e.name || '').toLowerCase().includes(String(exportNameContains).toLowerCase())
          : true;
        if (typeMatches && nameMatches) {
          selectedExportId = exportId;
          selectedExportName = e.name || exportType;
          break;
        }
      }
    }
    if (!selectedExportId) {
      return res.status(404).json({
        error: 'Export not found',
        message: `No export matched type="${exportType}"${exportNameContains ? ` and nameContains="${exportNameContains}"` : ''}`
      });
    }

    // Step 5: Prepare the moda-json URI
    const modaJsonUri = `${databaseApiUrl}/api/data/${designId}`;

    // Step 6: Submit export computation
    const exportApi = new ExportApi(config);
    const exportRequest: any = {
      parameters: {
        [modaJsonInputId]: modaJsonUri
      },
      exports: [selectedExportId]
    };
    const exportResults = await exportApi.computeExports(sessionId, exportRequest);

    // Step 7: Get the export data from the results
    const exportData = exportResults.data;
    if (!exportData.exports || !exportData.exports[selectedExportId]) {
      return res.status(500).json({ error: 'Export missing', message: 'Export not found in results' });
    }
    const selectedExportData = exportData.exports[selectedExportId] as any;

    // Extract file content or URL
    let fileBuffer: Buffer | null = null;
    let pickedContent: any = null;
    let downloadUrl: string | null = null;

    if (selectedExportData && Array.isArray(selectedExportData.content)) {
      pickedContent = contentType
        ? selectedExportData.content.find((c: any) => (c.contentType || '').toLowerCase() === String(contentType).toLowerCase())
        : selectedExportData.content[0];

      if (pickedContent?.data || pickedContent?.content) {
        const payload = pickedContent.data || pickedContent.content;
        if (typeof payload === 'string') {
          if (payload.startsWith('data:')) {
            const b64 = payload.split(',')[1] ?? '';
            fileBuffer = Buffer.from(b64, 'base64');
          } else {
            try { fileBuffer = Buffer.from(payload, 'base64'); }
            catch { fileBuffer = Buffer.from(payload, 'binary'); }
          }
        } else if (payload instanceof ArrayBuffer) {
          fileBuffer = Buffer.from(payload);
        } else if (Buffer.isBuffer(payload)) {
          fileBuffer = payload;
        }
      } else if (pickedContent?.href) {
        downloadUrl = pickedContent.href;
      }
    } else if (selectedExportData) {
      // Fallback direct properties
      if (selectedExportData.data || selectedExportData.content) {
        const payload = selectedExportData.data || selectedExportData.content;
        if (typeof payload === 'string') {
          try { fileBuffer = Buffer.from(payload, 'base64'); }
          catch { fileBuffer = Buffer.from(payload, 'binary'); }
        } else if (payload instanceof ArrayBuffer) {
          fileBuffer = Buffer.from(payload);
        } else if (Buffer.isBuffer(payload)) {
          fileBuffer = payload;
        }
      } else if (selectedExportData.href || selectedExportData.url || selectedExportData.downloadUrl || selectedExportData.link) {
        downloadUrl = selectedExportData.href || selectedExportData.url || selectedExportData.downloadUrl || selectedExportData.link;
      }
    }

    if (!fileBuffer && downloadUrl) {
      const r = await fetch(downloadUrl);
      if (!r.ok) {
        return res.status(502).json({ error: 'Download failed', message: `Failed to download export: ${r.status} ${r.statusText}` });
      }
      fileBuffer = Buffer.from(await r.arrayBuffer());
    }

    if (!fileBuffer) {
      return res.status(500).json({ error: 'No export content', message: 'No file content or URL returned by export' });
    }

  // Prepare response headers (normalize by known formats)
  const format = (pickedContent?.format || (selectedExportData as any)?.format || '').toString().toLowerCase();
  // Normalize content-type for known formats to avoid unexpected MIME variants (e.g. text/x-obj)
    let ct: string;
    if (format === 'pdf') ct = 'application/pdf';
    else if (format === 'zip') ct = 'application/zip';
    else if (format === 'obj') ct = 'model/obj';
    else ct = (pickedContent?.contentType || contentType || 'application/octet-stream');
    // Normalize OBJ-like vendor types (e.g., text/x-obj, application/x-obj)
    if (!format && /\b(x-)?obj\b/i.test(ct)) {
      ct = 'model/obj';
    }

  // Ensure proper file extension
    let ext = format ? `.${format}` : (ct === 'application/pdf' ? '.pdf' : (ct === 'application/zip' ? '.zip' : (ct === 'model/obj' ? '.obj' : '')));
    if (!ext && /\b(x-)?obj\b/i.test(ct)) {
      ext = '.obj';
    }
  const filename = `${designId}_${selectedExportName || exportType}${ext}`;

  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.byteLength.toString());

    // Fire and forget cache store (do not delay response)
    if (!bypassCache) {
      putCachedExport({ designId, exportType, exportNameContains, contentType: ct }, fileBuffer, ct, filename)
        .catch(err => console.warn('⚠️ Cache store failed:', (err as Error).message));
    }
    return res.send(fileBuffer);

  } catch (error) {
    console.error('Error in download endpoint:', error);
    return res.status(500).json({ 
      error: 'Download error',
      message: (error as Error).message || 'Unknown error'
    });
  }
});

// Admin: purge cached exports for a design or all (dangerous). Optional filtering by exportType or exportNameContains.
app.delete('/api/cache/exports', async (req, res) => {
  try {
    if (!process.env.FIREBASE_CACHE_ENABLED) return res.status(400).json({ error: 'Cache disabled' });
    if (!admin.apps.length) return res.status(500).json({ error: 'Firebase not initialized' });
    const { designId, exportType, exportNameContains } = req.query as Record<string,string>;
    const bucket = admin.storage().bucket();
    // Build prefix
    let prefix = 'exports/';
    if (designId) prefix += `${designId}/`;
    const [files] = await bucket.getFiles({ prefix });
  const targets = files.filter((f: any) => {
      if (exportType && !f.name.includes(`exportType=${exportType}`)) return false;
      if (exportNameContains && !f.name.includes(`exportNameContains=${exportNameContains}`)) return false;
      return true;
    });
  await Promise.all(targets.map((f: any) => f.delete().catch(() => {})));
    return res.json({ message: 'Purge complete', deleted: targets.length });
  } catch (err) {
    return res.status(500).json({ error: 'Purge failed', message: (err as Error).message });
  }
});

// Admin: cache stats (count + total bytes) optionally scoped by designId
app.get('/api/cache/exports/stats', async (req, res) => {
  try {
    if (!process.env.FIREBASE_CACHE_ENABLED) return res.status(400).json({ error: 'Cache disabled' });
    if (!admin.apps.length) return res.status(500).json({ error: 'Firebase not initialized' });
    const { designId } = req.query as Record<string,string>;
    const bucket = admin.storage().bucket();
    let prefix = 'exports/';
    if (designId) prefix += `${designId}/`;
    const [files] = await bucket.getFiles({ prefix });
    let totalBytes = 0;
    let count = 0;
    for (const f of files) {
      try {
        const [meta] = await f.getMetadata();
        totalBytes += parseInt(meta.size || '0', 10);
        count += 1;
      } catch { /* ignore */ }
    }
    return res.json({ designScoped: !!designId, designId, objects: count, totalBytes });
  } catch (err) {
    return res.status(500).json({ error: 'Stats failed', message: (err as Error).message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: isMongoConnected ? 'Connected' : 'Disconnected'
  });
});

// Start server
async function startServer() {
  console.log('🔄 Starting server with updated MongoDB Atlas connection...');
  console.log('🔗 Database:', DATABASE_NAME);
  console.log('📁 Collection:', COLLECTION_NAME);
  console.log('🔗 Attempting Atlas connection...');
  await connectToMongoDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at: http://localhost:${PORT}/api`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch(console.error);
