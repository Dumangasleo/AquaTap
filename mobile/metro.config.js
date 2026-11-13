// Tailwind CSS for React Native (Uniwind): https://docs.uniwind.dev
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

// Uniwind resolves the paths below from the current folder, so make sure that is this project
// even when Expo is started from the repository root (`npx expo start mobile`).
process.chdir(__dirname);

const config = getDefaultConfig(__dirname);

// Must stay the outermost wrapper.
module.exports = withUniwindConfig(config, {
  // The design tokens (colors, fonts, radius) live in this file.
  cssEntryFile: './src/global.css',
  // Generated className types for React Native components.
  dtsFile: './src/uniwind-types.d.ts',
});
