import "dotenv/config";

export default {
  expo: {
    name: "frontend",
    slug: "frontend",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "frontend",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0
    },

    ios: {
      supportsTablet: true
    },

    android: {
      package: "com.wgo4y.frontend",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#000"
      },
      edgeToEdgeEnabled: true,
      softwareKeyboardLayoutMode: "pan",
      navigationBar: {
        visible: "immersive"
      }
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },

    splash: {
      image: "./assets/images/splash-image.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-image.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#000000"
        }
      ]
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      eas: {
        projectId: "4ca0546e-327a-495e-8fb0-3ba3ed6f4f16"
      },
      EXPO_PUBLIC_BACKEND_URL: "https://service-finder-254.preview.emergentagent.com"
    }
  }
};


