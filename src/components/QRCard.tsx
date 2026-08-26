import React, { useState } from 'react';
import { AccessTokenSummary } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  label: string;
  qrDataUrl: string;
  galleryUrl: string;
  token: AccessTokenSummary;
  onRevoke?: () => void;
  onDelete?: () => void;
}

export function QRCard({ label, qrDataUrl, galleryUrl, token, onRevoke, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(galleryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: label, url: galleryUrl });
      } catch {
        // user dismissed the share sheet — not an error
      }
      return;
    }
    // No Web Share API (most desktop browsers) — fall back to clipboard.
    await navigator.clipboard.writeText(galleryUrl);
    setShared(true);
    setTimeout(() => setShared(false), 1500);
  }

  function confirmDelete() {
    setConfirmingDelete(false);
    onDelete?.();
  }

  return (
    <div className="card flex gap-4 p-4">
      <img src={qrDataUrl} alt={`QR code for ${label}`} className="h-28 w-28 shrink-0 rounded bg-white p-1.5" />
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="font-display text-base font-semibold text-ink">{label}</p>
          <p className="frame-tag mt-1 truncate text-ink-faint">{galleryUrl}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                token.status === 'active' ? 'bg-ok-tint text-ok' : 'bg-mark-tint text-mark'
              }`}
            >
              {token.status}
            </span>
            <span className="frame-tag text-ink-faint">{token.use_count} scans</span>
            {token.expires_at && (
              <span className="frame-tag text-ink-faint">
                expires {new Date(token.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={copyLink} className="btn-secondary text-xs">
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button type="button" onClick={shareLink} className="btn-secondary text-xs">
            {shared ? 'Copied' : 'Share'}
          </button>
          <a href={qrDataUrl} download={`${label}.png`} className="btn-secondary text-xs">
            Download QR
          </a>
          {onRevoke && token.status === 'active' && (
            <button type="button" onClick={onRevoke} className="btn-ghost text-xs text-mark">
              Revoke
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={() => setConfirmingDelete(true)} className="btn-ghost text-xs text-mark">
              Delete
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete "${label}"?`}
        message="This cannot be undone — the QR code will stop working immediately."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
