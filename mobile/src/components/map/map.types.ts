export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type MapMarkerKind = 'customer' | 'rider' | 'station';

export interface MapMarker extends Coordinates {
  id: string;
  kind: MapMarkerKind;
  label?: string;
}

export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
}

export interface MapViewState {
  markers: MapMarker[];
  center: Coordinates;
  zoom: number;
  /** Shows a fixed pin in the middle; moving the map picks a location. */
  isPicker: boolean;
  /** Draws the road route between two points (OSRM, free). */
  route: { from: Coordinates; to: Coordinates } | null;
}

export interface LeafletMapProps {
  markers?: MapMarker[];
  center?: Coordinates;
  zoom?: number;
  height?: number;
  isPicker?: boolean;
  onLocationPick?: (coordinates: Coordinates) => void;
  route?: { from: Coordinates; to: Coordinates } | null;
  onRouteInfo?: (routeInfo: RouteInfo) => void;
}

export type MapEvent =
  | { type: 'ready' }
  | ({ type: 'pick' } & Coordinates)
  | ({ type: 'route' } & RouteInfo);
