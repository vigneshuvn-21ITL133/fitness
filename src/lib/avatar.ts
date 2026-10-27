/**
 * Profile photo handling. The picked image is copied into the app's document
 * directory so it survives cache clearing. Nothing is uploaded.
 */
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const PREFIX = 'profile-avatar-';

/** Opens the photo library. Returns the stored file URI, or null if the user cancelled. */
export async function pickAvatar(previousUri?: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const source = new File(result.assets[0].uri);
  const target = new File(Paths.document, `${PREFIX}${Date.now()}.jpg`);
  await source.copy(target);
  removeAvatarFile(previousUri);
  return target.uri;
}

/** Deletes a stored photo. Ignores files that are already gone. */
export function removeAvatarFile(uri?: string): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already removed or not ours to delete.
  }
}
