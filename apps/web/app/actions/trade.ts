'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';
import { deleteSheetRow, fetchSheetData } from '../../lib/google-sheets';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TradeOCRItem {
  date: string;
  ticker: string;
  name: string;
  price: number;
  quantity: number;
  type: 'BUY' | 'SELL';
}

export interface TradeInput {
  date: string;
  ticker: string;
  name: string;
  price: number;
  quantity: number;
  type: 'BUY' | 'SELL';
}

export interface SaveTradeResult {
  success: boolean;
  error?: string;
}

/**
 * 거래 이미지에서 여러 거래내역을 추출
 * 한 이미지에 여러 종목의 매수/매도 내역이 있을 수 있음
 */
export async function analyzeTradeImages(imageBase64: string): Promise<TradeOCRItem[]> {
  console.log('[analyzeTradeImages] Called, imageBase64 length:', imageBase64?.length);

  if (!process.env.OPENAI_API_KEY) {
    console.error('[analyzeTradeImages] OPENAI_API_KEY is not set');
    return [];
  }

  const prompt = `You are a financial data extraction assistant.
Analyze the provided image which shows stock trading records from a Korean brokerage app.
The image may contain MULTIPLE trade entries - extract ALL of them.

For each trade entry, extract:
- date: Trade date in YYYY-MM-DD format (체결일, 거래일)
- ticker: Stock code (6-digit Korean code like 005930, or US ticker like AAPL)
- name: Stock name (e.g., "삼성전자", "Apple Inc")
- price: Price per share (단가, 체결가). Extract the number only.
- quantity: Number of shares (수량, 체결수량). Extract the number only.
- type: "BUY" for 매수, "SELL" for 매도

IMPORTANT:
- Look for patterns like "매수" or "Buy" for BUY, "매도" or "Sell" for SELL
- The stock code is usually a 6-digit number for Korean stocks
- Extract ALL trade entries visible in the image, not just one
- For Korean stocks, remove comma separators from numbers

Return a JSON object with a "trades" array containing all extracted entries:
{
  "trades": [
    { "date": "2024-12-01", "ticker": "005930", "name": "삼성전자", "price": 55000, "quantity": 10, "type": "BUY" },
    { "date": "2024-12-01", "ticker": "035720", "name": "카카오", "price": 42000, "quantity": 5, "type": "SELL" }
  ]
}`;

  try {
    console.log('[analyzeTradeImages] Sending request to OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract ALL trade entries from this image. Return them as a JSON array." },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    console.log('[analyzeTradeImages] OpenAI response received');
    const content = response.choices[0]?.message?.content;
    console.log('[analyzeTradeImages] Content:', content);

    if (!content) {
      console.log('[analyzeTradeImages] No content in response');
      return [];
    }

    const result = JSON.parse(content);
    console.log('[analyzeTradeImages] Parsed result:', result);

    const trades: TradeOCRItem[] = (result.trades || []).map((item: any) => ({
      date: item.date || new Date().toISOString().split('T')[0],
      ticker: item.ticker || '',
      name: item.name || '',
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
      type: item.type === 'SELL' ? 'SELL' : 'BUY',
    }));

    console.log('[analyzeTradeImages] Final trades:', trades);
    return trades;
  } catch (error) {
    console.error('[analyzeTradeImages] OCR Analysis failed:', error);
    return [];
  }
}

/**
 * 거래 내역을 Supabase DB에만 저장 (시트 연동 없음)
 */
export async function saveTradeTransactions(trades: TradeInput[]): Promise<SaveTradeResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  if (trades.length === 0) {
    return { success: false, error: '저장할 거래내역이 없습니다.' };
  }

  const supabase = createServiceClient();

  try {
    // 모든 거래내역을 DB에 저장
    const insertData = trades.map((trade) => ({
      user_id: session.user.id,
      ticker: trade.ticker,
      name: trade.name || null,
      type: trade.type,
      price: trade.price,
      quantity: trade.quantity,
      total_amount: trade.price * trade.quantity,
      trade_date: trade.date,
      sheet_synced: true, // 시트 연동 불필요
    }));

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(insertData);

    if (insertError) {
      console.error('Failed to insert trades:', insertError);
      return { success: false, error: '거래내역 저장에 실패했습니다.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/transactions');

    return { success: true };
  } catch (error) {
    console.error('saveTradeTransactions error:', error);
    return { success: false, error: '저장 중 오류가 발생했습니다.' };
  }
}

export interface DeleteTransactionInput {
  id?: string;          // Supabase UUID (앱에서 추가한 거래)
  date: string;         // YYYY-MM-DD
  ticker: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
}

/**
 * 거래내역 삭제 (Supabase + Google Sheet)
 */
export async function deleteTransaction(input: DeleteTransactionInput): Promise<SaveTradeResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  if (!session.accessToken) {
    return { success: false, error: 'Google 인증이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    // 사용자의 spreadsheet_id 조회
    let { data: user } = await supabase
      .from('users')
      .select('id, spreadsheet_id')
      .eq('id', session.user.id)
      .single();

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, spreadsheet_id')
        .eq('email', session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
      }
    }

    if (!user) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    const userId = user.id as string;

    // 1. Supabase에서 삭제
    if (input.id) {
      // UUID로 직접 삭제
      await supabase
        .from('transactions')
        .delete()
        .eq('id', input.id)
        .eq('user_id', userId);
    } else {
      // 조건으로 삭제
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId)
        .eq('ticker', input.ticker)
        .eq('type', input.type)
        .eq('trade_date', input.date)
        .eq('price', input.price)
        .eq('quantity', input.quantity);
    }

    // 2. Google Sheet에서 해당 행 찾아서 삭제 (시트가 있는 경우)
    if (user.spreadsheet_id) {
      const sheetName = '4. 매매내역';
      try {
        const rows = await fetchSheetData(
          session.accessToken,
          user.spreadsheet_id,
          `'${sheetName}'!A:J`
        );

        if (rows) {
          // 매칭되는 행 찾기 (날짜 + 종목코드 + 타입 + 가격 + 수량)
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;

            const rowDate = String(row[0] || '').trim(); // A열: 일자
            const rowTicker = String(row[4] || '').trim(); // E열: 종목코드
            const rowType = String(row[5] || '').trim(); // F열: 구분 (매수/매도)
            const rowPriceStr = String(row[6] || '0'); // G열: 단가
            const rowQuantityStr = String(row[7] || '0'); // H열: 수량

            const rowPrice = parseFloat(rowPriceStr.replace(/[₩$,\s]/g, '')) || 0;
            const rowQuantity = parseFloat(rowQuantityStr.replace(/[,\s]/g, '')) || 0;

            // 날짜 형식 맞추기
            const normalizedRowDate = rowDate.replace(/\//g, '-');

            // 타입 매칭
            const isBuy = rowType.includes('매수') || rowType.toLowerCase().includes('buy');
            const matchType = (input.type === 'BUY' && isBuy) ||
                             (input.type === 'SELL' && !isBuy);

            if (
              normalizedRowDate === input.date &&
              rowTicker === input.ticker &&
              matchType &&
              Math.abs(rowPrice - input.price) < 1 &&
              Math.abs(rowQuantity - input.quantity) < 0.01
            ) {
              // 행 삭제
              await deleteSheetRow(
                session.accessToken,
                user.spreadsheet_id,
                sheetName,
                i
              );
              break;
            }
          }
        }
      } catch (sheetError) {
        // 시트 삭제 실패해도 DB 삭제는 성공한 것으로 처리
        console.error('Sheet row deletion failed:', sheetError);
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/transactions');

    return { success: true };
  } catch (error: any) {
    console.error('deleteTransaction error:', error);
    const errorMessage = error?.message || '알 수 없는 오류';
    return { success: false, error: `삭제 실패: ${errorMessage}` };
  }
}
