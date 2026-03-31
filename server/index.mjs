import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const APP_DATA_DIR = path.join(ROOT_DIR, '.homelab-mover');
const DEMO_ROOT_DIR = path.join(ROOT_DIR, '.homelab-demo');
const DEMO_SOURCE_DIR = path.join(DEMO_ROOT_DIR, 'inbox');
const DEMO_LIBRARY_DIR = path.join(DEMO_ROOT_DIR, 'library');
const CONFIG_PATH = path.join(APP_DATA_DIR, 'config.json');
const HISTORY_PATH = path.join(APP_DATA_DIR, 'history.json');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PORT = Number(process.env.PORT || 3000);

const DEFAULT_DEMO_FILES = [
  { name: 'Dune.Part.Two.2024.2160p.mkv', content: 'Demo movie placeholder\n' },
  { name: 'ubuntu-24.04-live-server-amd64.iso', content: 'Demo ISO placeholder\n' },
  { name: 'lofi-study-mix.mp3', content: 'Demo audio placeholder\n' },
  { name: 'proxmox-backup.json', content: '{"demo":true}\n' },
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function detectFileType(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v'].includes(extension)) return 'video';
  if (['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg'].includes(extension)) return 'audio';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'].includes(extension)) return 'image';
  if (['.zip', '.rar', '.7z', '.tar', '.gz', '.iso'].includes(extension)) return 'archive';
  if (extension === '.pdf') return 'pdf';
  if (['.doc', '.docx', '.txt', '.md'].includes(extension)) return 'doc';
  if (['.xls', '.xlsx', '.csv'].includes(extension)) return 'spreadsheet';
  return 'code';
}

function iconForDestination(id) {
  if (id.includes('movie')) return 'film';
  if (id.includes('tv')) return 'tv';
  if (id.includes('music')) return 'music';
  if (id.includes('iso')) return 'disc';
  return 'hard-drive';
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function ensureBootstrapData() {
  await ensureDir(APP_DATA_DIR);
  await ensureDir(DEMO_SOURCE_DIR);
  await ensureDir(DEMO_LIBRARY_DIR);
  const hasConfig = await exists(CONFIG_PATH);

  const defaultDestinations = [
    { id: 'movies', name: 'Jellyfin Movies', path: path.join(DEMO_LIBRARY_DIR, 'movies'), icon: 'film' },
    { id: 'tv', name: 'Jellyfin TV Shows', path: path.join(DEMO_LIBRARY_DIR, 'tv_shows'), icon: 'tv' },
    { id: 'music', name: 'Music Library', path: path.join(DEMO_LIBRARY_DIR, 'music'), icon: 'music' },
    { id: 'isos', name: 'ISO Images', path: path.join(DEMO_LIBRARY_DIR, 'isos'), icon: 'disc' },
    { id: 'backups', name: 'Backups', path: path.join(DEMO_LIBRARY_DIR, 'backups'), icon: 'hard-drive' },
  ];

  for (const destination of defaultDestinations) {
    await ensureDir(destination.path);
  }

  if (!hasConfig) {
    for (const file of DEFAULT_DEMO_FILES) {
      const filePath = path.join(DEMO_SOURCE_DIR, file.name);
      if (!(await exists(filePath))) {
        await fs.writeFile(filePath, file.content, 'utf8');
      }
    }
  }

  if (!hasConfig) {
    await writeJson(CONFIG_PATH, {
      sourcePath: DEMO_SOURCE_DIR,
      destinations: defaultDestinations,
    });
  }

  if (!(await exists(HISTORY_PATH))) {
    await writeJson(HISTORY_PATH, []);
  }
}

async function loadConfig() {
  await ensureBootstrapData();
  const config = await readJson(CONFIG_PATH, null);
  if (!config) {
    throw new Error('Unable to load app configuration.');
  }

  const destinations = (config.destinations || []).map((destination) => ({
    ...destination,
    icon: destination.icon || iconForDestination(destination.id),
  }));

  return {
    sourcePath: config.sourcePath || DEMO_SOURCE_DIR,
    destinations,
  };
}

async function saveConfig(config) {
  const normalized = {
    sourcePath: path.resolve(config.sourcePath),
    destinations: config.destinations.map((destination) => ({
      id: destination.id,
      name: destination.name,
      path: path.resolve(destination.path),
      icon: destination.icon || iconForDestination(destination.id),
    })),
  };

  await writeJson(CONFIG_PATH, normalized);
  return normalized;
}

async function loadHistory() {
  await ensureBootstrapData();
  return readJson(HISTORY_PATH, []);
}

async function saveHistory(history) {
  await writeJson(HISTORY_PATH, history);
}

async function scanFiles(sourcePath) {
  const sourceExists = await exists(sourcePath);
  if (!sourceExists) {
    return { sourceExists: false, files: [] };
  }

  const dirents = await fs.readdir(sourcePath, { withFileTypes: true });
  const files = [];

  for (const dirent of dirents) {
    if (!dirent.isFile()) continue;
    const fullPath = path.join(sourcePath, dirent.name);
    const stats = await fs.stat(fullPath);
    const extension = path.extname(dirent.name).replace('.', '').toLowerCase();
    files.push({
      id: fullPath,
      name: dirent.name,
      type: detectFileType(dirent.name),
      size: formatSize(stats.size),
      sizeBytes: stats.size,
      date: stats.mtime.toISOString().slice(0, 10),
      path: fullPath,
      extension,
    });
  }

  files.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  return { sourceExists: true, files };
}

async function statDestinations(destinations) {
  const results = [];
  for (const destination of destinations) {
    results.push({
      ...destination,
      exists: await exists(destination.path),
    });
  }
  return results;
}

async function uniqueDestinationPath(destinationDir, fileName) {
  const parsed = path.parse(fileName);
  let candidateName = fileName;
  let candidatePath = path.join(destinationDir, candidateName);
  let index = 1;

  while (await exists(candidatePath)) {
    candidateName = `${parsed.name} (${index})${parsed.ext}`;
    candidatePath = path.join(destinationDir, candidateName);
    index += 1;
  }

  return {
    finalName: candidateName,
    destinationPath: candidatePath,
    renamed: candidateName !== fileName,
  };
}

async function buildPreview(fileIds, destinationId) {
  const config = await loadConfig();
  const destination = config.destinations.find((item) => item.id === destinationId);
  if (!destination) {
    throw new Error('Destination not found.');
  }

  const previewItems = [];
  let totalBytes = 0;

  for (const fileId of fileIds) {
    const fullPath = fileId;
    const stats = await fs.stat(fullPath);
    const fileName = path.basename(fullPath);
    const resolved = await uniqueDestinationPath(destination.path, fileName);
    totalBytes += stats.size;
    previewItems.push({
      id: fullPath,
      fileName,
      sourcePath: fullPath,
      destinationPath: resolved.destinationPath,
      finalName: resolved.finalName,
      status: resolved.renamed ? 'renamed' : 'ready',
      conflict: resolved.renamed,
    });
  }

  return {
    destination: {
      ...destination,
      exists: await exists(destination.path),
    },
    items: previewItems,
    totalBytes,
  };
}

async function moveFile(sourcePath, destinationPath) {
  try {
    await fs.rename(sourcePath, destinationPath);
  } catch (error) {
    if (error && error.code === 'EXDEV') {
      await fs.copyFile(sourcePath, destinationPath);
      await fs.unlink(sourcePath);
      return;
    }
    throw error;
  }
}

async function executeMove(fileIds, destinationId) {
  const preview = await buildPreview(fileIds, destinationId);
  await ensureDir(preview.destination.path);

  const items = [];
  let movedCount = 0;
  let failedCount = 0;

  for (const previewItem of preview.items) {
    try {
      await moveFile(previewItem.sourcePath, previewItem.destinationPath);
      movedCount += 1;
      items.push({
        fileName: previewItem.fileName,
        sourcePath: previewItem.sourcePath,
        destinationPath: previewItem.destinationPath,
        status: previewItem.conflict ? 'renamed' : 'moved',
        detail: previewItem.conflict
          ? `Moved with a safe rename to ${previewItem.finalName}.`
          : 'Moved successfully.',
      });
    } catch (error) {
      failedCount += 1;
      items.push({
        fileName: previewItem.fileName,
        sourcePath: previewItem.sourcePath,
        destinationPath: previewItem.destinationPath,
        status: 'failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const status = failedCount === 0 ? 'success' : movedCount === 0 ? 'failed' : 'partial';
  const summary =
    status === 'success'
      ? `Moved ${movedCount} file${movedCount === 1 ? '' : 's'} to ${preview.destination.name}.`
      : status === 'partial'
        ? `Moved ${movedCount} file${movedCount === 1 ? '' : 's'} with ${failedCount} failure${failedCount === 1 ? '' : 's'}.`
        : `Move failed for ${failedCount} file${failedCount === 1 ? '' : 's'}.`;

  const entry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    destinationId: preview.destination.id,
    destinationName: preview.destination.name,
    totalBytes: preview.totalBytes,
    fileCount: preview.items.length,
    status,
    summary,
    items,
  };

  const history = await loadHistory();
  history.unshift(entry);
  await saveHistory(history.slice(0, 50));

  return entry;
}

function canRevertEntry(entry) {
  if (!entry) return false;
  if (entry.status === 'reverted') return false;
  if (entry.revertedAt) return false;
  return entry.items.some((item) => item.status === 'moved' || item.status === 'renamed');
}

async function revertMove(jobId) {
  const history = await loadHistory();
  const originalEntry = history.find((entry) => entry.id === jobId);
  if (!originalEntry) {
    throw new Error('Move history entry not found.');
  }
  if (!canRevertEntry(originalEntry)) {
    throw new Error('This move can no longer be reverted.');
  }

  const revertItems = [];
  let revertedCount = 0;
  let failedCount = 0;
  let totalBytes = 0;

  for (const item of originalEntry.items) {
    if (item.status !== 'moved' && item.status !== 'renamed') {
      continue;
    }

    const currentPath = item.destinationPath;
    if (!(await exists(currentPath))) {
      failedCount += 1;
      revertItems.push({
        fileName: item.fileName,
        sourcePath: item.sourcePath,
        destinationPath: currentPath,
        status: 'failed',
        detail: 'Cannot revert because the moved file no longer exists at the destination path.',
      });
      continue;
    }

    const stats = await fs.stat(currentPath);
    totalBytes += stats.size;
    const resolved = await uniqueDestinationPath(path.dirname(item.sourcePath), path.basename(item.sourcePath));

    try {
      await ensureDir(path.dirname(item.sourcePath));
      await moveFile(currentPath, resolved.destinationPath);
      revertedCount += 1;
      revertItems.push({
        fileName: item.fileName,
        sourcePath: item.sourcePath,
        destinationPath: currentPath,
        revertDestinationPath: resolved.destinationPath,
        status: resolved.renamed ? 'reverted-renamed' : 'reverted',
        detail: resolved.renamed
          ? `Reverted with a safe rename to ${path.basename(resolved.destinationPath)}.`
          : 'Reverted successfully.',
      });
    } catch (error) {
      failedCount += 1;
      revertItems.push({
        fileName: item.fileName,
        sourcePath: item.sourcePath,
        destinationPath: currentPath,
        status: 'failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (revertItems.length === 0) {
    throw new Error('This move has no reversible items.');
  }

  originalEntry.revertedAt = new Date().toISOString();

  const status = failedCount === 0 ? 'reverted' : revertedCount === 0 ? 'failed' : 'partial';
  const summary =
    status === 'reverted'
      ? `Reverted ${revertedCount} file${revertedCount === 1 ? '' : 's'} back to the source folder.`
      : status === 'partial'
        ? `Reverted ${revertedCount} file${revertedCount === 1 ? '' : 's'} with ${failedCount} failure${failedCount === 1 ? '' : 's'}.`
        : `Revert failed for ${failedCount} file${failedCount === 1 ? '' : 's'}.`;

  const revertEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    destinationId: originalEntry.destinationId,
    destinationName: originalEntry.destinationName,
    totalBytes,
    fileCount: revertItems.length,
    status,
    summary,
    items: revertItems,
    revertedFromJobId: originalEntry.id,
  };

  history.unshift(revertEntry);
  await saveHistory(history.slice(0, 50));
  return revertEntry;
}

function sanitizeDestination(input, index) {
  const id = (input.id || input.name || `destination-${index + 1}`)
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return {
    id: id || `destination-${index + 1}`,
    name: String(input.name || `Destination ${index + 1}`).trim(),
    path: String(input.path || '').trim(),
    icon: String(input.icon || iconForDestination(id)).trim(),
  };
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
    const config = await loadConfig();
    const scanned = await scanFiles(config.sourcePath);
    const history = await loadHistory();
    const latestHistory = history[0] || null;
    const latestLog = latestHistory
      ? {
          id: latestHistory.id,
          timestamp: latestHistory.timestamp,
          message: latestHistory.summary,
          personaId: 'sysadmin',
        }
      : null;

    return json(res, 200, {
      config: {
        ...config,
        destinations: await statDestinations(config.destinations),
      },
      files: scanned.files,
      history,
      latestLog,
      sourceExists: scanned.sourceExists,
    });
  }

  if (req.method === 'PUT' && url.pathname === '/api/config') {
    const body = await parseBody(req);
    if (!body.sourcePath || !Array.isArray(body.destinations) || body.destinations.length === 0) {
      return json(res, 400, { error: 'A source path and at least one destination are required.' });
    }

    const saved = await saveConfig({
      sourcePath: body.sourcePath,
      destinations: body.destinations.map(sanitizeDestination),
    });

    const scanned = await scanFiles(saved.sourcePath);
    return json(res, 200, {
      config: {
        ...saved,
        destinations: await statDestinations(saved.destinations),
      },
      files: scanned.files,
      sourceExists: scanned.sourceExists,
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/scan') {
    const config = await loadConfig();
    const scanned = await scanFiles(config.sourcePath);
    return json(res, 200, {
      files: scanned.files,
      sourceExists: scanned.sourceExists,
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/preview-move') {
    const body = await parseBody(req);
    if (!Array.isArray(body.fileIds) || body.fileIds.length === 0 || !body.destinationId) {
      return json(res, 400, { error: 'Select at least one file and destination.' });
    }

    const preview = await buildPreview(body.fileIds, body.destinationId);
    return json(res, 200, preview);
  }

  if (req.method === 'POST' && url.pathname === '/api/move') {
    const body = await parseBody(req);
    if (!Array.isArray(body.fileIds) || body.fileIds.length === 0 || !body.destinationId) {
      return json(res, 400, { error: 'Select at least one file and destination.' });
    }

    const entry = await executeMove(body.fileIds, body.destinationId);
    const config = await loadConfig();
    const scanned = await scanFiles(config.sourcePath);
    return json(res, 200, {
      entry,
      files: scanned.files,
      history: await loadHistory(),
      latestLog: {
        id: entry.id,
        timestamp: entry.timestamp,
        message: entry.summary,
        personaId: 'sysadmin',
      },
      sourceExists: scanned.sourceExists,
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/revert') {
    const body = await parseBody(req);
    if (!body.jobId) {
      return json(res, 400, { error: 'A job id is required to revert a move.' });
    }

    const entry = await revertMove(body.jobId);
    const config = await loadConfig();
    const scanned = await scanFiles(config.sourcePath);
    return json(res, 200, {
      entry,
      files: scanned.files,
      history: await loadHistory(),
      latestLog: {
        id: entry.id,
        timestamp: entry.timestamp,
        message: entry.summary,
        personaId: 'sysadmin',
      },
      sourceExists: scanned.sourceExists,
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/history') {
    return json(res, 200, { history: await loadHistory() });
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return json(res, 200, { ok: true });
  }

  return false;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.join(DIST_DIR, requestedPath);

  if (!(await exists(DIST_DIR))) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Frontend build not found. Run `npm run build` first.');
    return;
  }

  try {
    const stats = await fs.stat(filePath);
    if (stats.isFile()) {
      const extension = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      });
      res.end(await fs.readFile(filePath));
      return;
    }
  } catch {
    // Fall through to SPA entry.
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(await fs.readFile(path.join(DIST_DIR, 'index.html')));
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const handled = await handleApi(req, res);
    if (handled !== false) {
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Unexpected server error',
    });
  }
});

await ensureBootstrapData();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Homelab mover server running on http://127.0.0.1:${PORT}`);
});
