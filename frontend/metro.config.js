const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable source maps in production
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    sourceMap: {
      output: 'inline'
    }
  }
};

module.exports = config;
