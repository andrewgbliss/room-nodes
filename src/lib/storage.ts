import type { Universe } from '@/types/room';

const STORAGE_KEY = 'room-nodes-universe';

export function saveUniverseToStorage(universe: Universe): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(universe, null, 2));
  } catch (error) {
    console.error('Failed to save universe to localStorage:', error);
  }
}

export function loadUniverseFromStorage(): Universe | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as Universe;
  } catch (error) {
    console.error('Failed to load universe from localStorage:', error);
    return null;
  }
}

export function exportUniverseToJSON(universe: Universe): string {
  return JSON.stringify(universe, null, 2);
}

export function importUniverseFromJSON(json: string): Universe | null {
  try {
    return JSON.parse(json) as Universe;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

