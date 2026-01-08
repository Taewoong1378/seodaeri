import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'
import type { WebViewRef } from './types'

// 동적 import로 Expo Go에서도 안전하게 처리
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null

try {
  AppleAuthentication = require('expo-apple-authentication')
} catch {
  console.log('[AppleAuth] Module not available (Expo Go)')
}

/**
 * Apple Sign In 가능 여부 확인
 * iOS 13+ 디바이스에서만 가능
 */
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !AppleAuthentication) {
    return false
  }
  try {
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

/**
 * WebView로부터 Apple 로그인 요청 처리
 */
export async function handleAppleLogin(
  messageId: string,
  webViewRef: WebViewRef
) {
  try {
    if (!AppleAuthentication) {
      throw new Error('NOT_AVAILABLE')
    }

    // 가용성 확인
    const isAvailable = await AppleAuthentication.isAvailableAsync()
    if (!isAvailable) {
      throw new Error('NOT_AVAILABLE')
    }

    // 보안을 위한 nonce 생성
    const nonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Math.random().toString(36).substring(2, 15)
    )

    // Apple Sign In 요청
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    })

    // 응답 객체 구성
    const response = {
      identityToken: credential.identityToken!,
      authorizationCode: credential.authorizationCode!,
      user: credential.user,
      email: credential.email ?? undefined,
      fullName: credential.fullName
        ? {
            givenName: credential.fullName.givenName ?? undefined,
            familyName: credential.fullName.familyName ?? undefined,
          }
        : undefined,
      realUserStatus: credential.realUserStatus,
    }

    // WebView로 성공 응답 전송
    const script = `
      (function() {
        window.dispatchEvent(new CustomEvent('Bridge.AppleLogin', {
          detail: { id: ${JSON.stringify(messageId)}, data: ${JSON.stringify(response)} }
        }));
        return true;
      })();
    `
    webViewRef.current?.injectJavaScript(script)
  } catch (error: unknown) {
    let errorMessage = 'APPLE_LOGIN_FAILED'

    // 에러 타입별 처리
    if (error instanceof Error) {
      const errorWithCode = error as Error & { code?: string }
      if (errorWithCode.code === 'ERR_REQUEST_CANCELED') {
        errorMessage = 'CANCELED'
      } else if (errorWithCode.code === 'ERR_REQUEST_FAILED') {
        errorMessage = 'REQUEST_FAILED'
      } else if (errorWithCode.code === 'ERR_INVALID_RESPONSE') {
        errorMessage = 'INVALID_RESPONSE'
      } else if (
        errorWithCode.code === 'ERR_NOT_AVAILABLE' ||
        error.message === 'NOT_AVAILABLE'
      ) {
        errorMessage = 'NOT_AVAILABLE'
      }
    }

    console.error('Apple login error:', error)

    // WebView로 에러 응답 전송
    const script = `
      (function() {
        window.dispatchEvent(new CustomEvent('Bridge.AppleLogin', {
          detail: { id: ${JSON.stringify(messageId)}, error: ${JSON.stringify(errorMessage)} }
        }));
        return true;
      })();
    `
    webViewRef.current?.injectJavaScript(script)
  }
}

/**
 * WebView로부터 Apple 로그인 가용성 확인 요청 처리
 */
export async function handleCheckAppleAvailable(
  messageId: string,
  webViewRef: WebViewRef
) {
  const available = await isAppleAuthAvailable()

  const script = `
    (function() {
      window.dispatchEvent(new CustomEvent('Bridge.AppleAvailable', {
        detail: { id: '${messageId}', available: ${available} }
      }));
      return true;
    })();
  `
  webViewRef.current?.injectJavaScript(script)
}
