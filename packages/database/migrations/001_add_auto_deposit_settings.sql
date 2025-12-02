-- Migration: Add auto_deposit_settings column to users table
-- Date: 2025-12-02
-- Description: 자동 입금 설정 기능을 위한 JSONB 컬럼 추가

-- users 테이블에 auto_deposit_settings 컬럼 추가
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auto_deposit_settings JSONB;

-- 컬럼 설명 추가
COMMENT ON COLUMN public.users.auto_deposit_settings IS '자동 입금 설정 { amount: number, dayOfMonth: number, memo: string, enabled: boolean }';
