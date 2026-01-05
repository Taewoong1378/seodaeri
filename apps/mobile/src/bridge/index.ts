import type { WebViewMessageEvent } from 'react-native-webview'
import type {
  BridgeMessage,
  BridgeMessageType,
  BridgePayloads,
} from './shared-types'
import type { WebViewRef } from './handlers/types'
import { handleShare } from './handlers'
import {
  handleAppleLogin,
  handleCheckAppleAvailable,
} from './handlers/appleAuthHandler'

export function createMessageHandler(webViewRef: WebViewRef) {
  return async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(
        event.nativeEvent.data
      ) as BridgeMessage<BridgeMessageType>
      console.log('Bridge message:', message)

      switch (message.type) {
        case 'UI.Share':
          await handleShare(message.payload as BridgePayloads['UI.Share'])
          break

        case 'Auth.Apple.Request':
          await handleAppleLogin(message.id || '', webViewRef)
          break

        case 'Auth.Apple.CheckAvailable':
          await handleCheckAppleAvailable(message.id || '', webViewRef)
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
