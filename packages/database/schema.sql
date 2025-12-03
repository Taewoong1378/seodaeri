-- 1. Users (사용자 정보)
-- NextAuth 사용 시 auth.users 참조 제거 (NextAuth는 자체 세션 관리)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT NOT NULL PRIMARY KEY, -- NextAuth user.id (Google sub claim)
    email TEXT UNIQUE,
    name TEXT,
    image TEXT,
    spreadsheet_id TEXT, -- 연동된 구글 시트 ID
    auto_deposit_settings JSONB, -- 자동 입금 설정 { amount, dayOfMonth, memo, enabled }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 기존 테이블에 auto_deposit_settings 컬럼 추가 (마이그레이션용)
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auto_deposit_settings JSONB;

-- 2. Transactions (매매 내역 로그 - Source of Truth for History)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) NOT NULL,
    ticker TEXT NOT NULL,        -- 종목코드 (예: AAPL, 005930)
    name TEXT,                   -- 종목명
    type VARCHAR(10) CHECK (type IN ('BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAW')),
    price NUMERIC,               -- 거래 단가
    quantity NUMERIC,            -- 수량
    total_amount NUMERIC,        -- 총 거래액 (price * quantity)
    trade_date DATE,             -- 거래일
    image_url TEXT,              -- 인증샷 이미지 경로 (Storage)
    sheet_synced BOOLEAN DEFAULT FALSE, -- 시트 반영 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Portfolio_Snapshot (앱 구동 속도용 캐시)
-- 매번 시트를 긁어오면 느리므로, 시트 데이터를 이 테이블에 캐싱합니다.
CREATE TABLE IF NOT EXISTS public.portfolio_cache (
    user_id TEXT REFERENCES public.users(id) NOT NULL,
    ticker TEXT NOT NULL,
    avg_price NUMERIC, -- 평단가
    quantity NUMERIC,  -- 수량
    current_price NUMERIC, -- 현재가 (from Sheet)
    currency TEXT, -- KRW or USD
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, ticker)
);

-- 4. Dividends (배당금 내역 - Sheet 동기화)
CREATE TABLE IF NOT EXISTS public.dividends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) NOT NULL,
    ticker TEXT NOT NULL,           -- 종목코드
    name TEXT,                      -- 종목명
    amount_krw NUMERIC DEFAULT 0,   -- 원화 배당금
    amount_usd NUMERIC DEFAULT 0,   -- 달러 배당금
    dividend_date DATE NOT NULL,    -- 배당일
    sheet_synced BOOLEAN DEFAULT TRUE, -- Sheet에서 동기화된 데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, ticker, dividend_date, amount_krw, amount_usd) -- 중복 방지
);

-- 5. Deposits (입출금 내역)
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('DEPOSIT', 'WITHDRAW')) NOT NULL,
    amount NUMERIC NOT NULL,        -- 금액
    currency VARCHAR(3) DEFAULT 'KRW', -- KRW or USD
    deposit_date DATE NOT NULL,     -- 입출금일
    memo TEXT,                      -- 메모
    sheet_synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, type, amount, deposit_date) -- 중복 방지
);

-- 6. Portfolio Snapshots (일별 포트폴리오 스냅샷 - 통계/분석용)
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) NOT NULL,
    snapshot_date DATE NOT NULL,    -- 스냅샷 날짜
    total_asset NUMERIC,            -- 총 자산
    total_invested NUMERIC,         -- 총 투자원금
    total_profit NUMERIC,           -- 총 수익금
    yield_percent NUMERIC,          -- 수익률 (%)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, snapshot_date)  -- 유저당 하루 1개
);

-- 7. Holdings (종목별 보유 현황 - 실시간)
CREATE TABLE IF NOT EXISTS public.holdings (
    user_id TEXT REFERENCES public.users(id) NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    quantity NUMERIC,
    avg_price NUMERIC,
    currency VARCHAR(3) DEFAULT 'KRW',
    broker TEXT,                    -- 증권사 (키움, 토스 등)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, ticker)
);

-- RLS Policies
-- NextAuth 사용 시 service_role key로 접근하므로 RLS는 비활성화하거나
-- 서버 사이드에서 user_id 필터링으로 보안 처리
-- 프로덕션에서는 추가 보안 레이어 고려 필요

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- Service role은 RLS 우회 가능, 일반 anon key는 접근 불가
CREATE POLICY "Service role full access" ON public.users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.portfolio_cache FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.dividends FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.deposits FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.portfolio_snapshots FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.holdings FOR ALL USING (true);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_dividends_user_date ON public.dividends(user_id, dividend_date);
CREATE INDEX IF NOT EXISTS idx_deposits_user_date ON public.deposits(user_id, deposit_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, trade_date);
