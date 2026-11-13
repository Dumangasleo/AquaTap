import { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import { buildLeafletHtml } from './leaflet-html';
import type { LeafletMapProps } from './map.types';
import { handleMapEvent, useMapViewState } from './use-map-state';

interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

// react-native-webview's class typings do not resolve under React Native 0.88's strict TypeScript API,
// so we describe the parts we use.
const MapWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

/** Free OpenStreetMap-based map rendered in a WebView (Android / iOS). */
export function LeafletMap(props: LeafletMapProps) {
  const mapState = useMapViewState(props);
  const webViewRef = useRef<WebViewHandle>(null);
  const [isReady, setIsReady] = useState(false);
  // Build the page once; later changes are pushed with applyMapState so the map does not reload.
  const [html] = useState(() => buildLeafletHtml(mapState));

  useEffect(() => {
    if (!isReady) return;
    webViewRef.current?.injectJavaScript(`window.applyMapState(${JSON.stringify(mapState)}); true;`);
  }, [mapState, isReady]);

  return (
    <View className="overflow-hidden rounded-card border border-line bg-surface-muted" style={{ height: props.height ?? 260 }}>
      <MapWebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://aquatap.local/' }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        onMessage={(event: WebViewMessageEvent) => {
          const message = event.nativeEvent.data;
          if (message.includes('"ready"')) setIsReady(true);
          handleMapEvent(message, props);
        }}
        className="flex-1 bg-transparent"
      />
    </View>
  );
}

