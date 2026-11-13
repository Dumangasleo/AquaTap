import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { employeesApi } from '../../api/aquatap-api';
import type { Coordinates } from '../../components/map/map.types';
import { appConfig } from '../../config/app-config';

/**
 * While the rider is delivering, watch the phone's GPS and send the position to the API
 * (at most every `riderLocationIntervalMs`) so the customer can follow the rider on the map.
 */
export function useRiderLocationSharing(isEnabled: boolean, onPosition?: (coordinates: Coordinates) => void) {
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  useEffect(() => {
    if (!isEnabled) return;

    let subscription: Location.LocationSubscription | null = null;
    let isCancelled = false;
    let lastSentAt = 0;

    const startWatching = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted' || isCancelled) return;

      const newSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: appConfig.riderLocationIntervalMs, distanceInterval: 15 },
        (position) => {
          const coordinates = {
            latitude: Number(position.coords.latitude.toFixed(7)),
            longitude: Number(position.coords.longitude.toFixed(7)),
          };
          onPositionRef.current?.(coordinates);

          const now = Date.now();
          if (now - lastSentAt >= appConfig.riderLocationIntervalMs) {
            lastSentAt = now;
            void employeesApi.updateMyLocation(coordinates.latitude, coordinates.longitude).catch(() => undefined);
          }
        },
      );

      if (isCancelled) newSubscription.remove();
      else subscription = newSubscription;
    };

    void startWatching().catch(() => undefined);

    return () => {
      isCancelled = true;
      subscription?.remove();
    };
  }, [isEnabled]);
}
