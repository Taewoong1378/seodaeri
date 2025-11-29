'use server';

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OCRResult {
  date: string;
  ticker: string;
  price: number;
  quantity: number;
  type: 'BUY' | 'SELL';
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
          - Ticker (Stock Symbol, e.g., AAPL, TSLA, or Korean stock code)
          - Price (Unit price)
          - Quantity (Number of shares)
          - Type (BUY or SELL)

          Return ONLY a valid JSON object with keys: "date", "ticker", "price", "quantity", "type".
          If you cannot find a value, use null.
          Ensure price and quantity are numbers (remove commas).`
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
      price: Number.parseFloat(result.price) || 0,
      quantity: Number.parseFloat(result.quantity) || 0,
      type: result.type || 'BUY',
    };
  } catch (error) {
    console.error('OCR Analysis failed:', error);
    return null;
  }
}
