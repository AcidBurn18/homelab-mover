import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Inbox, FolderOutput, CheckCircle2, Loader2, HardDrive, Film, Music, Tv, Disc, Terminal, Search, X, FileText, AlertCircle, Minus, ChevronUp, ChevronDown, Sun, Moon } from 'lucide-react';
import { FileItem, Persona, LogEntry, Destination } from './types';
import { INITIAL_SOURCE_FILES, PERSONAS, DESTINATIONS } from './constants';
import { generateMoveConfirmation } from './services/geminiService';
import { FileIcon } from './components/FileIcon';

// Helper to get icon component for destination
const getDestIcon = (iconName: string, className?: string) => {
  const props = { className };
  switch (iconName) {
    case 'film': return <Film {...props} />;
    case 'tv': return <Tv {...props} />;
    case 'music': return <Music {...props} />;
    case 'disc': return <Disc {...props} />;
    default: return <HardDrive {...props} />;
  }
};

const FILTER_TYPES = ['all', 'video', 'archive', 'audio', 'code', 'image', 'doc'];

// Size helpers
const parseSize = (sizeStr: string): number => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const regex = /^([\d.]+)\s*(B|KB|MB|GB|TB)$/i;
  const match = sizeStr.match(regex);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const index = units.indexOf(unit);
  return value * Math.pow(1024, index);
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

type SortKey = 'name' | 'type' | 'size' | 'date';
type SortDirection = 'asc' | 'desc';

export default function App() {
  const [sourceFiles, setSourceFiles] = useState<FileItem[]>(INITIAL_SOURCE_FILES);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  // Default to first persona, UI removed as requested
  const [activePersona] = useState<Persona>(PERSONAS[0]); 
  const [selectedDest, setSelectedDest] = useState<Destination>(DESTINATIONS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestLog, setLatestLog] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc'
  });

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleFileSelection = (id: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedFiles(newSelection);
  };

  const initiateMove = () => {
    if (selectedFiles.size === 0 || !selectedDest) return;
    setShowConfirmModal(true);
  };

  const processMoveFiles = async () => {
    setShowConfirmModal(false);
    setIsProcessing(true);
    const filesToMove = sourceFiles.filter(f => selectedFiles.has(f.id));
    
    // Process files
    for (const file of filesToMove) {
      // 1. Simulate Move Logic (Remove from Source)
      setSourceFiles(prev => prev.filter(f => f.id !== file.id));
      
      // 2. Generate AI Commentary
      const aiMessage = await generateMoveConfirmation(file.name, selectedDest.name, selectedDest.path, activePersona);
      
      // 3. Update Latest Log
      setLatestLog(aiMessage);
    }

    setSelectedFiles(new Set());
    setIsProcessing(false);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter Logic
  const filteredFiles = sourceFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || file.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Sort Logic
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let comparison = 0;
    switch (sortConfig.key) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = parseSize(a.size) - parseSize(b.size);
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

  // Select All Logic
  const areAllSelected = sortedFiles.length > 0 && sortedFiles.every(f => selectedFiles.has(f.id));
  const isIndeterminate = !areAllSelected && sortedFiles.some(f => selectedFiles.has(f.id));

  const toggleSelectAll = () => {
    const newSelection = new Set(selectedFiles);
    if (areAllSelected) {
      sortedFiles.forEach(f => newSelection.delete(f.id));
    } else {
      sortedFiles.forEach(f => newSelection.add(f.id));
    }
    setSelectedFiles(newSelection);
  };

  // Derived state for confirmation modal
  const selectedFilesList = sourceFiles.filter(f => selectedFiles.has(f.id));
  const totalSizeBytes = selectedFilesList.reduce((acc, f) => acc + parseSize(f.size), 0);
  const totalFormattedSize = formatSize(totalSizeBytes);

  const SortIndicator = ({ active, direction }: { active: boolean; direction: SortDirection }) => {
    return (
      <div className={`flex flex-col ml-1 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`}>
        <ChevronUp size={10} className={`-mb-1 ${active && direction === 'asc' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'}`} />
        <ChevronDown size={10} className={`${active && direction === 'desc' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'}`} />
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fc] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans overflow-hidden relative transition-colors duration-300">
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none mix-blend-multiply dark:mix-blend-overlay dark:opacity-[0.05]"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1558494949-ef526b0042a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.03
        }}
      />

      {/* HEADER */}
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
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5 opacity-70 hidden sm:block">/mnt/downloads/jd_completed</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 relative z-10">
             <button 
               onClick={() => setIsDarkMode(!isDarkMode)}
               className="p-2 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-indigo-400 dark:hover:bg-gray-800 transition-colors"
               title="Toggle Theme"
             >
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{sourceFiles.length}</span> <span className="hidden sm:inline text-gray-400 dark:text-gray-600 font-normal">items pending</span>
             </div>
             {latestLog && (
               <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-right-4 max-w-[200px] xl:max-w-md">
                  <Terminal size={12} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1">{activePersona.name}:</span>
                    {latestLog}
                  </span>
               </div>
             )}
          </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
              
              {/* Search and Filters Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-stretch md:items-center z-10">
                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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

                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 scrollbar-hide mask-linear-fade">
                  {FILTER_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`
                        px-4 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all border shrink-0
                        ${typeFilter === type 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 shadow-md dark:shadow-none' 
                          : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                      `}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* File List Table */}
              <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-800 overflow-hidden flex-1 flex flex-col transition-colors">
                  <div className="grid grid-cols-12 gap-2 sm:gap-4 p-4 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider backdrop-blur-sm sticky top-0 z-10 select-none">
                      <div className="col-span-2 sm:col-span-1 flex justify-center items-center">
                        <button 
                           onClick={toggleSelectAll}
                           disabled={sortedFiles.length === 0}
                           className={`
                              w-5 h-5 rounded border transition-all flex items-center justify-center
                              ${areAllSelected || isIndeterminate 
                                ? 'bg-indigo-600 border-indigo-600' 
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500'}
                              ${sortedFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                           `}
                           title="Select All Filtered Files"
                        >
                           {areAllSelected && <CheckCircle2 size={14} className="text-white" />}
                           {isIndeterminate && <Minus size={14} className="text-white" />}
                        </button>
                      </div>
                      
                      {/* Name Column Header */}
                      <div 
                        onClick={() => handleSort('name')}
                        className="col-span-7 sm:col-span-5 md:col-span-5 flex items-center gap-1 cursor-pointer group hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        Filename
                        <SortIndicator active={sortConfig.key === 'name'} direction={sortConfig.direction} />
                      </div>

                      {/* Type Column Header */}
                      <div 
                        onClick={() => handleSort('type')}
                        className="hidden md:flex md:col-span-2 items-center gap-1 cursor-pointer group hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        Type
                        <SortIndicator active={sortConfig.key === 'type'} direction={sortConfig.direction} />
                      </div>

                      {/* Date Column Header */}
                      <div 
                        onClick={() => handleSort('date')}
                        className="hidden sm:flex sm:col-span-3 md:col-span-2 flex items-center gap-1 cursor-pointer group hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        Date
                        <SortIndicator active={sortConfig.key === 'date'} direction={sortConfig.direction} />
                      </div>

                      {/* Size Column Header */}
                      <div 
                        onClick={() => handleSort('size')}
                        className="col-span-3 sm:col-span-3 md:col-span-2 flex items-center justify-end gap-1 cursor-pointer group hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        Size
                        <SortIndicator active={sortConfig.key === 'size'} direction={sortConfig.direction} />
                      </div>
                  </div>
                  
                  <div className="divide-y divide-gray-50 dark:divide-gray-800 overflow-y-auto flex-1">
                      {sourceFiles.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 min-h-[300px]">
                              <CheckCircle2 size={64} className="mb-4 text-gray-100 dark:text-gray-800" />
                              <p className="text-xl font-medium text-gray-400 dark:text-gray-600">All Clear</p>
                              <p className="text-sm dark:text-gray-600">No files left in ingest folder.</p>
                           </div>
                      ) : sortedFiles.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 min-h-[300px]">
                              <Search size={48} className="mb-4 text-gray-100 dark:text-gray-800" />
                              <p className="text-lg font-medium text-gray-400 dark:text-gray-600">No matches found</p>
                              <p className="text-sm text-gray-400 dark:text-gray-600 mb-4">No files match your current filters.</p>
                              <button 
                                onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
                                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                              >
                                Clear all filters
                              </button>
                           </div>
                      ) : (
                          sortedFiles.map(file => (
                              <div 
                                  key={file.id}
                                  onClick={() => toggleFileSelection(file.id)}
                                  className={`
                                      grid grid-cols-12 gap-2 sm:gap-4 p-4 items-center cursor-pointer transition-colors duration-150 group
                                      ${selectedFiles.has(file.id) 
                                        ? 'bg-indigo-50/60 dark:bg-indigo-900/20' 
                                        : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'}
                                  `}
                              >
                                  <div className="col-span-2 sm:col-span-1 flex justify-center">
                                      <div className={`
                                          w-5 h-5 rounded border transition-all flex items-center justify-center
                                          ${selectedFiles.has(file.id) 
                                            ? 'bg-indigo-600 border-indigo-600' 
                                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-indigo-300 dark:group-hover:border-indigo-500'}
                                      `}>
                                          {selectedFiles.has(file.id) && <CheckCircle2 size={14} className="text-white" />}
                                      </div>
                                  </div>
                                  <div className="col-span-7 sm:col-span-5 md:col-span-5 flex items-center gap-3 overflow-hidden">
                                      <FileIcon type={file.type} className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" />
                                      <span className={`truncate font-medium transition-colors text-sm sm:text-base ${selectedFiles.has(file.id) ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-200'}`}>
                                          {file.name}
                                      </span>
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

          </div>
      </main>

      {/* BOTTOM ACTION BAR */}
      <footer className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-30 relative transition-colors">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
              
              <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
                  <div className="flex flex-col w-full sm:w-auto">
                      <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-1.5 ml-1">Destination Target</label>
                      <div className="relative group w-full sm:w-auto">
                          <select 
                              value={selectedDest.id}
                              onChange={(e) => setSelectedDest(DESTINATIONS.find(d => d.id === e.target.value) || DESTINATIONS[0])}
                              className="appearance-none w-full sm:w-72 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 pl-11 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium cursor-pointer transition-shadow hover:border-gray-300 dark:hover:border-gray-600 text-sm sm:text-base"
                          >
                              {DESTINATIONS.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                          </select>
                          <div className="absolute left-3.5 top-3.5 text-gray-500 dark:text-gray-400">
                              {getDestIcon(selectedDest.icon, "w-5 h-5")}
                          </div>
                          <div className="absolute right-3.5 top-3.5 text-gray-400 dark:text-gray-500 pointer-events-none">
                              <FolderOutput size={18} />
                          </div>
                      </div>
                  </div>
                  
                  <div className="hidden md:block h-10 w-px bg-gray-200 dark:bg-gray-700"></div>
                  
                  <div className="hidden md:flex flex-col justify-center">
                       <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">System Path</span>
                       <span className="text-sm font-mono text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">{selectedDest.path}/</span>
                  </div>
              </div>

              <button 
                  onClick={initiateMove}
                  disabled={selectedFiles.size === 0 || isProcessing}
                  className={`
                      w-full md:w-auto flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl font-semibold shadow-lg transition-all transform
                      ${selectedFiles.size > 0 
                          ? 'bg-gray-900 dark:bg-indigo-600 text-white hover:bg-black dark:hover:bg-indigo-500 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed shadow-none'}
                  `}
              >
                  {isProcessing ? (
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

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Confirm Transfer</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Please review your selection</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              
              <div className="mb-6">
                <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-2 block">Destination</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-300">
                    {getDestIcon(selectedDest.icon, "w-5 h-5")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{selectedDest.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{selectedDest.path}/</div>
                  </div>
                </div>
              </div>

              <div>
                 <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Files Selected ({selectedFilesList.length})</label>
                 </div>
                 <div className="space-y-2">
                    {selectedFilesList.map(file => (
                      <div key={file.id} className="flex items-center justify-between text-sm py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                        <div className="flex items-center gap-3 overflow-hidden mr-4">
                           <FileIcon type={file.type} className="w-8 h-8 flex-shrink-0" />
                           <span className="truncate text-gray-700 dark:text-gray-300 font-medium">{file.name}</span>
                        </div>
                        <span className="text-gray-400 dark:text-gray-500 font-mono text-xs whitespace-nowrap">{file.size}</span>
                      </div>
                    ))}
                 </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 space-y-4">
              <div className="flex items-center justify-between px-2">
                 <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Size</span>
                 <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">{totalFormattedSize}</span>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={processMoveFiles}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-indigo-600 text-white font-semibold hover:bg-black dark:hover:bg-indigo-500 transition-colors shadow-lg shadow-gray-200 dark:shadow-none flex items-center justify-center gap-2 text-sm"
                >
                  <span>Confirm Move</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}