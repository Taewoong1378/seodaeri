'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';
import { appendSheetData } from '../../lib/google-sheets';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OCRResult {
  date: string;
  ticker: string;
  name?: string;
  price: number;
  quantity: number;
  type: 'BUY' | 'SELL';
}

export interface SaveTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export async function analyzeTradeImage(imageBase64: string): Promise<OCRResult | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial data extraction assistant.
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
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract trade details from this image." },
            {
              type: "image_url",
              image_url: {
                url: imageBase64, // base64 string should include data:image/jpeg;base64, prefix
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const result = JSON.parse(content);
    
    return {
      date: result.date || new Date().toISOString().split('T')[0],
      ticker: result.ticker || '',
      name: result.name || '',
      price: Number.parseFloat(result.price) || 0,
      quantity: Number.parseFloat(result.quantity) || 0,
      type: result.type || 'BUY',
    };
  } catch (error) {
    console.error('OCR Analysis failed:', error);
    return null;
  }
}

/**
 * 거래 내역을 Supabase DB와 Google Sheet에 저장
 */
export async function saveTransaction(transaction: OCRResult): Promise<SaveTransactionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    // 1. 사용자의 spreadsheet_id 조회
    const { data: user } = await supabase
      .from('users')
      .select('spreadsheet_id')
      .eq('id', session.user.id)
      .single();

    if (!user?.spreadsheet_id) {
      return { success: false, error: '연동된 스프레드시트가 없습니다. 온보딩을 먼저 완료해주세요.' };
    }

    const totalAmount = transaction.price * transaction.quantity;

    // 2. Supabase에 거래내역 저장
    const { data: insertedTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: session.user.id,
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
      .single();

    if (insertError) {
      console.error('Failed to insert transaction:', insertError);
      return { success: false, error: '거래내역 저장에 실패했습니다.' };
    }

    // 3. Google Sheet에 데이터 추가
    if (session.accessToken) {
      try {
        // "2. 거래내역" 시트에 추가 (A: 날짜, B: 종목코드, C: 종목명, D: 거래유형, E: 단가, F: 수량, G: 총금액)
        await appendSheetData(
          session.accessToken,
          user.spreadsheet_id,
          '2. 거래내역!A:G',
          [[
            transaction.date,
            transaction.ticker,
            transaction.name || '',
            transaction.type === 'BUY' ? '매수' : '매도',
            transaction.price,
            transaction.quantity,
            totalAmount,
          ]]
        );

        // 시트 동기화 완료 표시
        await supabase
          .from('transactions')
          .update({ sheet_synced: true })
          .eq('id', insertedTransaction.id);

      } catch (sheetError) {
        console.error('Failed to sync to sheet:', sheetError);
        // 시트 동기화 실패해도 DB에는 저장되었으므로 부분 성공
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/transactions');

    return {
      success: true,
      transactionId: insertedTransaction.id,
    };
  } catch (error) {
    console.error('saveTransaction error:', error);
    return { success: false, error: '거래내역 저장 중 오류가 발생했습니다.' };
  }
}
