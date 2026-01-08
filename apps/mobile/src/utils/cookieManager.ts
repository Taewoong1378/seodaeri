import { Platform } from 'react-native'

// 네이티브 모듈을 동적으로 불러옴 (Expo Go에서는 사용 불가)
let CookieManager: typeof import('@react-native-cookies/cookies').default | null = null

try {
  // 프로덕션 빌드에서만 작동 (Expo Go에서는 에러 발생하므로 catch)
  CookieManager = require('@react-native-cookies/cookies').default
} catch {
  console.log('[CookieManager] Native module not available (Expo Go)')
}

/**
 * Android에서 쿠키를 영구 저장소에 flush
 * iOS는 자동으로 처리되므로 Android에서만 필요
 */
export async function flushCookies(): Promise<void> {
  if (Platform.OS !== 'android' || !CookieManager) return

  try {
    await CookieManager.flush()
    console.log('Cookies flushed to persistent storage')
  } catch (error) {
    console.error('Failed to flush cookies:', error)
  }
}

/**
 * 특정 URL의 모든 쿠키 삭제
 */
export async function clearCookies(url?: string): Promise<void> {
  if (!CookieManager) {
    console.log('[CookieManager] Skipping - native module not available')
    return
  }

  try {
    if (url) {
      await CookieManager.clearByName(url, '')
    } else {
      await CookieManager.clearAll()
    }
    console.log('Cookies cleared')
  } catch (error) {
    console.error('Failed to clear cookies:', error)
  }
}
