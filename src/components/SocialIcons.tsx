import React from 'react';

type IconProps = { className?: string };

// Minimal filled brand marks — same reasoning as DownloadIcon: no icon library is used anywhere in the app.
function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 22v-8h2.7l.4-3.2H14V8.7c0-.9.3-1.6 1.6-1.6h1.7V4.2C17 4.1 15.9 4 14.7 4 12 4 10.2 5.6 10.2 8.4v2.4H7.5V14h2.7v8h3.8Z" />
    </svg>
  );
}

function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 4l7 8.5L4.3 20H7l5.4-6.2L17 20h3l-7.3-8.9L19.4 4H17l-5 5.8L7.7 4H4Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth={1.8} />
      <circle cx="7.2" cy="8" r="1.3" />
      <path d="M6.2 10.8h2v7h-2z" />
      <path d="M10.6 10.8h1.9v1c.5-.8 1.3-1.2 2.3-1.2 1.8 0 2.9 1.1 2.9 3.2v4h-2v-3.6c0-1-.4-1.6-1.3-1.6-.9 0-1.5.6-1.7 1.4-.1.2-.1.5-.1.8v3h-2v-7Z" />
    </svg>
  );
}

function YoutubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="4" />
      <path d="M10.5 9.8v4.4l4-2.2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TiktokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 3h2.2c.2 1.6 1.3 2.9 3 3.2v2.2c-1.1 0-2.2-.3-3.1-.9v5.7a5 5 0 1 1-4.6-5v2.3a2.7 2.7 0 1 0 2.5 2.7V3Z" />
    </svg>
  );
}

export const SOCIAL_ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  twitter: XIcon,
  x: XIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  tiktok: TiktokIcon,
};
