import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'

export default function AddTransaction() {
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    })

    if (!result.canceled) {
      // TODO: Send image to GPT-4o mini for OCR
      console.log('Selected image:', result.assets[0]?.uri)
    }
  }

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      alert('카메라 권한이 필요합니다.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    })

    if (!result.canceled) {
      // TODO: Send image to GPT-4o mini for OCR
      console.log('Captured image:', result.assets[0]?.uri)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>매매 기록하기</Text>
      <Text style={styles.description}>
        스크린샷을 업로드하면 AI가 자동으로{'\n'}데이터를 추출합니다.
      </Text>
      <View style={styles.buttonContainer}>
        <Pressable style={styles.button} onPress={handlePickImage}>
          <Ionicons name="image-outline" size={32} color="#000" />
          <Text style={styles.buttonText}>갤러리에서 선택</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleTakePhoto}>
          <Ionicons name="camera-outline" size={32} color="#000" />
          <Text style={styles.buttonText}>사진 촬영</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
})
