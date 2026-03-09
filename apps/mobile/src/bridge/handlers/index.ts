import { Platform, Share } from 'react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import type { BridgePayloads } from '../shared-types'
import type { WebViewRef } from './types'

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
  payload: BridgePayloads['UI.ShareImage'],
  webViewRef?: WebViewRef
) {
  const report = (msg: string) => {
    console.log(`[ShareImage] ${msg}`)
    webViewRef?.current?.injectJavaScript(
      `window.__shareImageDebug && window.__shareImageDebug(${JSON.stringify(msg)});true;`
    )
  }

  try {
    const mimeType = payload.mimeType || 'image/png'
    const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const safeTitle = payload.title.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${safeTitle}_${Date.now()}.${extension}`

    report(`file=${fileName}, dataLen=${payload.imageBase64.length}`)

    // base64 데이터에서 data URL prefix 제거
    const base64Data = payload.imageBase64.replace(
      /^data:image\/\w+;base64,/,
      ''
    )

    if (!base64Data || base64Data.length < 10) {
      report(`ERROR: base64 too short (${base64Data.length})`)
      return
    }

    // expo-file-system v19 새 API: File + Paths.cache
    const file = new File(Paths.cache, fileName)
    file.create()
    file.write(base64Data, { encoding: 'base64' })

    report(`written: exists=${file.exists}, size=${file.size}`)

    if (!file.exists) {
      report('ERROR: file not found after write')
      return
    }

    // expo-sharing을 통해 네이티브 공유 시트 열기
    const isAvailable = await Sharing.isAvailableAsync()
    report(`sharing available=${isAvailable}`)

    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType,
        dialogTitle: payload.title,
      })
    } else {
      if (Platform.OS === 'ios') {
        await Share.share({ title: payload.title, url: file.uri })
      } else {
        await Share.share({ title: payload.title, message: file.uri })
      }
    }

    report('share complete')

    // 임시 파일 정리
    try {
      file.delete()
    } catch {
      // 정리 실패는 무시
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    report(`ERROR: ${msg}`)
  }
}
