/**
 * Supabase helpers for face descriptor storage.
 * The `profiles` table has: id (= auth user id), face_descriptor (float8[])
 */
import { supabase } from '@/api/supabaseClient';

/** Fetch the stored face descriptor for the current user. Returns null if not enrolled. */
export async function getStoredDescriptor() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('face_descriptor')
    .eq('id', user.id)
    .single();

  if (error || !data?.face_descriptor) return null;
  return data.face_descriptor; // number[]
}

/** Save/update the face descriptor for the current user. */
export async function saveDescriptor(descriptor) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, face_descriptor: descriptor, updated_at: new Date().toISOString() });

  if (error) throw error;
}

/** Check whether the current user has a stored descriptor. */
export async function isEnrolled() {
  const descriptor = await getStoredDescriptor();
  return descriptor !== null && descriptor.length > 0;
}
