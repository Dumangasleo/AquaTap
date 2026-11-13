import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Same limit as the API (about 4 MB photo). */
const MAX_DATA_URI_LENGTH = 6_000_000;

export type DocumentSource = 'camera' | 'library';

export type PickedDocument =
  | { status: 'picked'; fileName: string; fileData: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Takes a photo of a permit (or chooses one from the gallery) and returns it as a data URI. */
export async function pickDocumentImage(source: DocumentSource, documentLabel: string): Promise<PickedDocument> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.5 };

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'error', message: 'Camera permission is off. Choose a photo from your gallery instead.' };
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };
  const asset = result.assets[0];
  if (!asset.base64) return { status: 'error', message: 'Could not read the photo. Please try again.' };

  const mimeType = asset.mimeType ?? 'image/jpeg';
  const fileData = `data:${mimeType};base64,${asset.base64}`;
  if (fileData.length > MAX_DATA_URI_LENGTH) {
    return { status: 'error', message: 'The photo is too big (max 4 MB). Take the photo again a little farther away.' };
  }

  const extension = mimeType.split('/')[1] ?? 'jpg';
  const fileName = asset.fileName ?? `${documentLabel.replace(/[^A-Za-z0-9]+/g, '-')}.${extension}`;
  return { status: 'picked', fileName, fileData };
}
