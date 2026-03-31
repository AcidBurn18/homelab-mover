export interface FileItem {
  id: string;
  name: string;
  type: 'image' | 'doc' | 'pdf' | 'spreadsheet' | 'code' | 'audio' | 'archive' | 'video';
  size: string;
  date: string;
  path: string;
  extension: string;
  sizeBytes: number;
}

export interface Destination {
  id: string;
  name: string;
  path: string;
  icon: string; // Lucide icon name mapping
  exists?: boolean;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string; // System instruction snippet
  themeColor: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  personaId: string;
}

export interface MovePreviewItem {
  id: string;
  fileName: string;
  sourcePath: string;
  destinationPath: string;
  finalName: string;
  status: 'ready' | 'renamed';
  conflict: boolean;
}

export interface MovePreview {
  destination: Destination;
  items: MovePreviewItem[];
  totalBytes: number;
}

export interface JobItem {
  fileName: string;
  sourcePath: string;
  destinationPath: string;
  revertDestinationPath?: string;
  status: 'moved' | 'renamed' | 'reverted' | 'reverted-renamed' | 'failed';
  detail: string;
}

export interface JobHistoryEntry {
  id: string;
  timestamp: string;
  destinationId: string;
  destinationName: string;
  totalBytes: number;
  fileCount: number;
  status: 'success' | 'partial' | 'failed' | 'reverted';
  summary: string;
  items: JobItem[];
  revertedAt?: string;
  revertedFromJobId?: string;
}

export interface AppConfig {
  sourcePath: string;
  destinations: Destination[];
}

export interface BootstrapPayload {
  config: AppConfig;
  files: FileItem[];
  history: JobHistoryEntry[];
  latestLog: LogEntry | null;
  sourceExists: boolean;
}
