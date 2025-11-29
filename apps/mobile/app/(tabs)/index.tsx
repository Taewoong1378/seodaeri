import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

// TODO: Replace with your actual local IP or deployed URL
// For Android Emulator, use 'http://10.0.2.2:3000'
// For iOS Simulator, use 'http://localhost:3000'
const WEB_APP_URL = 'http://localhost:3000/mobile';

export default function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Handle Android hardware back button
    const backAction = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true; // Prevent default behavior (exit app)
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'OPEN_CAMERA':
          await handleCamera();
          break;
        case 'OPEN_GALLERY':
          await handleGallery();
          break;
        case 'HAPTIC_FEEDBACK':
          // Implement haptics
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to parse message from web:', error);
    }
  };

  const handleCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset) {
        const imageUri = asset.uri;
        const base64 = asset.base64;
        
        // Send image back to Web
        const message = {
          type: 'IMAGE_CAPTURED',
          payload: {
            uri: imageUri,
            base64: `data:image/jpeg;base64,${base64}`,
          },
        };
        
        webViewRef.current?.postMessage(JSON.stringify(message));
      }
    }
  };

  const handleGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset) {
        const imageUri = asset.uri;
        const base64 = asset.base64;

        const message = {
          type: 'IMAGE_CAPTURED',
          payload: {
            uri: imageUri,
            base64: `data:image/jpeg;base64,${base64}`,
          },
        };

        webViewRef.current?.postMessage(JSON.stringify(message));
      }
    }
  };

  // Inject safe area insets as CSS variables if needed, 
  // though the web app uses env(safe-area-inset-*) which works automatically in WKWebView
  const injectedJavaScript = `
    document.documentElement.style.setProperty('--safe-area-top', '${insets.top}px');
    document.documentElement.style.setProperty('--safe-area-bottom', '${insets.bottom}px');
    document.documentElement.style.setProperty('--safe-area-left', '${insets.left}px');
    document.documentElement.style.setProperty('--safe-area-right', '${insets.right}px');
    true;
  `;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        scrollEnabled={false} // Let the web app handle scrolling
        bounces={false}
        allowsBackForwardNavigationGestures
        // Enable debugging in development
        webviewDebuggingEnabled={__DEV__}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
});
