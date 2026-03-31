import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderOutput,
  HardDrive,
  History,
  Inbox,
  Loader2,
  Minus,
  Moon,
  Music,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Sun,
  Terminal,
  RotateCcw,
  Tv,
  Film,
  Disc,
  X,
} from 'lucide-react';
import { FILTER_TYPES, PERSONAS } from './constants';
import { FileIcon } from './components/FileIcon';
import {
  AppConfig,
  BootstrapPayload,
  Destination,
  FileItem,
  JobHistoryEntry,
  MovePreview,
} from './types';
import { executeMove, fetchBootstrap, previewMove, revertMove, saveConfig, scanSource } from './services/api';

const getDestIcon = (iconName: string, className?: string) => {
  const props = { className };
  switch (iconName) {
    case 'film':
      return <Film {...props} />;
    case 'tv':
      return <Tv {...props} />;
    case 'music':
      return <Music {...props} />;
    case 'disc':
      return <Disc {...props} />;
    default:
      return <HardDrive {...props} />;
  }
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

type SortKey = 'name' | 'type' | 'size' | 'date';
type SortDirection = 'asc' | 'desc';

const EMPTY_CONFIG: AppConfig = {
  sourcePath: '',
  destinations: [],
};

export default function App() {
  const activePersona = PERSONAS[0];
  const [sourceFiles, setSourceFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<AppConfig>(EMPTY_CONFIG);
  const [settingsDraft, setSettingsDraft] = useState<AppConfig>(EMPTY_CONFIG);
  const [selectedDestId, setSelectedDestId] = useState('');
  const [history, setHistory] = useState<JobHistoryEntry[]>([]);
  const [latestLog, setLatestLog] = useState<BootstrapPayload['latestLog']>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [preview, setPreview] = useState<MovePreview | null>(null);
  const [revertTarget, setRevertTarget] = useState<JobHistoryEntry | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [sourceExists, setSourceExists] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc',
  });

  const selectedDest = useMemo(
    () => config.destinations.find((destination) => destination.id === selectedDestId) || config.destinations[0],
    [config.destinations, selectedDestId]
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    void loadApp();
  }, []);

  async function loadApp() {
    setIsLoading(true);
    setError('');
    try {
      const payload = await fetchBootstrap();
      applyBootstrap(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the app.');
    } finally {
      setIsLoading(false);
    }
  }

  function applyBootstrap(payload: BootstrapPayload) {
    setSourceFiles(payload.files);
    setConfig(payload.config);
    setSettingsDraft(payload.config);
    setHistory(payload.history);
    setLatestLog(payload.latestLog);
    setSourceExists(payload.sourceExists);
    setSelectedDestId((current) => {
      const stillExists = payload.config.destinations.some((destination) => destination.id === current);
      return stillExists ? current : payload.config.destinations[0]?.id || '';
    });
  }

  async function refreshFiles() {
    setIsRefreshing(true);
    setError('');
    try {
      const payload = await scanSource();
      setSourceFiles(payload.files);
      setSourceExists(payload.sourceExists);
      setSelectedFiles(new Set());
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh files.');
    } finally {
      setIsRefreshing(false);
    }
  }

  function toggleFileSelection(id: string) {
    setSelectedFiles((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function initiateMove() {
    if (!selectedDest || selectedFiles.size === 0) return;
    setIsPreviewLoading(true);
    setError('');
    try {
      const nextPreview = await previewMove(Array.from(selectedFiles), selectedDest.id);
      setPreview(nextPreview);
      setShowConfirmModal(true);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Unable to preview the move.');
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function processMoveFiles() {
    if (!selectedDest || selectedFiles.size === 0) return;
    setIsProcessing(true);
    setError('');
    try {
      const result = await executeMove(Array.from(selectedFiles), selectedDest.id);
      setSourceFiles(result.files);
      setHistory(result.history);
      setLatestLog(result.latestLog);
      setSourceExists(result.sourceExists);
      setSelectedFiles(new Set());
      setPreview(null);
      setShowConfirmModal(false);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Unable to move files.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSaveConfig() {
    setIsSavingConfig(true);
    setError('');
    try {
      const cleanedDestinations = settingsDraft.destinations.filter((destination) => destination.name.trim() && destination.path.trim());
      const result = await saveConfig({
        sourcePath: settingsDraft.sourcePath.trim(),
        destinations: cleanedDestinations,
      });
      const nextConfig = result.config;
      setConfig(nextConfig);
      setSettingsDraft(nextConfig);
      setSourceFiles(result.files);
      setSourceExists(result.sourceExists);
      setSelectedFiles(new Set());
      setShowSettingsModal(false);
      setSelectedDestId((current) => {
        const stillExists = nextConfig.destinations.some((destination) => destination.id === current);
        return stillExists ? current : nextConfig.destinations[0]?.id || '';
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  }

  function isRevertible(entry: JobHistoryEntry) {
    if (entry.status === 'reverted' || entry.revertedAt) return false;
    return entry.items.some((item) => item.status === 'moved' || item.status === 'renamed');
  }

  function openRevertModal(entry: JobHistoryEntry) {
    setRevertTarget(entry);
    setShowRevertModal(true);
  }

  async function handleRevertMove() {
    if (!revertTarget) return;
    setIsReverting(true);
    setError('');
    try {
      const result = await revertMove(revertTarget.id);
      setSourceFiles(result.files);
      setHistory(result.history);
      setLatestLog(result.latestLog);
      setSourceExists(result.sourceExists);
      setSelectedFiles(new Set());
      setShowRevertModal(false);
      setRevertTarget(null);
    } catch (revertError) {
      setError(revertError instanceof Error ? revertError.message : 'Unable to revert this move.');
    } finally {
      setIsReverting(false);
    }
  }

  function updateDestinationDraft(index: number, field: keyof Destination, value: string) {
    setSettingsDraft((current) => ({
      ...current,
      destinations: current.destinations.map((destination, destinationIndex) =>
        destinationIndex === index
          ? {
              ...destination,
              [field]: value,
            }
          : destination
      ),
    }));
  }

  const filteredFiles = useMemo(() => {
    return sourceFiles.filter((file) => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || file.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, sourceFiles, typeFilter]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.sizeBytes - b.sizeBytes;
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredFiles, sortConfig]);

  const selectedFilesList = useMemo(
    () => sourceFiles.filter((file) => selectedFiles.has(file.id)),
    [selectedFiles, sourceFiles]
  );

  const areAllSelected = sortedFiles.length > 0 && sortedFiles.every((file) => selectedFiles.has(file.id));
  const isIndeterminate = !areAllSelected && sortedFiles.some((file) => selectedFiles.has(file.id));

  function toggleSelectAll() {
    setSelectedFiles((current) => {
      const next = new Set(current);
      if (areAllSelected) {
        sortedFiles.forEach((file) => next.delete(file.id));
      } else {
        sortedFiles.forEach((file) => next.add(file.id));
      }
      return next;
    });
  }

  function handleSort(key: SortKey) {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  const totalSelectedBytes = selectedFilesList.reduce((sum, file) => sum + file.sizeBytes, 0);

  const SortIndicator = ({ active, direction }: { active: boolean; direction: SortDirection }) => (
    <div className={`flex flex-col ml-1 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`}>
      <ChevronUp size={10} className={`-mb-1 ${active && direction === 'asc' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'}`} />
      <ChevronDown size={10} className={`${active && direction === 'desc' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'}`} />
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc] text-gray-700">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin" />
          <span>Loading your homelab mover...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fc] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans overflow-hidden relative transition-colors duration-300">
      <div
        className="absolute inset-0 z-0 pointer-events-none mix-blend-multiply dark:mix-blend-overlay dark:opacity-[0.05]"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1558494949-ef526b0042a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.03,
        }}
      />

      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md h-16 border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 flex items-center justify-between shrink-0 z-20 relative transition-colors">
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
            <Inbox size={20} strokeWidth={2.5} />
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-[60%] md:max-w-none pointer-events-none">
          <h1 className="font-bold text-gray-800 dark:text-gray-100 tracking-tight leading-none text-sm sm:text-lg truncate">
            HomeLab <span className="line-through text-gray-400 decoration-red-400 decoration-2 opacity-70 mx-1 hidden sm:inline">Packers</span> & Movers
          </h1>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5 opacity-70 hidden sm:block truncate px-8">
            {config.sourcePath || 'Source path not configured'}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 relative z-10">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-indigo-400 dark:hover:bg-gray-800 transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => void refreshFiles()}
            className="p-2 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-indigo-400 dark:hover:bg-gray-800 transition-colors"
            title="Refresh Source"
          >
            {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-indigo-400 dark:hover:bg-gray-800 transition-colors"
            title="Configure Paths"
          >
            <Settings2 size={18} />
          </button>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{sourceFiles.length}</span> <span className="hidden sm:inline text-gray-400 dark:text-gray-600 font-normal">items pending</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <div className="max-w-6xl mx-auto h-full flex flex-col gap-4">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
              <AlertCircle className="mt-0.5 flex-shrink-0" size={16} />
              <span>{error}</span>
            </div>
          )}

          {!sourceExists && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="mt-0.5 flex-shrink-0" size={16} />
              <span>The configured source folder does not exist yet. Open settings and point the app to a real download folder.</span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
            <section className="min-w-0">
              <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-stretch md:items-center z-10">
                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 text-sm shadow-sm dark:shadow-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 transition-all backdrop-blur-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
                  {FILTER_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all border shrink-0 ${
                        typeFilter === type
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 shadow-md dark:shadow-none'
                          : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col transition-colors">
                <div className="grid grid-cols-12 gap-2 sm:gap-4 p-4 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider backdrop-blur-sm sticky top-0 z-10 select-none">
                  <div className="col-span-2 sm:col-span-1 flex justify-center items-center">
                    <button
                      onClick={toggleSelectAll}
                      disabled={sortedFiles.length === 0}
                      className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                        areAllSelected || isIndeterminate
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500'
                      } ${sortedFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      title="Select All Filtered Files"
                    >
                      {areAllSelected && <CheckCircle2 size={14} className="text-white" />}
                      {isIndeterminate && <Minus size={14} className="text-white" />}
                    </button>
                  </div>
                  <div onClick={() => handleSort('name')} className="col-span-7 sm:col-span-5 md:col-span-5 flex items-center gap-1 cursor-pointer group hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Filename
                    <SortIndicator active={sortConfig.key === 'name'} direction={sortConfig.direction} />
                  </div>
                  <div onClick={() => handleSort('type')} className="hidden md:flex md:col-span-2 items-center gap-1 cursor-pointer group hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Type
                    <SortIndicator active={sortConfig.key === 'type'} direction={sortConfig.direction} />
                  </div>
                  <div onClick={() => handleSort('date')} className="hidden sm:flex sm:col-span-3 md:col-span-2 items-center gap-1 cursor-pointer group hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Date
                    <SortIndicator active={sortConfig.key === 'date'} direction={sortConfig.direction} />
                  </div>
                  <div onClick={() => handleSort('size')} className="col-span-3 sm:col-span-3 md:col-span-2 flex items-center justify-end gap-1 cursor-pointer group hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Size
                    <SortIndicator active={sortConfig.key === 'size'} direction={sortConfig.direction} />
                  </div>
                </div>

                <div className="divide-y divide-gray-50 dark:divide-gray-800 overflow-y-auto flex-1 min-h-[420px]">
                  {sortedFiles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 min-h-[300px] px-6 text-center">
                      <CheckCircle2 size={64} className="mb-4" />
                      <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">No files matched this view</div>
                      <div className="text-sm mt-2 text-gray-400 dark:text-gray-500 max-w-md">
                        {sourceExists ? 'Refresh the source folder or change filters to bring files back into view.' : 'Set a valid source path in settings to start scanning real files.'}
                      </div>
                    </div>
                  ) : (
                    sortedFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => toggleFileSelection(file.id)}
                        className={`grid grid-cols-12 gap-2 sm:gap-4 p-4 items-center cursor-pointer transition-colors duration-150 group ${
                          selectedFiles.has(file.id) ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="col-span-2 sm:col-span-1 flex justify-center">
                          <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                            selectedFiles.has(file.id)
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-indigo-300 dark:group-hover:border-indigo-500'
                          }`}>
                            {selectedFiles.has(file.id) && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                        </div>
                        <div className="col-span-7 sm:col-span-5 md:col-span-5 flex items-center gap-3 overflow-hidden">
                          <FileIcon type={file.type} className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className={`truncate block font-medium transition-colors text-sm sm:text-base ${selectedFiles.has(file.id) ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-200'}`}>
                              {file.name}
                            </span>
                            <span className="hidden lg:block truncate text-xs text-gray-400 dark:text-gray-500">{file.path}</span>
                          </div>
                        </div>
                        <div className="hidden md:flex md:col-span-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 capitalize border border-gray-200 dark:border-gray-700">
                            {file.type}
                          </span>
                        </div>
                        <div className="hidden sm:flex sm:col-span-3 md:col-span-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {file.date}
                        </div>
                        <div className="col-span-3 sm:col-span-3 md:col-span-2 text-right text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {file.size}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal size={16} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Current Session</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-1">Source Folder</div>
                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300 break-all bg-gray-50 dark:bg-gray-800 px-2.5 py-2 rounded-lg border border-gray-100 dark:border-gray-700">{config.sourcePath || 'Not configured'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-1">Destination</div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      {selectedDest ? getDestIcon(selectedDest.icon, 'w-4 h-4') : <FolderOutput size={16} />}
                      <span className="font-medium">{selectedDest?.name || 'No destination selected'}</span>
                    </div>
                    <div className="font-mono text-xs text-gray-500 dark:text-gray-400 break-all mt-2 bg-gray-50 dark:bg-gray-800 px-2.5 py-2 rounded-lg border border-gray-100 dark:border-gray-700">
                      {selectedDest?.path || 'No destination configured'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 p-3">
                      <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Selected</div>
                      <div className="mt-1 text-lg font-semibold text-gray-700 dark:text-gray-100">{selectedFiles.size}</div>
                    </div>
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 p-3">
                      <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Total Size</div>
                      <div className="mt-1 text-lg font-semibold text-gray-700 dark:text-gray-100">{formatSize(totalSelectedBytes)}</div>
                    </div>
                  </div>
                  {latestLog && (
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 p-3">
                      <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-1">Latest Log</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1">{activePersona.name}:</span>
                        {latestLog.message}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <History size={16} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Activity</span>
                </div>
                <div className="space-y-3 max-h-[360px] overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No jobs yet. Your first move will show up here.</div>
                  ) : (
                    history.slice(0, 6).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">{entry.destinationName}</span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${
                            entry.status === 'success'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : entry.status === 'partial'
                                ? 'text-amber-600 dark:text-amber-400'
                                : entry.status === 'reverted'
                                  ? 'text-sky-600 dark:text-sky-400'
                                  : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{entry.summary}</div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        {entry.revertedAt && (
                          <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-1">
                            Reverted on {new Date(entry.revertedAt).toLocaleString()}
                          </div>
                        )}
                        {isRevertible(entry) && (
                          <button
                            onClick={() => openRevertModal(entry)}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                          >
                            <RotateCcw size={12} />
                            Revert Move
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <footer className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-30 relative transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
            <div className="flex flex-col w-full sm:w-auto">
              <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-1.5 ml-1">Destination Target</label>
              <div className="relative group w-full sm:w-auto">
                <select
                  value={selectedDest?.id || ''}
                  onChange={(event) => setSelectedDestId(event.target.value)}
                  className="appearance-none w-full sm:w-72 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 pl-11 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium cursor-pointer transition-shadow hover:border-gray-300 dark:hover:border-gray-600 text-sm sm:text-base"
                >
                  {config.destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name}
                    </option>
                  ))}
                </select>
                <div className="absolute left-3.5 top-3.5 text-gray-500 dark:text-gray-400">
                  {selectedDest ? getDestIcon(selectedDest.icon, 'w-5 h-5') : <FolderOutput size={18} />}
                </div>
                <div className="absolute right-3.5 top-3.5 text-gray-400 dark:text-gray-500 pointer-events-none">
                  <FolderOutput size={18} />
                </div>
              </div>
            </div>
            <div className="hidden md:block h-10 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="hidden md:flex flex-col justify-center">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">System Path</span>
              <span className="text-sm font-mono text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">{selectedDest?.path || 'No destination path'}</span>
            </div>
          </div>

          <button
            onClick={() => void initiateMove()}
            disabled={selectedFiles.size === 0 || isProcessing || isPreviewLoading || !selectedDest}
            className={`w-full md:w-auto flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl font-semibold shadow-lg transition-all transform ${
              selectedFiles.size > 0
                ? 'bg-gray-900 dark:bg-indigo-600 text-white hover:bg-black dark:hover:bg-indigo-500 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed shadow-none'
            }`}
          >
            {isPreviewLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Preparing Preview...</span>
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Move Selection {selectedFiles.size > 0 && `(${selectedFiles.size})`}</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </footer>

      {showConfirmModal && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Confirm Transfer</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dry-run preview before the real move</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-2 block">Destination</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-300">
                    {getDestIcon(preview.destination.icon, 'w-5 h-5')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{preview.destination.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{preview.destination.path}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {preview.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 text-sm py-3 px-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-700 dark:text-gray-200 truncate">{item.fileName}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate mt-1">{item.destinationPath}</div>
                    </div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${item.conflict ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {item.conflict ? 'rename on move' : 'ready'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Size</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">{formatSize(preview.totalBytes)}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void processMoveFiles()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-indigo-600 text-white font-semibold hover:bg-black dark:hover:bg-indigo-500 transition-colors shadow-lg shadow-gray-200 dark:shadow-none flex items-center justify-center gap-2 text-sm"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  <span>Confirm Move</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl z-10 overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Homelab Paths</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Point the app at your real source and destination folders</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-2 block">Source Folder</label>
                <input
                  type="text"
                  value={settingsDraft.sourcePath}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, sourcePath: event.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider block">Destinations</label>
                </div>
                {settingsDraft.destinations.map((destination, index) => (
                  <div key={destination.id || index} className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-800/40">
                    <input
                      type="text"
                      value={destination.name}
                      onChange={(event) => updateDestinationDraft(index, 'name', event.target.value)}
                      className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={destination.path}
                      onChange={(event) => updateDestinationDraft(index, 'path', event.target.value)}
                      className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSaveConfig()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-indigo-600 text-white font-semibold hover:bg-black dark:hover:bg-indigo-500 transition-colors shadow-lg shadow-gray-200 dark:shadow-none flex items-center justify-center gap-2 text-sm"
              >
                {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Paths</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showRevertModal && revertTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRevertModal(false)} />
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Confirm Revert</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">This will move the files back toward their original source folder</p>
                </div>
              </div>
              <button
                onClick={() => setShowRevertModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {revertTarget.items
                .filter((item) => item.status === 'moved' || item.status === 'renamed')
                .map((item) => (
                  <div key={`${revertTarget.id}-${item.destinationPath}`} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                    <div className="font-medium text-sm text-gray-700 dark:text-gray-200">{item.fileName}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate mt-1">{item.destinationPath}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate mt-1">{item.sourcePath}</div>
                  </div>
                ))}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
              <button
                onClick={() => setShowRevertModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRevertMove()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-indigo-600 text-white font-semibold hover:bg-black dark:hover:bg-indigo-500 transition-colors shadow-lg shadow-gray-200 dark:shadow-none flex items-center justify-center gap-2 text-sm"
              >
                {isReverting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                <span>Confirm Revert</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
