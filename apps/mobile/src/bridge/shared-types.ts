/**
 * React Native Bridge Types for Gulim App
 * (Copied from @repo/shared-utils to avoid workspace dependency in EAS Build)
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

