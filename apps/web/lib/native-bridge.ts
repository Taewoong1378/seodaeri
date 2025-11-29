// WebView ↔ React Native 통신
export const sendMessageToNative = (message: { type: string; payload?: any }) => {
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
  }
};

// Message types
export type NativeMessageType =
  | 'OPEN_CAMERA'
  | 'OPEN_GALLERY'
  | 'HAPTIC_FEEDBACK'
  | 'REQUEST_AUTH';
