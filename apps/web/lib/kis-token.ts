/**
 * KIS API 토큰 관리 (공유 모듈)
 *
 * 3단계 캐시 전략:
 * 1. 메모리 캐시 (즉시 반환)
 * 2. Supabase sync_metadata DB 캐시 (서버 재시작 후 복구)
 * 3. KIS API 호출 (최후 수단, 1일 1회 원칙)
 *
 * 동시 요청 중복 방지 (in-flight deduplication)
 */

import { createServiceClient } from '@repo/database/server'

export const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443'

const SYNC_META_KEY = 'kis_access_token'

// ============================================
// In-memory token cache
// ============================================
let kisAccessToken: string | null = null
let kisTokenExpiry = 0

// In-flight deduplication
let tokenPromise: Promise<string | null> | null = null

/**
 * KIS API 인증 토큰 발급 (공유)
 *
 * 1. 메모리 캐시 확인
 * 2. 동시 요청 중복 방지
 * 3. DB 캐시 확인 (sync_metadata)
 * 4. KIS API 호출
 */
export async function getKISToken(): Promise<string | null> {
  // 1. 메모리 캐시 확인 (만료 60초 전 여유)
  if (kisAccessToken && Date.now() < kisTokenExpiry - 60000) {
    return kisAccessToken
  }

  // 2. 이미 진행 중인 토큰 요청이 있으면 대기
  if (tokenPromise) {
    return tokenPromise
  }

  // 3. 새로운 토큰 획득 프로세스 시작
  tokenPromise = acquireToken()
  try {
    return await tokenPromise
  } finally {
    tokenPromise = null
  }
}

/**
 * DB에서 캐시된 토큰 조회
 */
async function getTokenFromDB(): Promise<{ token: string; expiresAt: number } | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('sync_metadata')
      .select('value')
      .eq('key', SYNC_META_KEY)
      .single()

    if (error || !data?.value) return null

    const value = data.value as { access_token: string; expires_at: number }
    if (!value.access_token || !value.expires_at) return null

    // 만료 60초 전 여유
    if (Date.now() >= value.expires_at - 60000) return null

    return { token: value.access_token, expiresAt: value.expires_at }
  } catch {
    return null
  }
}

/**
 * DB에 토큰 저장
 */
async function saveTokenToDB(accessToken: string, expiresAt: number): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('sync_metadata').upsert(
      {
        key: SYNC_META_KEY,
        value: { access_token: accessToken, expires_at: expiresAt },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
  } catch (error) {
    console.error('[KIS-Token] Failed to save token to DB:', error)
  }
}

/**
 * 토큰 획득 (DB → KIS API)
 */
async function acquireToken(): Promise<string | null> {
  // Step 1: DB 캐시 확인
  const dbToken = await getTokenFromDB()
  if (dbToken) {
    kisAccessToken = dbToken.token
    kisTokenExpiry = dbToken.expiresAt
    console.log('[KIS-Token] Token restored from DB cache')
    return kisAccessToken
  }

  // Step 2: KIS API 호출
  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET

  if (!appKey || !appSecret) {
    console.warn('[KIS-Token] APP_KEY or APP_SECRET not configured')
    return null
  }

  try {
    const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No body')
      console.error('[KIS-Token] Token request failed:', response.status, '-', errorBody)
      return null
    }

    interface KISTokenResponse {
      access_token: string
      token_type: string
      expires_in: number
    }

    const data: KISTokenResponse = await response.json()
    kisAccessToken = data.access_token
    kisTokenExpiry = Date.now() + data.expires_in * 1000

    // DB에 저장 (서버 재시작 시 복구용)
    await saveTokenToDB(kisAccessToken, kisTokenExpiry)

    console.log('[KIS-Token] New token acquired, expires in', data.expires_in, 'seconds')
    return kisAccessToken
  } catch (error) {
    console.error('[KIS-Token] Token error:', error)
    return null
  }
}
