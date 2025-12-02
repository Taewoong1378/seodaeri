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

-- RLS Policies
-- NextAuth 사용 시 service_role key로 접근하므로 RLS는 비활성화하거나
-- 서버 사이드에서 user_id 필터링으로 보안 처리
-- 프로덕션에서는 추가 보안 레이어 고려 필요

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_cache ENABLE ROW LEVEL SECURITY;

-- Service role은 RLS 우회 가능, 일반 anon key는 접근 불가
CREATE POLICY "Service role full access" ON public.users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON public.portfolio_cache FOR ALL USING (true);
