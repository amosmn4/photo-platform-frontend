import React, { useState } from 'react';
import { AccessTokenSummary } from '../types';

interface Props {
  label: string;
  qrDataUrl: string;
  galleryUrl: string;
  token: AccessTokenSummary;
  onRevoke?: () => void;
}

export function QRCard({ label, qrDataUrl, galleryUrl, token, onRevoke }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(galleryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={copyLink} className="btn-secondary text-xs">
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <a href={qrDataUrl} download={`${label}.png`} className="btn-secondary text-xs">
            Download QR
          </a>
          {onRevoke && token.status === 'active' && (
            <button type="button" onClick={onRevoke} className="btn-ghost text-xs text-mark">
              Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
