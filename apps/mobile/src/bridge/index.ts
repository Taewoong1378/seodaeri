import type { WebViewMessageEvent } from 'react-native-webview'
import type {
  BridgeMessage,
  BridgeMessageType,
  BridgePayloads,
} from './shared-types'
import type { WebViewRef } from './handlers/types'
import { handleShare, handleShareImage } from './handlers'
import {
  handleAppleLogin,
  handleCheckAppleAvailable,
} from './handlers/appleAuthHandler'
import { handleSetCookie } from './handlers/cookieHandler'
import { handleLogout } from './handlers/logoutHandler'

export function createMessageHandler(webViewRef: WebViewRef) {
  return async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(
        event.nativeEvent.data
      ) as BridgeMessage<BridgeMessageType>
      console.log('Bridge message:', message)

      // 디버그 메시지 처리
      if (message.type === 'Debug.AppleLogin') {
        console.log('🔍 [Debug.AppleLogin]', JSON.stringify(message, null, 2))
        return
      }
      if (message.type === 'Debug.Bridge') {
        console.log('🌉 [Debug.Bridge]', JSON.stringify(message, null, 2))
        return
      }
      if (message.type === 'Debug.AppleLogin.Component') {
        console.log('🍎 [AppleLogin]', JSON.stringify(message, null, 2))
        return
      }

      switch (message.type) {
        case 'UI.Share':
          await handleShare(message.payload as BridgePayloads['UI.Share'])
          break

        case 'UI.ShareImage':
          await handleShareImage(
            message.payload as BridgePayloads['UI.ShareImage'],
            webViewRef
          )
          break

        case 'Auth.Apple.Request':
          await handleAppleLogin(message.id || '', webViewRef)
          break

        case 'Auth.Apple.CheckAvailable':
          await handleCheckAppleAvailable(message.id || '', webViewRef)
          break

        case 'Auth.SetCookie':
          await handleSetCookie(
            message.id || '',
            webViewRef,
            message.payload as { token: string; cookieName: string; domain: string }
          )
          break

        case 'Auth.Logout':
          await handleLogout(message.id || '', webViewRef)
          break

        default:
          console.log('Unhandled message type:', message.type)
      }
    } catch (error) {
      console.error('Message handling error:', error)
    }
  }
}

export * from './handlers'
export * from './handlers/types'
export {
  handleAppleLogin,
  handleCheckAppleAvailable,
} from './handlers/appleAuthHandler'
export { handleLogout } from './handlers/logoutHandler'
