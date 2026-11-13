import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

/** Displays a saved signature (SVG markup). */
export function SignatureImage({ signatureSvg, height = 110 }: { signatureSvg: string; height?: number }) {
  return (
    <View className="rounded-field border border-line bg-surface p-1.5" style={{ height }} accessibilityLabel="Signature">
      <SvgXml xml={signatureSvg} width="100%" height="100%" />
    </View>
  );
}
