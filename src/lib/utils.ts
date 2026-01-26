import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateAnonymousUsername(): string {
  const adjectives = [
    'Silent', 'Mysterious', 'Curious', 'Brave', 'Gentle',
    'Bold', 'Quiet', 'Hidden', 'Secret', 'Whispered'
  ];
  const nouns = [
    'Whisper', 'Shadow', 'Spirit', 'Voice', 'Soul',
    'Heart', 'Dream', 'Thought', 'Echo', 'Mist'
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}${noun}#${num.toString().padStart(4, '0')}`;
}

export function formatDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return d.toLocaleDateString();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
