import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { adminApi } from '../api/admin';
import { settingsApi } from '../api/settings';
import { AdminAccount, SiteSettings } from '../types';
import { formatBytes } from '../utils/format';

type Tab = 'accounts' | 'settings' | 'docs';
const TABS: { id: Tab; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'settings', label: 'Site settings' },
  { id: 'docs', label: 'Docs' },
];
const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok'] as const;

// Static pages in public/docs — served as plain files, so the link works for anyone without signing in.
const DOCS = [
  {
    title: 'PhotoDrop at 10,000 Photos',
    description:
      'Guest uploads, moments, zip downloads and guest blocking, plus measured upload, download, stability and security results from the load tests.',
    path: '/docs/performance-report.html',
    updated: '15 Sep 2026',
  },
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('accounts');

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Admin</h1>
        <p className="text-sm text-ink-faint">Manage photographer accounts, site branding and shareable docs.</p>

        <nav className="mt-6 flex gap-1 border-b border-hairline">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'border-b-2 border-mark text-ink' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === 'accounts' && <AccountsTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'docs' && <DocsTab />}
        </div>
      </main>
    </div>
  );
}

function AccountsTab() {
  const [users, setUsers] = useState<AdminAccount[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    const res = await adminApi.listUsers(p);
    setUsers(res.users);
    setTotalPages(res.totalPages);
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  async function handleSuspendToggle(user: AdminAccount) {
    setError(null);
    setBusyId(user.id);
    try {
      const action = user.status === 'suspended' ? adminApi.reactivateUser : adminApi.suspendUser;
      const { user: updated } = await action(user.id);
      setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update account');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setBusyId(id);
    setConfirmingDeleteId(null);
    try {
      await adminApi.deleteUser(id);
      setUsers((prev) => prev?.filter((u) => u.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account');
    } finally {
      setBusyId(null);
    }
  }

  if (users === null) {
    return <div className="h-40 animate-pulse rounded-card bg-hairline/60" />;
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-mark">{error}</p>}

      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline py-24 text-center">
          <p className="font-display text-lg text-ink">No accounts yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline bg-paper text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3">Photographer</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Storage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{u.full_name}</p>
                    {u.business_name && <p className="text-xs text-ink-faint">{u.business_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatBytes(u.storage_used_bytes)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                        u.status === 'suspended' ? 'bg-mark-tint text-mark' : 'bg-ok-tint text-ok'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-faint">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        disabled={busyId === u.id}
                        onClick={() => handleSuspendToggle(u)}
                      >
                        {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs text-mark"
                        disabled={busyId === u.id}
                        onClick={() => setConfirmingDeleteId(u.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-ink-faint">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDeleteId !== null}
        title="Delete this account?"
        message="This permanently deletes the account and every event, photo, and access link it owns. This cannot be undone."
        confirmLabel="Delete permanently"
        onConfirm={() => confirmingDeleteId && handleDelete(confirmingDeleteId)}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [form, setForm] = useState({
    tagline: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    socialLinks: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await settingsApi.get();
    setSettings(res.settings);
    setForm({
      tagline: res.settings.tagline ?? '',
      contactEmail: res.settings.contactEmail ?? '',
      contactPhone: res.settings.contactPhone ?? '',
      contactAddress: res.settings.contactAddress ?? '',
      socialLinks: res.settings.socialLinks,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateSocial(platform: string, value: string) {
    setForm((f) => {
      const next = { ...f.socialLinks };
      if (value) next[platform] = value;
      else delete next[platform];
      return { ...f, socialLinks: next };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const { settings: updated } = await adminApi.updateSettings({
        tagline: form.tagline || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        contactAddress: form.contactAddress || null,
        socialLinks: form.socialLinks,
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoSelected(file: File | null) {
    if (!file) return;
    setError(null);
    setUploadingLogo(true);
    try {
      const { settings: updated } = await adminApi.uploadLogo(file);
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  if (!settings) {
    return <div className="h-64 animate-pulse rounded-card bg-hairline/60" />;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="card p-5">
        <p className="font-display text-base font-semibold text-ink">Logo</p>
        <p className="mt-1 text-sm text-ink-faint">Shown in the header and footer across the site.</p>
        <div className="mt-4 flex items-center gap-3">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Current logo" className="h-12 w-auto rounded bg-hairline/20 p-1" />
          ) : (
            <div className="flex h-12 w-24 items-center justify-center rounded-card bg-hairline/40 text-xs text-ink-faint">
              No logo
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleLogoSelected(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={uploadingLogo}
            onClick={() => logoInputRef.current?.click()}
          >
            {uploadingLogo ? 'Uploading…' : 'Upload new logo'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="card space-y-4 p-5">
        <p className="font-display text-base font-semibold text-ink">Footer content</p>

        <div>
          <label className="label" htmlFor="tagline">Tagline</label>
          <input
            id="tagline"
            className="input"
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="contactEmail">Contact email</label>
            <input
              id="contactEmail"
              type="email"
              className="input"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="contactPhone">Contact phone</label>
            <input
              id="contactPhone"
              className="input"
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="contactAddress">Address</label>
          <input
            id="contactAddress"
            className="input"
            value={form.contactAddress}
            onChange={(e) => setForm((f) => ({ ...f, contactAddress: e.target.value }))}
          />
        </div>

        <div>
          <p className="label mb-2">Social links</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform}>
                <label className="label capitalize" htmlFor={platform}>{platform}</label>
                <input
                  id={platform}
                  className="input"
                  placeholder={`https://${platform}.com/...`}
                  value={form.socialLinks[platform] ?? ''}
                  onChange={(e) => updateSocial(platform, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-mark">{error}</p>}
        {saved && <p className="text-sm text-ok">Saved.</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

function DocsTab() {
  const [copied, setCopied] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(DOCS[0]?.path ?? null);

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied((current) => (current === url ? null : current)), 1500);
  }

  async function shareLink(title: string, url: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // share sheet dismissed
      }
      return;
    }
    await copyLink(url);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-faint">
        Anyone with a doc's link can open it — no sign-in needed. Share it when someone asks how the platform performs.
      </p>

      {DOCS.map((doc) => {
        const url = `${window.location.origin}${doc.path}`;
        const inputId = `doc-link-${doc.path}`;
        return (
          <div key={doc.path} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold text-ink">{doc.title}</h3>
                <p className="mt-1 max-w-2xl text-sm text-ink-soft">{doc.description}</p>
                <p className="frame-tag mt-2 text-ink-faint">Updated {doc.updated}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={doc.path} target="_blank" rel="noopener" className="btn-primary text-sm">
                  Open
                </a>
                <button type="button" className="btn-secondary text-sm" onClick={() => copyLink(url)}>
                  {copied === url ? 'Copied' : 'Copy link'}
                </button>
                <button type="button" className="btn-secondary text-sm" onClick={() => shareLink(doc.title, url)}>
                  Share
                </button>
              </div>
            </div>

            <label className="label mt-4" htmlFor={inputId}>
              Share link
            </label>
            <input
              id={inputId}
              readOnly
              className="input font-mono text-xs"
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-ink-soft">Preview</span>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => setPreviewing((p) => (p === doc.path ? null : doc.path))}
              >
                {previewing === doc.path ? 'Hide preview' : 'Show preview'}
              </button>
            </div>
            {previewing === doc.path && (
              <iframe
                title={`${doc.title} preview`}
                src={doc.path}
                className="mt-2 h-[75vh] w-full rounded-card border border-hairline bg-paper-raised"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
