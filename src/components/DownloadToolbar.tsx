import React from 'react';
import { DownloadArchive } from '../types';
import { formatBytes } from '../utils/format';
import { DownloadIcon } from './DownloadIcon';

interface ArchiveStatusProps {
  archive: DownloadArchive | null;
  error: string | null;
  starting: boolean;
  maxFiles: number;
  onSave: () => void;
  onDismiss: () => void;
}

export const isArchiveActive = (p: Pick<ArchiveStatusProps, 'archive' | 'error' | 'starting'>) =>
  Boolean(p.error || p.starting || p.archive);

// A zip's lifecycle as one line: preparing (with progress) → ready to save, or what went wrong.
export function ArchiveStatus({ archive, error, starting, maxFiles, onSave, onDismiss }: ArchiveStatusProps) {
  if (error) {
    return (
      <>
        <p className="min-w-0 flex-1 text-sm text-mark">{error}</p>
        <button type="button" className="btn-ghost text-sm" onClick={onDismiss}>
          OK
        </button>
      </>
    );
  }
  if (starting || archive?.status === 'queued' || archive?.status === 'building') {
    const done = archive?.filesDone ?? 0;
    const total = archive?.fileCount ?? 0;
    const fraction = total ? done / total : 0;
    return (
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-sm text-ink">
          Preparing your download…{total > 0 && <span className="text-ink-faint"> {done} of {total}</span>}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div className="h-full bg-mark transition-all duration-500" style={{ width: `${Math.max(4, fraction * 100)}%` }} />
        </div>
      </div>
    );
  }
  if (archive?.status === 'ready') {
    return (
      <>
        <p className="min-w-0 flex-1 text-sm text-ink">
          Your zip is ready · {archive.fileCount} files{archive.archiveBytes ? ` · ${formatBytes(archive.archiveBytes)}` : ''}
          {archive.truncated && (
            <span className="block text-xs text-ink-faint">The newest {maxFiles}. Select photos to download others.</span>
          )}
        </p>
        <button type="button" className="btn-primary text-sm" onClick={onSave}>
          <DownloadIcon className="h-4 w-4" />
          Save zip
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={onDismiss}>
          Done
        </button>
      </>
    );
  }
  return null;
}

interface ToolbarProps extends ArchiveStatusProps {
  selecting: boolean;
  selectedCount: number;
  // Says what tapping it lets you pick, e.g. "Select photos to download".
  selectLabel: string;
  allowDownloadAll: boolean;
  totalInView?: number;
  onStartSelecting: () => void;
  onCancelSelecting: () => void;
  onDownloadSelected: () => void;
  onDownloadAll: () => void;
}

// One strip above the gallery grid: Select / Download all, then the selection count, then the zip's progress.
export function DownloadToolbar(props: ToolbarProps) {
  let content: React.ReactNode;
  if (isArchiveActive(props)) {
    content = <ArchiveStatus {...props} />;
  } else if (props.selecting) {
    const atLimit = props.selectedCount >= props.maxFiles;
    content = (
      <>
        <p className="min-w-0 flex-1 text-sm text-ink">
          {props.selectedCount === 0 ? 'Tap to choose what to download' : `${props.selectedCount} selected`}
          {atLimit && <span className="text-ink-faint"> · {props.maxFiles} max</span>}
        </p>
        <button type="button" className="btn-primary text-sm" disabled={props.selectedCount === 0} onClick={props.onDownloadSelected}>
          <DownloadIcon className="h-4 w-4" />
          Download
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={props.onCancelSelecting}>
          Cancel
        </button>
      </>
    );
  } else {
    // Easiest route first — one tap for everything here, then the pick-your-own route.
    content = (
      <>
        {props.allowDownloadAll && (
          <button type="button" className="btn-secondary text-sm" onClick={props.onDownloadAll}>
            <DownloadIcon className="h-4 w-4" />
            {props.totalInView !== undefined && props.totalInView > props.maxFiles ? `Download newest ${props.maxFiles}` : 'Download all'}
          </button>
        )}
        <button type="button" className="btn-secondary text-sm" onClick={props.onStartSelecting}>
          {props.selectLabel}
        </button>
        <span className="min-w-0 flex-1" />
      </>
    );
  }

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-4 flex min-h-[52px] flex-wrap items-center gap-2 border-b border-hairline bg-paper/95 px-4 py-2 backdrop-blur">
      {content}
    </div>
  );
}
