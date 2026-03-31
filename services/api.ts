import { AppConfig, BootstrapPayload, MovePreview, JobHistoryEntry } from '../types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload as T;
}

export function fetchBootstrap() {
  return request<BootstrapPayload>('/api/bootstrap');
}

export function saveConfig(config: AppConfig) {
  return request<{ config: AppConfig; files: BootstrapPayload['files']; sourceExists: boolean }>('/api/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export function scanSource() {
  return request<{ files: BootstrapPayload['files']; sourceExists: boolean }>('/api/scan', {
    method: 'POST',
  });
}

export function previewMove(fileIds: string[], destinationId: string) {
  return request<MovePreview>('/api/preview-move', {
    method: 'POST',
    body: JSON.stringify({ fileIds, destinationId }),
  });
}

export function executeMove(fileIds: string[], destinationId: string) {
  return request<{
    entry: JobHistoryEntry;
    files: BootstrapPayload['files'];
    history: JobHistoryEntry[];
    latestLog: BootstrapPayload['latestLog'];
    sourceExists: boolean;
  }>('/api/move', {
    method: 'POST',
    body: JSON.stringify({ fileIds, destinationId }),
  });
}

export function revertMove(jobId: string) {
  return request<{
    entry: JobHistoryEntry;
    files: BootstrapPayload['files'];
    history: JobHistoryEntry[];
    latestLog: BootstrapPayload['latestLog'];
    sourceExists: boolean;
  }>('/api/revert', {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  });
}
