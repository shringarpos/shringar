import { supabaseClient } from "../providers/supabase-client";

export const DESIGN_GALLERY_BUCKET = "design-gallery-images";

export interface UploadPhotoResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Uploads a design photo to the design-gallery-images Supabase Storage bucket.
 */
export async function uploadDesignPhoto(
  file: File,
  albumId: string
): Promise<UploadPhotoResult> {
  const fileExt = file.name.split(".").pop() || "jpg";
  const sanitizedFileName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const storagePath = `${albumId}/${Date.now()}-${sanitizedFileName}.${fileExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(DESIGN_GALLERY_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload design photo");
  }

  const { data } = supabaseClient.storage
    .from(DESIGN_GALLERY_BUCKET)
    .getPublicUrl(storagePath);

  if (!data?.publicUrl) {
    throw new Error("Failed to retrieve public URL for uploaded photo");
  }

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
}

/**
 * Deletes a design photo from the Supabase Storage bucket.
 */
export async function deleteDesignPhoto(storagePath: string): Promise<void> {
  if (!storagePath) return;

  const { error } = await supabaseClient.storage
    .from(DESIGN_GALLERY_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("Failed to delete design photo from storage:", error);
  }
}
