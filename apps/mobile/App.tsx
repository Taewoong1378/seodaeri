import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Platform,
  StyleSheet,
  View,
} from 'react-native'
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { createMessageHandler } from './src/bridge'
import { flushCookies } from './src/utils/cookieManager'

const LOCAL_URL = 'http://localhost:3000'
const PROD_URL = 'https://gulim.co.kr'
const WEB_URL = __DEV__ ? LOCAL_URL : PROD_URL

function AppContent() {
  const webViewRef = useRef<WebView>(null)
  const [_loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const insets = useSafeAreaInsets()

  const handleMessage = useMemo(() => createMessageHandler(webViewRef), [])

  // Android 쿠키 영구 저장: 앱 백그라운드 전환 시 flush
  useEffect(() => {
    if (Platform.OS !== 'android') return

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        flushCookies()
      }
    })

    return () => subscription.remove()
  }, [])

  // Android 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    if (Platform.OS !== 'android') return

    const handleBackPress = () => {
      if (canGoBack) {
        webViewRef.current?.goBack()
        return true // 이벤트 소비, 뒤로가기 실행
      }
      // 루트 페이지에서는 앱 종료 방지
      return true
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    )

    return () => backHandler.remove()
  }, [canGoBack])

  // 루트 페이지인지 확인 (뒤로가기 비활성화)
  const isRootRoute = (url: string) => {
    try {
      const urlObj = new URL(url)
      const rootPaths = ['/', '/dashboard', '/login', '/onboarding']
      return rootPaths.includes(urlObj.pathname)
    } catch {
      return false
    }
  }

  const handleNavigationStateChange = (navState: { url: string; canGoBack: boolean }) => {
    const isRoot = isRootRoute(navState.url)
    setCanGoBack(!isRoot && navState.canGoBack)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webView}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        allowsBackForwardNavigationGestures={canGoBack}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled={Platform.OS === 'android'}
        thirdPartyCookiesEnabled={Platform.OS === 'android'}
        startInLoadingState
        scalesPageToFit
        allowsFullscreenVideo
        mixedContentMode="compatibility"
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        originWhitelist={['*']}
        userAgent={`GulimApp/${Platform.OS}`}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        injectedJavaScriptBeforeContentLoaded={`
          window.safeAreaInsets = {
            top: ${insets.top},
            bottom: ${insets.bottom},
            left: ${insets.left},
            right: ${insets.right}
          };
          document.documentElement.style.setProperty('--safe-area-top', '${insets.top}px');
          document.documentElement.style.setProperty('--safe-area-bottom', '${insets.bottom}px');
          true;
        `}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        )}
      />
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
    width: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
})
