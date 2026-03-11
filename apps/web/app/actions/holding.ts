'use server'

import { auth } from '@repo/auth/server'
import { createServiceClient } from '@repo/database/server'
import { revalidatePath } from 'next/cache'
import { batchUpdateSheet, deleteSheetRow, fetchSheetData } from '../../lib/google-sheets'

export interface HoldingInput {
  country: string // 국가 (한국, 미국 등)
  ticker: string // 종목코드
  name: string // 종목명
  quantity: number // 수량
  avgPrice: number // 평단가
  currency: 'KRW' | 'USD' // 통화
  mode?: 'add' | 'edit' // 'add' = 추가매수 (수량합산+평단계산), 'edit' = 직접수정 (그대로 덮어쓰기)
}

export interface SaveHoldingResult {
  success: boolean
  error?: string
}

/**
 * 종목 보유현황 저장 (Standalone 또는 Google Sheet)
 * 시트 구조: "3. 종목현황" - C열=국가(수식), D열=종목코드, E열=종목명, F열=수량, G열=평단가(원화), H열=평단가(달러)
 * D~H열만 수정 가능 (C열은 수식이므로 건드리지 않음)
 * Row 9부터 데이터 시작
 */
export async function saveHolding(input: HoldingInput): Promise<SaveHoldingResult> {
  console.log('[saveHolding] Called with input:', JSON.stringify(input))

  const session = await auth()

  if (!session?.user?.id) {
    console.log('[saveHolding] No session user id')
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const supabase = createServiceClient()

  try {
    // 사용자의 spreadsheet_id 조회
    let { data: user } = await supabase
      .from('users')
      .select('id, spreadsheet_id')
      .eq('id', session.user.id)
      .single()

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, spreadsheet_id')
        .eq('email', session.user.email)
        .single()

      if (userByEmail) {
        user = userByEmail
      }
    }

    if (!user?.id) {
      console.log('[saveHolding] No user found')
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' }
    }

    const dbUserId = user.id as string

    // Standalone 모드: DB에만 저장
    if (!user.spreadsheet_id) {
      console.log('[saveHolding] Standalone mode - saving to DB only')

      let finalQuantity = input.quantity
      let finalAvgPrice = input.avgPrice

      // 추가매수 모드: 기존 보유분과 합산
      if (input.mode !== 'edit') {
        const { data: existing } = await supabase
          .from('holdings')
          .select('quantity, avg_price')
          .eq('user_id', dbUserId)
          .eq('ticker', input.ticker)
          .single()

        if (
          existing &&
          existing.quantity != null &&
          existing.quantity > 0 &&
          existing.avg_price != null
        ) {
          const oldQty = existing.quantity
          const oldPrice = existing.avg_price
          finalQuantity = oldQty + input.quantity
          finalAvgPrice = (oldQty * oldPrice + input.quantity * input.avgPrice) / finalQuantity
          console.log(
            `[saveHolding] Merging: ${oldQty}@${oldPrice} + ${input.quantity}@${input.avgPrice} = ${finalQuantity}@${finalAvgPrice.toFixed(2)}`,
          )
        }
      }

      const { error: dbError } = await supabase.from('holdings').upsert(
        {
          user_id: dbUserId,
          ticker: input.ticker,
          name: input.name,
          quantity: finalQuantity,
          avg_price: finalAvgPrice,
          currency: input.currency,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,ticker' },
      )

      if (dbError) {
        console.error('[saveHolding] DB upsert error:', dbError)
        return { success: false, error: '종목 저장에 실패했습니다.' }
      }

      console.log('[saveHolding] Standalone mode - Success!')
      revalidatePath('/portfolio')
      revalidatePath('/dashboard')
      return { success: true }
    }

    // Sheet 모드: Google Sheet에도 저장
    if (!session.accessToken) {
      console.log('[saveHolding] No access token')
      return { success: false, error: 'Google 인증이 필요합니다.' }
    }
    console.log('[saveHolding] Using dbUserId:', dbUserId)

    // 기존 데이터를 읽어서 해당 종목이 이미 있는지 확인
    // D~H열 범위로 읽기
    const existingData = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      "'3. 종목현황'!D:H",
    )

    console.log('[saveHolding] Existing data rows:', existingData?.length || 0)

    // 해당 종목이 이미 있는지 찾기 (Row 9부터 데이터)
    let existingRow = -1
    if (existingData && existingData.length > 0) {
      for (let i = 8; i < existingData.length; i++) {
        // Row 9 = index 8
        const row = existingData[i]
        if (row && Array.isArray(row) && row.length >= 1) {
          const rowTicker = String(row[0] || '').trim() // D열 = index 0 (D:H 범위에서)
          if (rowTicker === input.ticker) {
            existingRow = i + 1 // 1-based row number
            console.log('[saveHolding] Found existing ticker at row:', existingRow)
            break
          }
        }
      }
    }

    let finalQuantity = input.quantity
    let finalAvgPrice = input.avgPrice

    // 추가매수 모드: 기존 보유분과 합산
    if (existingRow !== -1 && input.mode !== 'edit' && existingData) {
      const existingRowData = existingData[existingRow - 1] // 0-based index
      if (existingRowData && Array.isArray(existingRowData)) {
        // D:H 범위: [0]=종목코드, [1]=종목명, [2]=수량, [3]=평단가원화, [4]=평단가달러
        const oldQty = Number.parseFloat(String(existingRowData[2] || '0').replace(/,/g, '')) || 0
        const oldPriceKRW =
          Number.parseFloat(String(existingRowData[3] || '0').replace(/[₩,]/g, '')) || 0
        const oldPriceUSD =
          Number.parseFloat(String(existingRowData[4] || '0').replace(/[$,]/g, '')) || 0
        const oldPrice = input.currency === 'USD' ? oldPriceUSD : oldPriceKRW

        if (oldQty > 0 && oldPrice > 0) {
          finalQuantity = oldQty + input.quantity
          finalAvgPrice = (oldQty * oldPrice + input.quantity * input.avgPrice) / finalQuantity
          console.log(
            `[saveHolding] Sheet merge: ${oldQty}@${oldPrice} + ${input.quantity}@${input.avgPrice} = ${finalQuantity}@${finalAvgPrice.toFixed(2)}`,
          )
        }
      }
    }

    // 새 종목이면 빈 행 찾기 (Row 9부터)
    let targetRow = existingRow
    if (targetRow === -1) {
      // 빈 행 찾기 (D열에 종목코드가 없는 행)
      for (let i = 8; i < Math.max(existingData?.length || 0, 30); i++) {
        const row = existingData?.[i]
        const dVal = row?.[0] // D열 = index 0 (종목코드)

        // D열(종목코드)이 비어있으면 빈 행
        if (!dVal || (typeof dVal === 'string' && dVal.trim() === '')) {
          targetRow = i + 1
          console.log('[saveHolding] Found empty row at:', targetRow)
          break
        }
      }

      // 빈 행을 찾지 못하면 마지막 데이터 다음 행
      if (targetRow === -1) {
        targetRow = Math.max((existingData?.length || 8) + 1, 9)
        console.log('[saveHolding] Using next available row:', targetRow)
      }
    }

    console.log('[saveHolding] Writing to row:', targetRow)

    // 시트에 데이터 저장
    const isCash = input.ticker === 'CASH'

    if (isCash) {
      // CASH 특수 처리: "현금" 행을 찾아서 G열(원화), H열(달러)만 수정
      let cashRow = -1
      if (existingData) {
        for (let i = 8; i < existingData.length; i++) {
          const row = existingData[i]
          if (row && Array.isArray(row)) {
            const rowTicker = String(row[0] || '').trim() // D열
            const rowName = String(row[1] || '').trim() // E열
            if (rowTicker === '현금' || rowName === '현금') {
              cashRow = i + 1 // 1-based row number
              console.log('[saveHolding] Found 현금 row at:', cashRow)
              break
            }
          }
        }
      }

      if (cashRow === -1) {
        console.error('[saveHolding] 현금 row not found in spreadsheet')
        return { success: false, error: '스프레드시트에서 현금 행을 찾을 수 없습니다.' }
      }

      const krwAmount = input.quantity // 원화
      const usdAmount = input.avgPrice // 달러

      // G열(원화)과 H열(달러)만 수정
      const sheetResult = await batchUpdateSheet(session.accessToken, user.spreadsheet_id, [
        {
          range: `'3. 종목현황'!G${cashRow}:H${cashRow}`,
          values: [[krwAmount, usdAmount]],
        },
      ])
      console.log('[saveHolding] Cash sheet write result:', sheetResult)

      // DB에도 저장
      await supabase.from('holdings').upsert(
        {
          user_id: dbUserId,
          ticker: 'CASH',
          name: '현금',
          quantity: krwAmount,
          avg_price: usdAmount,
          currency: 'KRW',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,ticker' },
      )

      revalidatePath('/portfolio')
      revalidatePath('/dashboard')
      return { success: true }
    }

    // 일반 종목: D~H열 수정 (C열은 수식이므로 건드리지 않음)
    // D열=종목코드, E열=종목명, F열=수량, G열=평단가(원화), H열=평단가(달러, 미국 종목만)
    const avgPriceUSD = input.currency === 'USD' ? finalAvgPrice : ''
    const avgPriceKRW = input.currency === 'KRW' ? finalAvgPrice : ''
    const sheetValues = [input.ticker, input.name, finalQuantity, avgPriceKRW, avgPriceUSD]

    const sheetResult = await batchUpdateSheet(session.accessToken, user.spreadsheet_id, [
      {
        range: `'3. 종목현황'!D${targetRow}:H${targetRow}`,
        values: [sheetValues],
      },
    ])

    console.log('[saveHolding] Sheet write result:', sheetResult)

    // Supabase에도 저장 (upsert)
    const { error: dbError } = await supabase.from('holdings').upsert(
      {
        user_id: dbUserId,
        ticker: input.ticker,
        name: input.name,
        quantity: finalQuantity,
        avg_price: finalAvgPrice,
        currency: input.currency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,ticker' },
    )

    if (dbError) {
      console.error('[saveHolding] Supabase upsert error:', dbError)
      // 시트 저장은 성공했으므로 에러 무시
    }

    revalidatePath('/portfolio')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error: any) {
    console.error('[saveHolding] Error:', error)
    const errorMessage = error?.message || '알 수 없는 오류'
    return { success: false, error: `저장 실패: ${errorMessage}` }
  }
}

/**
 * 종목 삭제 (Standalone 또는 Google Sheet + Supabase)
 * D~H열만 비움 (C열은 수식이므로 건드리지 않음)
 */
export async function deleteHolding(ticker: string): Promise<SaveHoldingResult> {
  console.log('[deleteHolding] Called with ticker:', ticker)

  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const supabase = createServiceClient()

  try {
    let { data: user } = await supabase
      .from('users')
      .select('id, spreadsheet_id')
      .eq('id', session.user.id)
      .single()

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, spreadsheet_id')
        .eq('email', session.user.email)
        .single()

      if (userByEmail) {
        user = userByEmail
      }
    }

    if (!user?.id) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' }
    }

    const dbUserId = user.id as string

    // Standalone 모드: DB에서만 삭제
    if (!user.spreadsheet_id) {
      console.log('[deleteHolding] Standalone mode - deleting from DB only')

      const { error: dbError } = await supabase
        .from('holdings')
        .delete()
        .eq('user_id', dbUserId)
        .eq('ticker', ticker)

      if (dbError) {
        console.error('[deleteHolding] DB delete error:', dbError)
        return { success: false, error: '종목 삭제에 실패했습니다.' }
      }

      // portfolio_cache도 정리 (stale 가격 방지)
      await supabase.from('portfolio_cache').delete().eq('user_id', dbUserId).eq('ticker', ticker)

      console.log('[deleteHolding] Standalone mode - Success!')
      revalidatePath('/portfolio')
      revalidatePath('/dashboard')
      return { success: true }
    }

    // Sheet 모드: Google Sheet에서도 삭제
    if (!session.accessToken) {
      return { success: false, error: 'Google 인증이 필요합니다.' }
    }

    // Google Sheet에서 해당 종목 찾아서 비우기
    const sheetName = '3. 종목현황'
    const rows = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      `'${sheetName}'!D:H`,
    )

    if (rows && rows.length > 0) {
      if (ticker === 'CASH') {
        // CASH 특수 처리: "현금" 행의 G/H열만 비우기
        for (let i = 8; i < rows.length; i++) {
          const row = rows[i]
          if (row && Array.isArray(row)) {
            const rowTicker = String(row[0] || '').trim()
            const rowName = String(row[1] || '').trim()
            if (rowTicker === '현금' || rowName === '현금') {
              console.log('[deleteHolding] Found 현금 at row:', i + 1, ', clearing G~H...')
              await batchUpdateSheet(session.accessToken, user.spreadsheet_id, [
                {
                  range: `'${sheetName}'!G${i + 1}:H${i + 1}`,
                  values: [['', '']],
                },
              ])
              break
            }
          }
        }
      } else {
        // 일반 종목: D~H열 비우기
        for (let i = 8; i < rows.length; i++) {
          const row = rows[i]
          if (row && Array.isArray(row) && row.length >= 1) {
            const rowTicker = String(row[0] || '').trim()
            if (rowTicker === ticker) {
              console.log('[deleteHolding] Found at row:', i + 1, ', clearing D~H...')
              await batchUpdateSheet(session.accessToken, user.spreadsheet_id, [
                {
                  range: `'${sheetName}'!D${i + 1}:H${i + 1}`,
                  values: [['', '', '', '', '']],
                },
              ])
              break
            }
          }
        }
      }
    }

    // Supabase에서 삭제
    const { error: dbError } = await supabase
      .from('holdings')
      .delete()
      .eq('user_id', dbUserId)
      .eq('ticker', ticker)

    if (dbError) {
      console.error('[deleteHolding] Supabase delete error:', dbError)
    }

    revalidatePath('/portfolio')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error: any) {
    console.error('[deleteHolding] Error:', error)
    return { success: false, error: `삭제 실패: ${error?.message || '알 수 없는 오류'}` }
  }
}

/**
 * 보유 종목 목록 조회 (Google Sheet에서)
 * 시트 구조: C열=국가(수식), D열=종목코드, E열=종목명, F열=수량, G열=평단가(원화), H열=평단가(달러)
 * C열은 수식이지만 값을 읽어올 수 있음
 */
export interface HoldingRecord {
  ticker: string
  name: string
  country: string
  quantity: number
  avgPrice: number
  currency: 'KRW' | 'USD'
}

/**
 * 환율 조회 (클라이언트에서 사용)
 */
export async function getExchangeRate(): Promise<number> {
  try {
    const { getUSDKRWRate } = await import('../../lib/exchange-rate-api')
    return await getUSDKRWRate()
  } catch {
    return 1400 // fallback
  }
}

export async function getHoldings(): Promise<HoldingRecord[]> {
  const session = await auth()

  if (!session?.user?.id) {
    return []
  }

  const supabase = createServiceClient()

  try {
    let { data: user } = await supabase
      .from('users')
      .select('id, spreadsheet_id')
      .eq('id', session.user.id)
      .single()

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, spreadsheet_id')
        .eq('email', session.user.email)
        .single()

      if (userByEmail) {
        user = userByEmail
      }
    }

    if (!user?.id) {
      return []
    }

    const dbUserId = user.id as string

    // Standalone 모드: DB에서 조회
    if (!user.spreadsheet_id) {
      console.log('[getHoldings] Standalone mode - fetching from DB')

      const { data: holdings } = await supabase.from('holdings').select('*').eq('user_id', dbUserId)

      if (!holdings || holdings.length === 0) {
        return []
      }

      return holdings.map((h) => ({
        ticker: h.ticker,
        name: h.name || h.ticker,
        country: h.currency === 'USD' ? '미국' : '한국',
        quantity: h.quantity || 0,
        avgPrice: h.avg_price || 0,
        currency: (h.currency as 'KRW' | 'USD') || 'KRW',
      }))
    }

    // Sheet 모드: Google Sheet에서 조회
    if (!session.accessToken) {
      return []
    }

    // C:H 범위로 읽기 (C=국가수식결과, D=종목코드, E=종목명, F=수량, G=평단가원화, H=평단가달러)
    const rows = await fetchSheetData(session.accessToken, user.spreadsheet_id, "'3. 종목현황'!C:H")

    if (!rows || rows.length <= 8) {
      return []
    }

    const results: HoldingRecord[] = []

    for (let i = 8; i < rows.length; i++) {
      // Row 9부터
      const row = rows[i]
      if (!row || !Array.isArray(row) || row.length < 4) continue

      const country = String(row[0] || '').trim() // C열: 국가 (수식 결과)
      const ticker = String(row[1] || '').trim() // D열: 종목코드
      const name = String(row[2] || '').trim() // E열: 종목명
      const quantity = Number.parseFloat(String(row[3] || '0').replace(/,/g, '')) || 0 // F열: 수량
      const avgPriceKRW = Number.parseFloat(String(row[4] || '0').replace(/[₩,]/g, '')) || 0 // G열: 평단가(원화)
      const avgPriceUSD = Number.parseFloat(String(row[5] || '0').replace(/[$,]/g, '')) || 0 // H열: 평단가(달러)

      // "현금" 행 → CASH 티커로 매핑 (G=원화, H=달러)
      if (ticker === '현금' || name === '현금') {
        if (avgPriceKRW > 0 || avgPriceUSD > 0) {
          results.push({
            ticker: 'CASH',
            name: '현금',
            country: '한국',
            quantity: avgPriceKRW, // 원화 금액
            avgPrice: avgPriceUSD, // 달러 금액
            currency: 'KRW',
          })
        }
        continue
      }

      if (!ticker || quantity <= 0) continue

      // 국가에 따라 해당 통화의 평단가 사용
      const isUS = country === '미국'
      const avgPrice = isUS ? avgPriceUSD : avgPriceKRW

      results.push({
        ticker,
        name: name || ticker,
        country: country || '한국',
        quantity,
        avgPrice,
        currency: isUS ? 'USD' : 'KRW',
      })
    }

    return results
  } catch (error) {
    console.error('[getHoldings] Error:', error)
    return []
  }
}
