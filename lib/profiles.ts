import type { Profile } from '../types/database';
import { supabase } from './supabase';

export const DISPLAY_NAME_MAX = 50;
export const HANDLE_MAX = 30;
export const BIO_MAX = 500;

export type ProfileUpdateInput = {
  display_name?: string;
  handle?: string;
  avatar_url?: string | null;
  bio?: string | null;
};

export function normalizeHandle(raw: string): string {
  return raw
    .replace(/^@/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, HANDLE_MAX);
}

export function isProfileSetupIncomplete(profile: Profile | null): boolean {
  if (!profile) return true;
  return !profile.avatar_url?.trim();
}

export function profileInitial(
  displayName?: string | null,
  email?: string | null,
): string {
  const source = displayName?.trim() || email?.trim() || '?';
  return source.charAt(0).toUpperCase();
}

export async function uploadProfileAvatar(
  userId: string,
  fileUri: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('Could not read the selected image.');
  }
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: mimeType, upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function updateUserProfile(userId: string, input: ProfileUpdateInput): Promise<Profile> {
  const payload: {
    display_name?: string | null;
    handle?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
  } = {};

  if (input.display_name !== undefined) {
    const displayName = input.display_name.trim().slice(0, DISPLAY_NAME_MAX);
    if (!displayName) throw new Error('Add a display name.');
    payload.display_name = displayName;
  }
  if (input.handle !== undefined) {
    const handle = normalizeHandle(input.handle);
    payload.handle = handle || null;
  }
  if (input.avatar_url !== undefined) {
    payload.avatar_url = input.avatar_url;
  }
  if (input.bio !== undefined) {
    const bio = input.bio?.trim().slice(0, BIO_MAX) ?? '';
    payload.bio = bio || null;
  }

  // Don't use .single(): zero matching rows makes PostgREST throw
  // "Cannot coerce the result to a single JSON object" even when the text is fine.
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*');

  if (error) throw new Error(profileWriteError(error));
  if (data?.[0]) return data[0] as Profile;

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: userId, ...payload })
    .select('*');

  if (insertError) throw new Error(profileWriteError(insertError));
  if (!inserted?.[0]) {
    throw new Error('Could not save your profile. Sign out, sign in again, and try once more.');
  }

  return inserted[0] as Profile;
}

function profileWriteError(error: { code?: string; message: string; details?: string | null }): string {
  const detail = `${error.message} ${error.details ?? ''}`;
  if (error.code === '23505' && /handle/i.test(detail)) {
    return 'That handle is already taken. Try another.';
  }
  if (error.code === '23505') {
    return 'Could not save your profile. Sign out, sign in again, and try once more.';
  }
  if (error.code === 'PGRST116' || /cannot coerce the result to a single json object/i.test(error.message)) {
    return 'Could not save your profile. Sign out, sign in again, and try once more.';
  }
  return error.message;
}
