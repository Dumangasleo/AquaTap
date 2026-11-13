import { useState } from 'react';
import { View } from 'react-native';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { Coordinates } from '../../components/map/map.types';
import { AppText, Button, useToast } from '../../components/ui';
import { appConfig } from '../../config/app-config';
import { getCurrentCoordinates } from '../../utils/location';

interface LocationPickerFieldProps {
  label: string;
  helperText: string;
  value: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
  /** Where the map starts when no location is chosen yet. */
  initialCenter?: Coordinates | null;
}

/** Map with a center pin: drag the map until the pin is on the house, or use the phone's GPS. */
export function LocationPickerField({ label, helperText, value, onChange, initialCenter }: LocationPickerFieldProps) {
  const { showToast } = useToast();
  const [mapCenter, setMapCenter] = useState<Coordinates>(value ?? initialCenter ?? appConfig.defaultMapCenter);
  const [isLocating, setIsLocating] = useState(false);

  const useCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const coordinates = await getCurrentCoordinates();
      if (!coordinates) {
        showToast('Location permission is off. Move the map to your house instead.', 'info');
        return;
      }
      setMapCenter(coordinates);
      onChange(coordinates);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <View className="gap-2">
      <AppText variant="overline">{label}</AppText>
      <AppText variant="caption" className="text-ink-subtle">
        {helperText}
      </AppText>
      <View className="overflow-hidden rounded-card">
        <LeafletMap height={240} center={mapCenter} zoom={17} isPicker onLocationPick={onChange} />
      </View>
      <View className="flex-row items-center gap-2">
        <AppText variant="caption" className={value ? 'flex-1 text-success' : 'flex-1 text-ink-subtle'}>
          {value ? `Pinned: ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}` : 'Move the map to place the red pin'}
        </AppText>
        <Button label="Use my location" icon="locate" variant="secondary" size="sm" isLoading={isLocating} onPress={useCurrentLocation} />
      </View>
    </View>
  );
}
