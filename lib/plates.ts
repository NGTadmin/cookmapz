import type { CreateCreatorPlateInput, CreatorPlate } from '../types/creator';
import { supabase } from './supabase';

export async function uploadCreatorPlateImage(
  userId: string,
  plateId: string,
  fileUri: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/catalog/${plateId}.${ext}`;

  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('Could not read the selected plate photo.');
  }
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('plate-images')
    .upload(path, blob, { contentType: mimeType, upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('plate-images').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function fetchCreatorPlates(creatorId: string): Promise<CreatorPlate[]> {
  const { data, error } = await supabase
    .from('creator_plates')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[plates] fetchCreatorPlates failed:', error.message);
    return [];
  }

  return (data ?? []) as CreatorPlate[];
}

export async function createCreatorPlate(
  creatorId: string,
  input: CreateCreatorPlateInput,
  imageUri: string,
  mimeType = 'image/jpeg',
): Promise<CreatorPlate> {
  const plateId = crypto.randomUUID();

  const imageUrl = await uploadCreatorPlateImage(creatorId, plateId, imageUri, mimeType);

  const { data, error } = await supabase
    .from('creator_plates')
    .insert({
      id: plateId,
      creator_id: creatorId,
      name: input.name.trim(),
      ingredients: input.ingredients.trim(),
      description: input.description.trim(),
      price: input.price,
      image_url: imageUrl,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CreatorPlate;
}
