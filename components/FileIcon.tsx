import React from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileCode2, 
  File, 
  Music2, 
  Archive, 
  Film, 
  Disc
} from 'lucide-react';

interface FileIconProps {
  type: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ type, className = "w-10 h-10" }) => {
  // Base styles for the container
  const containerClass = `flex items-center justify-center rounded-lg shrink-0 transition-transform hover:scale-105 ${className}`;
  
  // Standard props for the inner icon
  const iconProps = {
    size: "55%",
    strokeWidth: 2.5
  };

  switch (type) {
    case 'video':
      return (
        <div className={`${containerClass} bg-violet-100 text-violet-600`}>
          <Film {...iconProps} />
        </div>
      );
    case 'audio':
      return (
        <div className={`${containerClass} bg-pink-100 text-pink-600`}>
          <Music2 {...iconProps} />
        </div>
      );
    case 'image':
      return (
        <div className={`${containerClass} bg-sky-100 text-sky-600`}>
          <ImageIcon {...iconProps} />
        </div>
      );
    case 'archive':
      return (
        <div className={`${containerClass} bg-amber-100 text-amber-600`}>
          <Archive {...iconProps} />
        </div>
      );
    case 'code':
      return (
        <div className={`${containerClass} bg-slate-100 text-slate-600`}>
          <FileCode2 {...iconProps} />
        </div>
      );
    case 'pdf':
      return (
        <div className={`${containerClass} bg-rose-100 text-rose-600`}>
          <FileText {...iconProps} />
        </div>
      );
    case 'doc':
      return (
        <div className={`${containerClass} bg-blue-100 text-blue-600`}>
          <FileText {...iconProps} />
        </div>
      );
    case 'spreadsheet':
      return (
        <div className={`${containerClass} bg-emerald-100 text-emerald-600`}>
          <FileSpreadsheet {...iconProps} />
        </div>
      );
    case 'iso':
    case 'disc':
      return (
        <div className={`${containerClass} bg-zinc-100 text-zinc-600`}>
          <Disc {...iconProps} />
        </div>
      );
    default:
      return (
        <div className={`${containerClass} bg-gray-100 text-gray-500`}>
          <File {...iconProps} />
        </div>
      );
  }
};