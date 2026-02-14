import { clearCookies } from '../../utils/cookieManager'
import type { WebViewRef } from './types'

/**
 * 로그아웃 시 WebView 쿠키 전체 삭제
 */
export async function handleLogout(
  messageId: string,
  webViewRef: WebViewRef
): Promise<void> {
  try {
    await clearCookies()
    console.log('[Auth.Logout] Cookies cleared successfully')

    if (webViewRef.current) {
      const response = JSON.stringify({
        id: messageId,
        type: 'Auth.Logout.Response',
        payload: { success: true },
      })
      webViewRef.current.injectJavaScript(
        `window.dispatchEvent(new MessageEvent('message', { data: '${response}' })); true;`
      )
    }
  } catch (error) {
    console.error('[Auth.Logout] Failed to clear cookies:', error)

    if (webViewRef.current) {
      const response = JSON.stringify({
        id: messageId,
        type: 'Auth.Logout.Response',
        payload: { success: false, error: String(error) },
      })
      webViewRef.current.injectJavaScript(
        `window.dispatchEvent(new MessageEvent('message', { data: '${response}' })); true;`
      )
    }
  }
}
