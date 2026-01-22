/**
 * React Native Bridge Utility for Gulim App
 * 웹-앱 통신을 위한 브릿지 시스템
 */

export type BridgeMessageType =
  | 'Navigation.GoBack'
  | 'UI.Share'
  | 'Auth.Apple.Request'
  | 'Auth.Apple.CheckAvailable'

export interface BridgePayloads {
  'Navigation.GoBack': undefined
  'UI.Share': { title: string; url: string; message?: string }
  'Auth.Apple.Request': undefined
  'Auth.Apple.CheckAvailable': undefined
}

export interface AppleLoginResponse {
  identityToken: string
  authorizationCode: string
  user: string
  email?: string
  fullName?: {
    givenName?: string
    familyName?: string
  }
  realUserStatus?: number
}

export interface BridgeMessage<T extends BridgeMessageType> {
  type: T
  payload?: BridgePayloads[T]
  id?: string
}

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
    safeAreaInsets?: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }
}

export class RNBridge {
  /**
   * 현재 환경이 React Native WebView인지 확인
   */
  isReactNative(): boolean {
    return typeof window !== 'undefined' && !!window.ReactNativeWebView
  }

  /**
   * 네이티브 앱으로 메시지 전송
   */
  postMessage<T extends BridgeMessageType>(
    type: T,
    payload?: BridgePayloads[T]
  ): string {
    const messageId = Math.random().toString(36).substring(7)
    if (this.isReactNative()) {
      const message: BridgeMessage<T> = { type, payload, id: messageId }
      window.ReactNativeWebView?.postMessage(JSON.stringify(message))
    }
    return messageId
  }

  /**
   * 뒤로 가기 요청
   */
  goBack(): void {
    this.postMessage('Navigation.GoBack')
  }

  /**
   * 공유 기능 호출
   */
  share(data: BridgePayloads['UI.Share']): void {
    this.postMessage('UI.Share', data)
  }

  /**
   * 네이티브 Apple 로그인 요청
   * iOS 앱에서만 동작
   */
  appleLogin(): Promise<AppleLoginResponse> {
    return new Promise((resolve, reject) => {
      if (!this.isReactNative()) {
        reject(new Error('Apple native login is only available in React Native'))
        return
      }

      const messageId = this.postMessage('Auth.Apple.Request')
      console.log('[Bridge] appleLogin - sent messageId:', messageId)

      const handler = (event: Event) => {
        console.log('[Bridge] appleLogin - received event:', event.type)
        const customEvent = event as CustomEvent
        console.log('[Bridge] appleLogin - event detail:', JSON.stringify(customEvent.detail))
        console.log('[Bridge] appleLogin - comparing ids:', customEvent.detail?.id, '===', messageId)
        
        if (customEvent.detail?.id === messageId) {
          console.log('[Bridge] appleLogin - ID matched!')
          window.removeEventListener('Bridge.AppleLogin', handler)
          if (customEvent.detail.error) {
            console.log('[Bridge] appleLogin - has error:', customEvent.detail.error)
            reject(new Error(customEvent.detail.error))
          } else if (customEvent.detail.data) {
            console.log('[Bridge] appleLogin - has data, resolving')
            resolve(customEvent.detail.data as AppleLoginResponse)
          }
        } else {
          console.log('[Bridge] appleLogin - ID mismatch, ignoring')
        }
      }

      window.addEventListener('Bridge.AppleLogin', handler)
      console.log('[Bridge] appleLogin - event listener registered')

      // 60초 타임아웃
      setTimeout(() => {
        window.removeEventListener('Bridge.AppleLogin', handler)
        reject(new Error('Apple login timeout'))
      }, 60000)
    })
  }

  /**
   * Apple 로그인 가능 여부 확인
   * iOS 13+ 디바이스에서만 true 반환
   */
  checkAppleAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isReactNative()) {
        resolve(false)
        return
      }

      const messageId = this.postMessage('Auth.Apple.CheckAvailable')

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent
        if (customEvent.detail?.id === messageId) {
          window.removeEventListener('Bridge.AppleAvailable', handler)
          resolve(customEvent.detail.available ?? false)
        }
      }

      window.addEventListener('Bridge.AppleAvailable', handler)

      // 5초 타임아웃
      setTimeout(() => {
        window.removeEventListener('Bridge.AppleAvailable', handler)
        resolve(false)
      }, 5000)
    })
  }

  /**
   * Safe Area Insets 가져오기 (iOS notch, Android status bar 등)
   */
  getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    return (
      window.safeAreaInsets ?? {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      }
    )
  }
}

export const bridge = new RNBridge()
