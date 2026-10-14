import React, { useState, useRef } from 'react';
import { Track } from '../../types/track';
import { formatLrcTimestamp } from '../../services/lyrics/lrcParser';
import { X, Clock, Save, FileText } from 'lucide-react';

interface LyricsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  currentTime: number;
  onSave: (trackId: string, lyrics: string) => void;
}

export const LyricsEditorModal: React.FC<LyricsEditorModalProps> = ({
  isOpen,
  onClose,
  track,
  currentTime,
  onSave,
}) => {
  const [content, setContent] = useState<string>(track?.lyrics || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (track) {
      setContent(track.lyrics || '');
    }
  }, [track]);

  if (!isOpen || !track) return null;

  const handleStampCurrentTime = () => {
    const timestampTag = formatLrcTimestamp(currentTime);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);

    const updated = before + timestampTag + ' ' + after;
    setContent(updated);

    // Set cursor right after timestamp
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + timestampTag.length + 1;
    }, 0);
  };

  const handleSave = () => {
    onSave(track.id, content);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-brand-400" />
            <div>
              <h3 className="font-semibold text-neutral-100 text-sm">Edit Lyrics</h3>
              <p className="text-xs text-neutral-400 truncate max-w-sm">
                {track.title} · {track.artist}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2.5 bg-neutral-950/60 border-b border-white/5 flex items-center justify-between text-xs text-neutral-400">
          <span>
            Use format <code className="text-brand-400">[mm:ss.xx] Lyric text</code> for synced lines.
          </span>

          <button
            onClick={handleStampCurrentTime}
            className="px-3 py-1.5 rounded bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 font-medium flex items-center gap-1.5 border border-brand-500/30 transition-colors"
            title="Insert timestamp at current cursor position"
          >
            <Clock size={13} />
            <span>Stamp Current Time ({formatLrcTimestamp(currentTime)})</span>
          </button>
        </div>

        {/* Text Area */}
        <div className="flex-1 p-5 min-h-[300px]">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="[00:00.00] Intro music&#10;[00:04.50] First verse begins here&#10;[00:10.00] Second line..."
            className="w-full h-full min-h-[320px] bg-neutral-950 border border-white/10 rounded-lg p-3 text-xs md:text-sm font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-brand-500/50 resize-none select-text"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between shrink-0 bg-neutral-950/40">
          <button
            onClick={() => setContent('')}
            className="px-3 py-1.5 rounded text-xs text-neutral-400 hover:text-rose-400 transition-colors"
          >
            Clear All
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-neutral-950 hover:bg-brand-400 flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Save size={14} />
              <span>Save Lyrics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
