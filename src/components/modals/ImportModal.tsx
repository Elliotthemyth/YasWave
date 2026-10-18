import React, { useState, useRef } from 'react';
import { browserFileAdapter } from '../../services/filesystem/browserFileAdapter';
import { APP_CONFIG } from '../../config/appConfig';
import {
  FolderDown,
  FileAudio,
  FolderTree,
  X,
  Info,
  CheckCircle2,
  HardDrive,
  Loader2,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: File[]) => Promise<unknown>;
  isImporting: boolean;
  importProgress: { current: number; total: number; fileName: string } | null;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onFilesSelected,
  isImporting,
  importProgress,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  if (!isOpen) return null;

  const handleSelectFiles = async () => {
    try {
      const files = await browserFileAdapter.selectFiles({ multiple: true });
      if (files.length > 0) {
        await onFilesSelected(files);
        onClose();
      }
    } catch (err) {
      console.error('File selection error:', err);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const files = await browserFileAdapter.selectFolder();
      if (files.length > 0) {
        await onFilesSelected(files);
        onClose();
      }
    } catch (err) {
      console.error('Folder selection error:', err);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const rawFiles = Array.from(e.dataTransfer.files);
      const audioFiles = rawFiles.filter((f) => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        return (
          APP_CONFIG.supportedExtensions.includes(ext) ||
          APP_CONFIG.supportedMimeTypes.some((t) => f.type.startsWith('audio/'))
        );
      });

      if (audioFiles.length > 0) {
        await onFilesSelected(audioFiles);
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <FolderDown size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-100 text-sm">Import Local Music</h3>
              <p className="text-xs text-neutral-400">Add songs with automated BPM & Key detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
              isDragging
                ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
                : 'border-white/15 bg-neutral-950/40 hover:border-white/30'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-brand-400 mb-3 shadow-inner">
              <FileAudio size={24} />
            </div>

            <p className="font-semibold text-neutral-200 text-sm mb-1">
              Drag & Drop your audio files here
            </p>
            <p className="text-xs text-neutral-400 max-w-xs mb-4">
              Supports MP3, FLAC, WAV, OGG, M4A, AAC, Opus, and WebM with embedded ID3 artwork.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectFiles}
                disabled={isImporting}
                className="px-4 py-2 rounded-lg bg-brand-500 text-neutral-950 font-semibold text-xs hover:bg-brand-400 flex items-center gap-2 shadow transition-all active:scale-95 disabled:opacity-50"
              >
                <FileAudio size={14} />
                <span>Select Files</span>
              </button>

              <button
                onClick={handleSelectFolder}
                disabled={isImporting}
                className="px-4 py-2 rounded-lg bg-white/10 text-white font-medium text-xs hover:bg-white/15 flex items-center gap-2 border border-white/10 transition-all active:scale-95 disabled:opacity-50"
              >
                <FolderTree size={14} />
                <span>Select Entire Folder</span>
              </button>
            </div>
          </div>

          {/* Import progress state */}
          {isImporting && importProgress && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-brand-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-brand-400 font-medium">
                  <Loader2 size={13} className="animate-spin" />
                  Analyzing audio, BPM, Key & metadata...
                </span>
                <span className="font-mono tabular-nums text-neutral-400">
                  {importProgress.current} / {importProgress.total}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all duration-150"
                  style={{
                    width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-neutral-400 truncate font-mono">
                {importProgress.fileName}
              </p>
            </div>
          )}

          {/* Architecture notice: Browser Preview vs Native Tauri 2 Linux Packaging */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-neutral-400 space-y-2">
            <div className="flex items-center gap-2 text-neutral-200 font-semibold">
              <HardDrive size={15} className="text-brand-400" />
              <span>Storage & Architecture Strategy</span>
            </div>
            <p className="leading-relaxed">
              • <strong className="text-neutral-200">Current Web Preview:</strong> Files are read
              locally and decoded entirely within your browser memory. Metadata is stored in
              IndexedDB.
            </p>
            <p className="leading-relaxed">
              • <strong className="text-neutral-200">Native Linux Desktop (Tauri 2):</strong> When
              packaged with Tauri 2, the app connects directly to the Linux filesystem via approved
              system dialogs and SQLite storage, preserving persistent paths across restarts.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950/60 border-t border-white/10 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-brand-400" />
            <span>Zero cloud uploads · 100% private & local playback</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
