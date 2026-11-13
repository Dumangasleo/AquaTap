import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Same limit as the API. The server makes the photo small (256 px) before saving it. */
const MAX_DATA_URI_LENGTH = 6_000_000;

export type AvatarSource = 'camera' | 'library';

export type PickedAvatar =
  | { status: 'picked'; imageDataUri: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Takes a selfie or chooses a photo, cropped to a square, and returns it as a data URI. */
export async function pickAvatarImage(source: AvatarSource): Promise<PickedAvatar> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    base64: true,
    quality: 0.4,
  };

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return { status: 'error', message: 'The camera is not allowed. Choose a photo from your gallery instead.' };
    }
    result = await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.front });
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };
  const asset = result.assets[0];
  if (!asset.base64) return { status: 'error', message: 'Could not read the photo. Please try again.' };

  const imageDataUri = `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  if (imageDataUri.length > MAX_DATA_URI_LENGTH) {
    return { status: 'error', message: 'The photo is too big. Please choose a smaller photo.' };
  }
  return { status: 'picked', imageDataUri };
}
