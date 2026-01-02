const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Completely disable minification for debugging
config.transformer = {
  ...config.transformer,
  minifierPath: require.resolve('metro-minify-terser'),
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    compress: false,
    mangle: false,
    output: {
      comments: true,
      beautify: true,
    },
  },
};

module.exports = config;
