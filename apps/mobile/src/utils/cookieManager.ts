import CookieManager from '@react-native-cookies/cookies'
import { Platform } from 'react-native'

/**
 * Android에서 쿠키를 영구 저장소에 flush
 * iOS는 자동으로 처리되므로 Android에서만 필요
 */
export async function flushCookies(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await CookieManager.flush()
      console.log('Cookies flushed to persistent storage')
    } catch (error) {
      console.error('Failed to flush cookies:', error)
    }
  }
}

/**
 * 특정 URL의 모든 쿠키 삭제
 */
export async function clearCookies(url?: string): Promise<void> {
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
