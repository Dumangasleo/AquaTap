import * as Location from 'expo-location';
import type { Coordinates } from '../components/map/map.types';

/** Asks permission (if needed) and returns the phone's current location, or null if not allowed. */
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
  const position =
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)) ?? lastKnown;
  if (!position) return null;

  return {
    latitude: Number(position.coords.latitude.toFixed(7)),
    longitude: Number(position.coords.longitude.toFixed(7)),
  };
}

/** Google Maps turn-by-turn directions (free, opens the Maps app). */
export function buildDirectionsUrl(destination: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
}
