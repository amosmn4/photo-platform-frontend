export interface PublicUser {
  id: string;
  email: string;
  full_name: string;
  business_name: string | null;
  role: 'photographer' | 'admin' | 'staff';
  storage_used_bytes: string;
  storage_quota_bytes: string;
}

export interface EventSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  event_date: string | null;
  status: 'draft' | 'processing' | 'published' | 'archived';
  visibility: 'public' | 'private_by_token' | 'find_my_photos';
  photo_count: number;
  total_size_bytes: string;
  created_at: string;
  coverImageUrl: string | null;
}

export interface SiteSettings {
  logoUrl: string | null;
  tagline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  socialLinks: Record<string, string>;
}

export interface AdminAccount {
  id: string;
  email: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  role: 'photographer' | 'admin' | 'staff';
  status: 'active' | 'suspended' | 'pending_verification';
  storage_used_bytes: string;
  storage_quota_bytes: string;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface PhotoSession {
  id: string;
  event_id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
}

export interface AccessTokenSummary {
  id: string;
  label: string | null;
  scope: 'full_gallery' | 'session_only' | 'find_my_photos';
  status: 'active' | 'revoked' | 'expired';
  expires_at: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface IssuedAccess {
  token: AccessTokenSummary;
  rawToken: string;
  qrDataUrl: string;
  galleryUrl: string;
}

export interface GalleryPhoto {
  id: string;
  takenAt: string | null;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
}

export interface GalleryPage {
  items: GalleryPhoto[];
  nextCursor: string | null;
}

export interface ProcessingSummary {
  uploaded: number;
  processing: number;
  ready: number;
  failed: number;
}

export interface UploadBatch {
  id: string;
  total_files: number;
  uploaded_files: number;
  processed_files: number;
  failed_files: number;
  status: 'uploading' | 'processing' | 'completed' | 'completed_with_errors';
}

export interface PresignedUpload {
  filename: string;
  storageKey: string;
  uploadUrl: string;
  mimeType: string;
  sizeBytes: number;
}
