import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { config } from '../config';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-hairline bg-paper-raised">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-display text-lg font-semibold tracking-tight text-ink">
          {config.appName}
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
