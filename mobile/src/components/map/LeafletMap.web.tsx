import { createElement, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { buildLeafletHtml } from './leaflet-html';
import type { LeafletMapProps } from './map.types';
import { handleMapEvent, useMapViewState } from './use-map-state';

/** Web version (used when testing in the browser): the same Leaflet page inside an iframe. */
export function LeafletMap(props: LeafletMapProps) {
  const mapState = useMapViewState(props);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [html] = useState(() => buildLeafletHtml(mapState));
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { source?: string; payload?: string };
      if (data?.source === 'aquatap-map' && data.payload) handleMapEvent(data.payload, propsRef.current);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ type: 'aquatap-map-state', state: mapState }), '*');
  }, [mapState]);

  return (
    <View className="overflow-hidden rounded-card border border-line bg-surface-muted" style={{ height: props.height ?? 260 }}>
      {createElement('iframe', {
        ref: iframeRef,
        srcDoc: html,
        title: 'Map',
        style: { border: 0, width: '100%', height: '100%' },
      })}
    </View>
  );
}

