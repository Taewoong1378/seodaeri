import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView as _SafeAreaView,
  type SafeAreaViewProps,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// React 19 타입 호환성 우회
const SafeAreaView = _SafeAreaView as unknown as React.FC<SafeAreaViewProps>;
import { WebView } from "react-native-webview";

console.log("[App] Module loaded");

// 동적 import
let SplashScreen: typeof import("expo-splash-screen") | null = null;
try {
  SplashScreen = require("expo-splash-screen");
  SplashScreen?.preventAutoHideAsync().catch(() => {});
} catch (e) {}

let createMessageHandler:
  | ((ref: React.RefObject<WebView>) => (event: any) => void)
  | null = null;
try {
  createMessageHandler = require("./src/bridge").createMessageHandler;
} catch (e) {}

let flushCookies: (() => Promise<void>) | null = null;
try {
  flushCookies = require("./src/utils/cookieManager").flushCookies;
} catch (e) {}

const WEB_URL = "https://gulim.co.kr";
// const WEB_URL = "https://localhost:3000";

function AppContent() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const insets = useSafeAreaInsets();

  const handleMessage = useMemo(
    () =>
      createMessageHandler?.(webViewRef as React.RefObject<WebView>) ??
      (() => {}),
    []
  );

  const splashHidden = useRef(false);

  const hideSplash = useCallback(async () => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    try {
      await SplashScreen?.hideAsync();
    } catch {}
  }, []);

  // 마운트 시 WebView를 스플래시 뒤에서 즉시 렌더링 시작
  useEffect(() => {
    console.log("[AppContent] Mounted - WebView loading behind splash");
    setShowWebView(true);

    // 안전 타임아웃: 네트워크 실패 시 앱이 멈춘 것처럼 보이지 않도록
    const safetyTimer = setTimeout(() => {
      console.log("[AppContent] Safety timeout (7s) - forcing splash hide");
      hideSplash();
    }, 7000);

    return () => clearTimeout(safetyTimer);
  }, [hideSplash]);

  useEffect(() => {
    if (Platform.OS !== "android" || !flushCookies) return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background" || s === "inactive") flushCookies?.();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      return true;
    });
    return () => handler.remove();
  }, [canGoBack]);

  const onNav = (s: { url: string; canGoBack: boolean }) => {
    try {
      const root = ["/", "/dashboard", "/login", "/onboarding"].includes(
        new URL(s.url).pathname
      );
      setCanGoBack(!root && s.canGoBack);
    } catch {}
  };

  if (!showWebView) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webView}
        onNavigationStateChange={onNav}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "App.Ready") {
              console.log("[WebView] App.Ready received - hiding splash");
              hideSplash();
              return;
            }
          } catch {}
          handleMessage(event);
        }}
        onLoadEnd={(event) => {
          const url = (event.nativeEvent as any)?.url || "";
          if (!url.includes("/dashboard")) {
            console.log("[WebView] Non-dashboard page loaded - hiding splash");
            hideSplash();
          }
        }}
        onError={(e) =>
          console.log("[WebView] Error:", e.nativeEvent.description)
        }
        allowsBackForwardNavigationGestures={canGoBack}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        startInLoadingState
        mixedContentMode="compatibility"
        originWhitelist={["*"]}
        userAgent={
          Platform.OS === "android"
            ? "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 GulimApp"
            : "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 GulimApp"
        }
        bounces={false}
        overScrollMode="never"
        injectedJavaScriptBeforeContentLoaded={`
          window.safeAreaInsets = {top:${insets.top},bottom:${insets.bottom},left:${insets.left},right:${insets.right}};
          true;
        `}
      />
    </SafeAreaView>
  );
}

function App() {
  console.log("[App] Rendering");
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  webView: { flex: 1, width: "100%" },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
