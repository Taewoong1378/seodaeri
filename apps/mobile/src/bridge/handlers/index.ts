import { Platform, Share } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import type { BridgePayloads } from '../shared-types'

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

export async function handleShareImage(
  payload: BridgePayloads['UI.ShareImage']
) {
  try {
    const mimeType = payload.mimeType || 'image/png'
    const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const fileName = `${payload.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Date.now()}.${extension}`
    const filePath = `${FileSystem.cacheDirectory}${fileName}`

    // base64 데이터에서 data URL prefix 제거
    const base64Data = payload.imageBase64.replace(
      /^data:image\/\w+;base64,/,
      ''
    )

    // base64 → 임시 파일 저장
    await FileSystem.writeAsStringAsync(filePath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    })

    // expo-sharing을 통해 네이티브 공유 시트 열기
    const isAvailable = await Sharing.isAvailableAsync()
    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType,
        dialogTitle: payload.title,
      })
    } else {
      // expo-sharing 불가 시 fallback: React Native Share API로 파일 URI 공유
      await Share.share({
        title: payload.title,
        url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
      })
    }

    // 공유 완료 후 임시 파일 정리
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true })
    } catch {
      // 정리 실패는 무시
    }
  } catch (error) {
    console.error('Share image error:', error)
  }
}
