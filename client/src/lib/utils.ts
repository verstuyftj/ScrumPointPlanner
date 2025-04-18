import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a random session ID (6 characters, uppercase)
export const generateSessionId = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Format date and time
export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Get initials from name
export const getInitials = (name: string): string => {
  if (!name) return '';
  
  const parts = name.split(' ');
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Calculate consensus level based on votes
export const calculateConsensus = (votes: string[]): string => {
  if (!votes.length) return 'No votes';
  
  const uniqueVotes = new Set(votes).size;
  const consensusRatio = uniqueVotes / votes.length;
  
  if (consensusRatio <= 0.2) return 'Strong';
  if (consensusRatio <= 0.4) return 'Moderate';
  return 'Weak';
};
