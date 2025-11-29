import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

export default function Login() {
  const router = useRouter()

  const handleGoogleLogin = async () => {
    // TODO: Implement Google Sign-In
    // For now, navigate to tabs
    router.replace('/(tabs)')
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>로그인</Text>
        <Text style={styles.description}>
          Google 계정으로 로그인하여{'\n'}투자 기록을 시작하세요
        </Text>
        <Pressable style={styles.googleButton} onPress={handleGoogleLogin}>
          <GoogleIcon />
          <Text style={styles.googleButtonText}>Google로 계속하기</Text>
        </Pressable>
      </View>
    </View>
  )
}

function GoogleIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>G</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
})
