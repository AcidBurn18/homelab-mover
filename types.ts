export interface FileItem {
  id: string;
  name: string;
  type: 'image' | 'doc' | 'pdf' | 'spreadsheet' | 'code' | 'audio' | 'archive' | 'video';
  size: string;
  date: string;
}

export interface Destination {
  id: string;
  name: string;
  path: string;
  icon: string; // Lucide icon name mapping
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
  timestamp: Date;
  message: string;
  personaId: string;
}