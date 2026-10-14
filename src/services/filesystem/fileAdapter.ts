import { FileAdapter } from '../../types/adapters';
import { browserFileAdapter, BrowserFileAdapter } from './browserFileAdapter';
import { tauriFileAdapter } from './tauriFileAdapter';

export function getActiveFileAdapter(): FileAdapter {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    return tauriFileAdapter;
  }
  return browserFileAdapter;
}

export { browserFileAdapter, BrowserFileAdapter, tauriFileAdapter };
