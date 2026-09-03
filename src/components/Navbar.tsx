import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { config } from '../config';
import { settingsApi } from '../api/settings';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    settingsApi
      .get()
      .then((res) => setLogoUrl(res.settings.logoUrl))
      .catch(() => setLogoUrl(null));
  }, []);

  return (
    <header className="border-b border-hairline bg-paper-raised">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center">
          {logoUrl ? (
            <img src={logoUrl} alt={config.appName} className="h-7 w-auto" />
          ) : (
            <span className="font-display text-lg font-semibold tracking-tight text-ink">{config.appName}</span>
          )}
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-soft">{user.business_name || user.full_name}</span>
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
