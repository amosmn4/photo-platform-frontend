# PhotoDrop — Frontend

React + TypeScript (Vite) client. Two audiences, one app:

- **Photographer dashboard** (`/`, `/events/:eventId`) — create events, bulk
  upload thousands of photos with live progress, issue/revoke QR codes,
  browse the processed gallery.
- **Public gallery** (`/g/:token`) — what a scanned QR code opens. No login.
  Infinite-scroll photo grid, "find my photos by time," lightbox preview,
  original-quality download.

The app name shown in the UI is read from `VITE_APP_NAME` in `.env` — change
it there, not in code. (Backend setup/commands live in `backend/DEPLOYMENT.md`;
API reference in `backend/API.md`.)

---

## 1. Prerequisites

- Node.js >= 20
- The backend API running (see `../backend/DEPLOYMENT.md`) — this app talks
  to it over HTTP, nothing works standalone.

## 2. Setup

```bash
cd frontend
cp .env.example .env
npm install
```

Edit `.env` if your backend isn't on the default `http://localhost:4000/api`.

## 3. Run in development

```bash
npm run dev
```

Opens at `http://localhost:5173`. Register a photographer account, create an
event, and the "QR & access" tab gives you a real scannable QR pointing at
`http://localhost:5173/g/<token>` — open it in another tab/device to see the
public gallery exactly as a customer would.

## 4. Type-check / lint

```bash
npm run typecheck
npm run lint
```

## 5. Build for production

```bash
npm run build     # outputs static assets to dist/
npm run preview   # serve the production build locally, for a final check
```

`dist/` is a static site — deploy it to any static host (Vercel, Netlify,
S3+CloudFront, nginx). Set `VITE_API_BASE_URL` to your production backend's
public URL at build time (Vite inlines `VITE_*` vars at build, not runtime —
rebuild if the API URL changes).

## 6. UI/performance practices this app follows

- **Cursor-based infinite scroll**, not numbered pages — matches the
  backend's keyset-paginated endpoints, stays fast at 20,000+ photos.
  Implementation: `src/hooks/useGallery.ts` + `src/hooks/useInfiniteScrollTrigger.ts`.
- **Lazy-loaded thumbnails**: the grid (`src/components/PhotoThumbnail.tsx`)
  requests only the 320px thumbnail variant, uses native `loading="lazy"`,
  and reserves layout space via `aspect-ratio` so nothing jumps as images
  pop in.
- **Progressive image quality in the lightbox**
  (`src/components/Lightbox.tsx`): medium (800px) shows immediately, large
  (1920px) cross-fades in once loaded. The original file is fetched only on
  explicit download, via a short-lived signed URL, never for viewing.
- **Direct-to-storage upload** (`src/components/UploadManager.tsx`): files
  PUT straight to the presigned S3/MinIO URL the backend hands out, never
  through this app's own server, with bounded concurrency (4 parallel
  uploads) and a live per-batch progress bar.
- **Client-side SHA-256 checksums** (`src/utils/checksum.ts`) sent with each
  upload confirmation, so retried/duplicate uploads are naturally
  deduplicated by the backend's unique constraint.

## 7. Project layout

```
src/
├── api/          typed fetch wrappers, one module per backend resource
├── components/   PhotoGrid, PhotoThumbnail, Lightbox, UploadManager, QRCard, Navbar
├── hooks/        useAuth, useGallery (pagination state), useInfiniteScrollTrigger
├── pages/        LoginPage, RegisterPage, DashboardPage, EventDetailPage, PublicGalleryPage
├── types/        DTOs mirroring backend/src/types
├── utils/        checksum, formatting helpers
├── config.ts     single place import.meta.env is read
└── App.tsx       routes
```
Let's check that first. Run:

cd /projects/apps/photodrop/frontend
sudo ls -la dist

Then:

sudo cat dist/.htaccess
If .htaccess does not exist

Create it:

sudo nano /projects/apps/photodrop/frontend/dist/.htaccess

Put this inside:

RewriteEngine On

# Don't rewrite existing files or directories
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Send all other routes to React
RewriteRule ^ index.html [L]

Save with:

Ctrl + O
Enter
Ctrl + X

Then verify Apache configuration:

sudo apache2ctl configtest

Expected:

Syntax OK

Then reload:

sudo systemctl reload apache2
Test immediately

First:

curl -I https://photodrop.stawisociallab.com/

Then: