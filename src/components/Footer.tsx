import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { config } from '../config';
import { settingsApi } from '../api/settings';
import { SiteSettings } from '../types';
import { SOCIAL_ICONS } from './SocialIcons';

const QUICK_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Sign in', to: '/login' },
  { label: 'Create account', to: '/register' },
];

// Admin-managed logo, tagline, social links, and contact details; quick links and copyright stay static.
export function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    settingsApi
      .get()
      .then((res) => setSettings(res.settings))
      .catch(() => setSettings(null));
  }, []);

  const socialEntries = settings ? Object.entries(settings.socialLinks) : [];
  const hasContact = settings?.contactEmail || settings?.contactPhone || settings?.contactAddress;

  return (
    <footer className="border-t border-hairline bg-paper-raised">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt={config.appName} className="h-8 w-auto" />
            ) : (
              <span className="font-display text-lg font-semibold text-ink">{config.appName}</span>
            )}
            {settings?.tagline && <p className="mt-2 max-w-xs text-sm text-ink-faint">{settings.tagline}</p>}
            {socialEntries.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                {socialEntries.map(([platform, url]) => {
                  const Icon = SOCIAL_ICONS[platform.toLowerCase()];
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={platform}
                      title={platform}
                      className="text-ink-faint transition-colors hover:text-ink"
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : <span className="text-xs capitalize">{platform}</span>}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="frame-tag mb-3 text-ink-faint">Quick links</p>
            <ul className="space-y-2 text-sm">
              {QUICK_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-ink-soft hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="frame-tag mb-3 text-ink-faint">Contact</p>
            {hasContact ? (
              <ul className="space-y-2 text-sm text-ink-soft">
                {settings?.contactEmail && (
                  <li>
                    <a href={`mailto:${settings.contactEmail}`} className="hover:text-ink">
                      {settings.contactEmail}
                    </a>
                  </li>
                )}
                {settings?.contactPhone && (
                  <li>
                    <a href={`tel:${settings.contactPhone}`} className="hover:text-ink">
                      {settings.contactPhone}
                    </a>
                  </li>
                )}
                {settings?.contactAddress && <li>{settings.contactAddress}</li>}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">Contact details coming soon.</p>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-hairline pt-6 text-center text-xs text-ink-faint">
          © {new Date().getFullYear()} {config.appName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
