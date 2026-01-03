import { FileItem, Persona, Destination } from './types';

export const INITIAL_SOURCE_FILES: FileItem[] = [
  { id: '1', name: 'Oppenheimer.2023.IMAX.2160p.mkv', type: 'video', size: '24.5 GB', date: '2023-10-24' },
  { id: '2', name: 'ubuntu-24.04-live-server-amd64.iso', type: 'archive', size: '2.1 GB', date: '2023-10-25' },
  { id: '3', name: 'The.Office.US.S04.1080p.WEB-DL.x265.zip', type: 'archive', size: '8.4 GB', date: '2023-10-26' },
  { id: '4', name: 'lofi_study_mix_2024.mp3', type: 'audio', size: '145 MB', date: '2023-10-26' },
  { id: '5', name: 'pihole_backup_config.json', type: 'code', size: '4 KB', date: '2023-10-27' },
  { id: '6', name: 'family_vacation_raw_photos.rar', type: 'archive', size: '4.2 GB', date: '2023-10-27' },
  { id: '7', name: 'Spider-Man.Across.the.Spider-Verse.2023.1080p.mp4', type: 'video', size: '4.8 GB', date: '2023-10-28' },
];

export const DESTINATIONS: Destination[] = [
  { id: 'movies', name: 'Jellyfin Movies', path: '/mnt/media/movies', icon: 'film' },
  { id: 'tv', name: 'Jellyfin TV Shows', path: '/mnt/media/tv_shows', icon: 'tv' },
  { id: 'music', name: 'Music Library', path: '/mnt/media/music', icon: 'music' },
  { id: 'isos', name: 'ISO Images', path: '/mnt/storage/isos', icon: 'disc' },
  { id: 'backups', name: 'Backups', path: '/mnt/backup/jdownloader', icon: 'hard-drive' },
];

export const PERSONAS: Persona[] = [
  {
    id: 'sysadmin',
    name: 'Gilfoyle',
    role: 'Cynical Sysadmin',
    avatar: 'https://picsum.photos/id/1/200/200',
    description: 'You are a brilliant but cynical system administrator. You manage this homelab. You judge users for their file organization habits. Be sarcastic but efficient.',
    themeColor: 'bg-zinc-800'
  },
  {
    id: 'butler',
    name: 'Alfred',
    role: 'Digital Butler',
    avatar: 'https://picsum.photos/id/1074/200/200',
    description: 'You are a polite, sophisticated butler organizing the master\'s digital estate. You are incredibly formal and helpful.',
    themeColor: 'bg-slate-600'
  },
  {
    id: 'gamer',
    name: 'Xx_Slayer_xX',
    role: 'Media Hoarder',
    avatar: 'https://picsum.photos/id/1062/200/200',
    description: 'You are an enthusiastic gamer and media collector. You use lots of gaming slang (pog, based, W). You love high bitrate content.',
    themeColor: 'bg-purple-600'
  }
];