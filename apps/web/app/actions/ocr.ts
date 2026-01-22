'use server'

import { auth } from '@repo/auth/server'
import { createServiceClient } from '@repo/database/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import {
  appendSheetData,
  batchUpdateSheet,
  calculateNewAvgPrice,
  fetchSheetData,
  parsePortfolioData,
} from '../../lib/google-sheets'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface OCRResult {
  date: string
  ticker: string
  name?: string
  price: number
  quantity: number
  type: 'BUY' | 'SELL' | 'DIVIDEND'
}

export interface DividendOCRItem {
  date: string
  ticker: string
  name: string
  amountKRW: number
  amountUSD: number
}

export interface SaveTransactionResult {
  success: boolean
  transactionId?: string
  error?: string
}

export async function analyzeTradeImage(
  imageBase64: string,
  mode: 'trade' | 'dividend' = 'trade',
): Promise<OCRResult | null> {
  console.log(
    '[analyzeTradeImage] Called with mode:',
    mode,
    'imageBase64 length:',
    imageBase64?.length,
  )

  if (!process.env.OPENAI_API_KEY) {
    console.error('[analyzeTradeImage] OPENAI_API_KEY is not set')
    return null
  }

  const tradePrompt = `You are a financial data extraction assistant.
Analyze the provided image of a stock trading screen (likely from a Korean brokerage app).
Extract the following details:
- Date (YYYY-MM-DD format)
- Ticker (Stock Symbol, e.g., AAPL, TSLA, or Korean stock code like 005930)
- Name (Stock name, e.g., "Apple Inc", "삼성전자")
- Price (Unit price per share)
- Quantity (Number of shares)
- Type (BUY or SELL - look for keywords like 매수/매도, Buy/Sell, 체결)

Return ONLY a valid JSON object with keys: "date", "ticker", "name", "price", "quantity", "type".
If you cannot find a value, use null.
Ensure price and quantity are numbers (remove commas and currency symbols).
For Korean stocks, ticker should be the 6-digit code.`

  const dividendPrompt = `You are a financial data extraction assistant.
Analyze the provided image of a dividend payment notification (likely from a Korean brokerage app).
Extract the following details:
- Date (YYYY-MM-DD format, 배당 지급일 or 입금일)
- Ticker (Stock Symbol, e.g., AAPL, TSLA, or Korean stock code like 005930)
- Name (Stock name, e.g., "Apple Inc", "삼성전자")
- Price (Dividend amount AFTER tax in KRW, 세후 배당금. If shown in USD, convert to KRW using 1400)

Return ONLY a valid JSON object with keys: "date", "ticker", "name", "price".
If you cannot find a value, use null.
Ensure price is a number (remove commas and currency symbols).
For Korean stocks, ticker should be the 6-digit code.`

  try {
    console.log('[analyzeTradeImage] Sending request to OpenAI...')
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: mode === 'dividend' ? dividendPrompt : tradePrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                mode === 'dividend'
                  ? 'Extract dividend details from this image.'
                  : 'Extract trade details from this image.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    } as any)

    console.log('[analyzeTradeImage] OpenAI response received')
    const content = response.choices[0]?.message?.content
    console.log('[analyzeTradeImage] Content:', content)

    if (!content) {
      console.log('[analyzeTradeImage] No content in response')
      return null
    }

    const result = JSON.parse(content)
    console.log('[analyzeTradeImage] Parsed result:', result)

    const finalResult = {
      date: result.date || new Date().toISOString().split('T')[0],
      ticker: result.ticker || '',
      name: result.name || '',
      price: Number.parseFloat(result.price) || 0,
      quantity: mode === 'dividend' ? 1 : Number.parseFloat(result.quantity) || 0,
      type: mode === 'dividend' ? 'DIVIDEND' : result.type || 'BUY',
    }
    console.log('[analyzeTradeImage] Final result:', finalResult)
    return finalResult
  } catch (error) {
    console.error('[analyzeTradeImage] OCR Analysis failed:', error)
    return null
  }
}

/**
 * 배당 이미지에서 여러 배당내역을 추출
 * 한 이미지에 여러 종목의 배당 내역이 있을 수 있음
 */
export async function analyzeDividendImage(imageBase64: string): Promise<DividendOCRItem[]> {
  console.log('[analyzeDividendImage] Called, imageBase64 length:', imageBase64?.length)

  if (!process.env.OPENAI_API_KEY) {
    console.error('[analyzeDividendImage] OPENAI_API_KEY is not set')
    return []
  }

  const prompt = `You are a financial data extraction assistant.
Analyze the provided image which shows dividend payment records from a Korean brokerage app.
The image may contain MULTIPLE dividend entries - extract ALL of them.

For each dividend entry, extract:
- date: Payment date in YYYY-MM-DD format (배당 지급일, 입금일)
- ticker: Stock code (6-digit Korean code like 446720, or US ticker like AAPL)
- name: Stock name in Korean (e.g., "SOL 미국배당 다우존스", "Tiger 미국S&P500")
- amountKRW: Dividend amount in Korean Won (원화 배당금). Extract the number only.
- amountUSD: Dividend amount in USD (외화 배당금). Set to 0 if not shown or if it's a Korean stock.

IMPORTANT:
- Look for patterns like "₩5,560" or "₩32,780" for KRW amounts
- The stock code is usually a 6-digit number for Korean ETFs
- Extract ALL dividend entries visible in the image, not just one
- If a stock name contains the ticker, still try to find the actual 6-digit code

Return a JSON object with a "dividends" array containing all extracted entries:
{
  "dividends": [
    { "date": "2024-05-03", "ticker": "367380", "name": "ACE 미국나스닥100", "amountKRW": 5560, "amountUSD": 0 },
    { "date": "2024-05-03", "ticker": "360750", "name": "Tiger 미국S&P500", "amountKRW": 32780, "amountUSD": 0 }
  ]
}`

  try {
    console.log('[analyzeDividendImage] Sending request to OpenAI...')
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract ALL dividend entries from this image. Return them as a JSON array.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    } as any)

    console.log('[analyzeDividendImage] OpenAI response received')
    const content = response.choices[0]?.message?.content
    console.log('[analyzeDividendImage] Content:', content)

    if (!content) {
      console.log('[analyzeDividendImage] No content in response')
      return []
    }

    const result = JSON.parse(content)
    console.log('[analyzeDividendImage] Parsed result:', result)

    const dividends: DividendOCRItem[] = (result.dividends || []).map((item: any) => ({
      date: item.date || new Date().toISOString().split('T')[0],
      ticker: item.ticker || '',
      name: item.name || '',
      amountKRW: Number(item.amountKRW) || 0,
      amountUSD: Number(item.amountUSD) || 0,
    }))

    console.log('[analyzeDividendImage] Final dividends:', dividends)
    return dividends
  } catch (error) {
    console.error('[analyzeDividendImage] OCR Analysis failed:', error)
    return []
  }
}

/**
 * 거래 내역을 Supabase DB와 Google Sheet에 저장
 * 1. DB에 거래 로그 저장
 * 2. 시트 '8. 매매일지(App)' 탭에 거래 기록 추가
 * 3. 시트 '3. 종목현황' 탭에서 해당 종목의 수량/평단가 업데이트
 */
export async function saveTransaction(transaction: OCRResult): Promise<SaveTransactionResult> {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const supabase = createServiceClient()

  try {
    // 1. 사용자의 spreadsheet_id 조회
    // ID로 먼저 조회, 실패하면 이메일로 fallback
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
      return {
        success: false,
        error: '사용자 정보를 찾을 수 없습니다.',
      }
    }

    const totalAmount = transaction.price * transaction.quantity

    // 2. Supabase에 거래내역 저장 (Standalone 및 Sheet 모드 공통)
    const { data: insertedTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        ticker: transaction.ticker,
        name: transaction.name || null,
        type: transaction.type,
        price: transaction.price,
        quantity: transaction.quantity,
        total_amount: totalAmount,
        trade_date: transaction.date,
        sheet_synced: false,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to insert transaction:', insertError)
      return { success: false, error: '거래내역 저장에 실패했습니다.' }
    }

    // 3. Google Sheet 동기화 (Sheet 모드에서만)
    if (session.accessToken && user.spreadsheet_id) {
      let sheetSynced = false

      // 배당 vs 매매 분기 처리
      if (transaction.type === 'DIVIDEND') {
        try {
          // 배당내역 탭에 추가
          // "7. 배당내역" 탭: A=입금날짜, B=계좌구분, C=종목명, D=종목코드, E=통화, F=세전배당, G=세금, H=세후배당(원), I=세후배당($), J=비고
          const isKorean = /^\d{6}$/.test(transaction.ticker)
          await appendSheetData(session.accessToken, user.spreadsheet_id, "'7. 배당내역'!A:J", [
            [
              transaction.date,
              '일반 계좌', // 기본값
              transaction.name || transaction.ticker,
              transaction.ticker,
              isKorean ? 'KRW' : 'USD',
              '', // 세전배당 (알 수 없음)
              '', // 세금 (알 수 없음)
              isKorean ? transaction.price : '', // 세후배당(원)
              isKorean ? '' : (transaction.price / 1400).toFixed(2), // 세후배당($) - KRW로 입력받았으므로 역산
              'App에서 추가',
            ],
          ])

          sheetSynced = true
        } catch (appendError) {
          console.warn('Failed to append to 배당내역 tab:', appendError)
        }
      } else {
        // 매수/매도인 경우
        try {
          // 3-1. 매매일지 탭에 거래 기록 추가 (Append)
          // "8. 매매일지(App)" 탭: A=날짜, B=종목코드, C=종목명, D=거래유형, E=단가, F=수량, G=총금액
          await appendSheetData(
            session.accessToken,
            user.spreadsheet_id,
            "'8. 매매일지(App)'!A:G",
            [
              [
                transaction.date,
                transaction.ticker,
                transaction.name || '',
                transaction.type === 'BUY' ? '매수' : '매도',
                transaction.price,
                transaction.quantity,
                totalAmount,
              ],
            ],
          )

          sheetSynced = true
        } catch (appendError) {
          // 매매일지 탭이 없을 수 있음 - 에러 무시하고 계속 진행
          console.warn('Failed to append to 매매일지 tab (might not exist):', appendError)
        }

        try {
          // 3-2. 종목현황 탭에서 해당 종목 찾아서 수량/평단가 업데이트
          const portfolioRows = await fetchSheetData(
            session.accessToken,
            user.spreadsheet_id,
            "'3. 종목현황'!A:J",
          )

          if (portfolioRows) {
            const portfolio = parsePortfolioData(portfolioRows)
            const existingItem = portfolio.find(
              (item) => item.ticker.toUpperCase() === transaction.ticker.toUpperCase(),
            )

            if (existingItem) {
              // 기존 종목 - 평단가/수량 계산 후 업데이트
              const { newQty, newAvgPrice } = calculateNewAvgPrice(
                existingItem.quantity,
                existingItem.avgPrice,
                transaction.quantity,
                transaction.price,
                transaction.type,
              )

              // 수량(E열)과 평단가(F열) 업데이트
              const rowIndex = existingItem.rowIndex
              await batchUpdateSheet(session.accessToken, user.spreadsheet_id, [
                { range: `'3. 종목현황'!E${rowIndex}`, values: [[newQty]] },
                { range: `'3. 종목현황'!F${rowIndex}`, values: [[newAvgPrice]] },
              ])

              sheetSynced = true
            } else if (transaction.type === 'BUY') {
              // 신규 종목 매수 - 새 행 추가
              // A=종목명, B=국가, C=종목코드, D=통화, E=수량, F=평단가
              const isKorean = /^\d{6}$/.test(transaction.ticker)
              await appendSheetData(session.accessToken, user.spreadsheet_id, "'3. 종목현황'!A:F", [
                [
                  transaction.name || transaction.ticker,
                  isKorean ? '한국' : '미국',
                  transaction.ticker,
                  isKorean ? 'KRW' : 'USD',
                  transaction.quantity,
                  transaction.price,
                ],
              ])

              sheetSynced = true
            }
          }
        } catch (updateError) {
          console.error('Failed to update 종목현황:', updateError)
          // 종목현황 업데이트 실패해도 계속 진행
        }
      }

      // 시트 동기화 상태 업데이트
      if (sheetSynced) {
        await supabase
          .from('transactions')
          .update({ sheet_synced: true })
          .eq('id', insertedTransaction.id)
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/transactions')

    return {
      success: true,
      transactionId: insertedTransaction.id,
    }
  } catch (error) {
    console.error('saveTransaction error:', error)
    return { success: false, error: '거래내역 저장 중 오류가 발생했습니다.' }
  }
}
