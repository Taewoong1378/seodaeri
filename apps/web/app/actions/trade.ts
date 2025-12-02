'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';

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
