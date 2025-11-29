'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { fetchSheetData, parsePortfolioData } from '../../lib/google-sheets';

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const supabase = createServiceClient();

  // Fetch cached portfolio data
  const { data: portfolio } = await supabase
    .from('portfolio_cache')
    .select('*')
    .eq('user_id', session.user.id);

  // Calculate total assets and yield based on cache
  let totalAsset = 0;
  let totalInvested = 0;

  if (portfolio) {
    for (const item of portfolio) {
      const currentVal = (item.current_price || 0) * (item.quantity || 0);
      const investedVal = (item.avg_price || 0) * (item.quantity || 0);
      
      // Simple currency conversion for MVP (assuming 1 USD = 1400 KRW if not handled)
      // Ideally we should fetch exchange rate
      const rate = item.currency === 'USD' ? 1400 : 1;
      
      totalAsset += currentVal * rate;
      totalInvested += investedVal * rate;
    }
  }

  const totalYield = totalInvested > 0 
    ? ((totalAsset - totalInvested) / totalInvested) * 100 
    : 0;

  return {
    totalAsset: Math.round(totalAsset),
    totalYield: Number.parseFloat(totalYield.toFixed(2)),
    portfolio: portfolio || [],
  };
}

export async function syncPortfolio() {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    throw new Error('Unauthorized or missing access token');
  }

  const supabase = createServiceClient();

  // Get user's spreadsheet ID
  const { data: user } = await supabase
    .from('users')
    .select('spreadsheet_id')
    .eq('id', session.user.id)
    .single();

  if (!user?.spreadsheet_id) {
    throw new Error('Spreadsheet ID not found');
  }

  // Fetch data from Google Sheets
  // Assuming '3. 종목현황' is the tab name and data is in A:J
  const rows = await fetchSheetData(session.accessToken, user.spreadsheet_id, "'3. 종목현황'!A:J");
  const parsedData = parsePortfolioData(rows || []);

  // Update portfolio_cache
  if (parsedData.length > 0) {
    const upsertData = parsedData.map(item => {
      if (!item) return null;
      return {
        user_id: session.user.id,
        ticker: item.ticker,
        avg_price: item.avgPrice,
        quantity: item.quantity,
        current_price: item.currentPrice,
        currency: item.currency,
        updated_at: new Date().toISOString(),
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const { error } = await supabase
      .from('portfolio_cache')
      .upsert(upsertData, { onConflict: 'user_id,ticker' });

    if (error) throw error;
  }

  return { success: true, count: parsedData.length };
}
