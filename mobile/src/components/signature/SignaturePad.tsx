import { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';

const STROKE_COLOR = '#0F172A';
const STROKE_WIDTH = 2.5;

interface SignaturePadProps {
  /** Called with the signature as SVG markup, or null when cleared. */
  onChange: (signatureSvg: string | null) => void;
  /** Lets the parent ScrollView stop scrolling while the user signs. */
  onDrawingChange?: (isDrawing: boolean) => void;
  height?: number;
}

/**
 * Draw-with-your-finger signature box built on react-native-svg (works on Android, iOS and web,
 * no WebView). The result is a small SVG string saved in GallonContract.SignatureSvg.
 */
export function SignaturePad({ onChange, onDrawingChange, height = 180 }: SignaturePadProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const pathsRef = useRef<string[]>([]);
  const currentPathRef = useRef('');
  const sizeRef = useRef({ width: 300, height });
  // The pan responder is created once, so it reads the latest callbacks through refs.
  const onChangeRef = useRef(onChange);
  const onDrawingChangeRef = useRef(onDrawingChange);
  onChangeRef.current = onChange;
  onDrawingChangeRef.current = onDrawingChange;

  const buildSvg = (allPaths: string[]) => {
    const { width, height: boxHeight } = sizeRef.current;
    const pathElements = allPaths
      .map((pathData) => `<path d="${pathData}" stroke="${STROKE_COLOR}" stroke-width="${STROKE_WIDTH}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(width)} ${Math.round(boxHeight)}">${pathElements}</svg>`;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          onDrawingChangeRef.current?.(true);
          const { locationX, locationY } = event.nativeEvent;
          currentPathRef.current = `M${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          setCurrentPath(currentPathRef.current);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          currentPathRef.current += ` L${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          setCurrentPath(currentPathRef.current);
        },
        onPanResponderRelease: () => {
          const finishedPath = currentPathRef.current;
          currentPathRef.current = '';
          setCurrentPath('');
          onDrawingChangeRef.current?.(false);
          if (!finishedPath.includes('L')) return; // a single tap is not a signature
          const nextPaths = [...pathsRef.current, finishedPath];
          pathsRef.current = nextPaths;
          setPaths(nextPaths);
          onChangeRef.current(buildSvg(nextPaths));
        },
      }),
     
    [],
  );

  const handleClear = () => {
    pathsRef.current = [];
    setPaths([]);
    onChange(null);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    sizeRef.current = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height };
  };

  return (
    <View className="gap-1">
      <View
        className="overflow-hidden rounded-field border-[1.5px] border-dashed border-line-strong bg-surface"
        style={{ height }}
        onLayout={handleLayout}
        accessibilityLabel="Signature box. Draw your signature with your finger."
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height="100%">
          {paths.map((pathData, index) => (
            <Path key={index} d={pathData} stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentPath ? (
            <Path d={currentPath} stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </Svg>
        {paths.length === 0 && !currentPath ? (
          <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
            <AppText className="text-ink-subtle">Sign here with your finger</AppText>
          </View>
        ) : null}
        <View className="absolute bottom-9 left-5 right-5 h-px bg-line" pointerEvents="none" />
      </View>
      <View className="flex-row items-center">
        <AppText variant="caption" className={paths.length > 0 ? 'flex-1 text-success' : 'flex-1 text-ink-subtle'}>
          {paths.length > 0 ? 'Signature captured ✓' : 'Your signature is required'}
        </AppText>
        <Button label="Clear" icon="refresh" variant="ghost" size="sm" onPress={handleClear} isDisabled={paths.length === 0} />
      </View>
    </View>
  );
}
