import { Platform, Share } from 'react-native'
import type { BridgePayloads } from '@repo/shared-utils'

export async function handleShare(payload: BridgePayloads['UI.Share']) {
  try {
    const shareContent = Platform.select({
      ios: {
        message: payload.message
          ? `${payload.title}\n${payload.message}\n`
          : payload.url,
        url: payload.url,
      },
      android: {
        title: payload.title,
        message: payload.message
          ? `${payload.message}\n${payload.url}`
          : payload.url,
      },
    })

    await Share.share(shareContent!)
  } catch (error) {
    console.error('Share error:', error)
  }
}
