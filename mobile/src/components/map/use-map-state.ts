import { useMemo } from 'react';
import { appConfig } from '../../config/app-config';
import type { LeafletMapProps, MapEvent, MapViewState } from './map.types';

/** Shared by the native (WebView) and web (iframe) map implementations. */
export function useMapViewState({ markers = [], center, zoom = 15, isPicker = false, route = null }: LeafletMapProps): MapViewState {
  const markersKey = JSON.stringify(markers);
  const routeKey = JSON.stringify(route);
  return useMemo(
    () => ({
      markers,
      center: center ?? markers[0] ?? appConfig.defaultMapCenter,
      zoom,
      isPicker,
      route,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markersKey, routeKey, center?.latitude, center?.longitude, zoom, isPicker],
  );
}

export function handleMapEvent(rawMessage: string, props: LeafletMapProps): void {
  let event: MapEvent;
  try {
    event = JSON.parse(rawMessage) as MapEvent;
  } catch {
    return;
  }
  if (event.type === 'pick') props.onLocationPick?.({ latitude: event.latitude, longitude: event.longitude });
  if (event.type === 'route') props.onRouteInfo?.({ distanceKm: event.distanceKm, durationMinutes: event.durationMinutes });
}
