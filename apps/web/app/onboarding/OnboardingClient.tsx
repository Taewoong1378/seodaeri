'use client';

import { Button } from '@repo/design-system/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/card';
import { Input } from '@repo/design-system/components/input';
import { ExternalLink, FileSpreadsheet, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  type OnboardingResult,
  connectSheetById,
  createNewSheet,
} from '../actions/onboarding';

interface OnboardingClientProps {
  userName?: string;
}

// URL에서 스프레드시트 ID 추출
function extractSheetId(input: string): string {
  // 이미 ID만 입력한 경우
  if (!input.includes('/')) {
    return input.trim();
  }

  // URL에서 ID 추출: /d/ID/ 패턴
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || input.trim();
}

export function OnboardingClient({ userName }: OnboardingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'create' | 'manual' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetInput, setSheetInput] = useState('');

  const handleResult = (result: OnboardingResult) => {
    if (result.success) {
      // 캐시 무효화 후 리다이렉트
      router.refresh();
      router.push('/dashboard');
      // 만약 router.push가 작동하지 않으면 강제 이동
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } else {
      setError(result.error || '오류가 발생했습니다.');
    }
  };

  const handleCreateSheet = async () => {
    setLoading('create');
    setError(null);
    try {
      const result = await createNewSheet();
      handleResult(result);
    } catch (err) {
      setError('시트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  const handleManualConnect = async () => {
    const sheetId = extractSheetId(sheetInput);

    if (!sheetId) {
      setError('스프레드시트 URL 또는 ID를 입력해주세요.');
      return;
    }

    setLoading('manual');
    setError(null);
    try {
      const result = await connectSheetById(sheetId);
      handleResult(result);
    } catch (err) {
      setError('시트 연동 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Option 1: 기존 시트 연동 (메인) */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            내 스프레드시트 연동
          </CardTitle>
          <CardDescription className="text-slate-400">
            이미 사용 중인 투자기록 스프레드시트의 URL 또는 ID를 입력하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="스프레드시트 URL 또는 ID 붙여넣기"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              className="h-12 px-4 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-slate-500">
              <span>Google Drive에서 시트를 열고 URL을 복사하세요</span>
              <Link
                href="https://drive.google.com"
                target="_blank"
                className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 whitespace-nowrap"
              >
                Drive 열기 <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <Button
            onClick={handleManualConnect}
            disabled={loading !== null || !sheetInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {loading === 'manual' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                연동 중...
              </>
            ) : (
              '시트 연동하기'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-slate-500">또는</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Option 2: 새 시트 만들기 */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Plus className="w-5 h-5 text-emerald-400" />
            </div>
            새 시트 만들기
          </CardTitle>
          <CardDescription className="text-slate-400">
            서대리 투자기록 템플릿으로 새 스프레드시트를 생성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleCreateSheet}
            disabled={loading !== null}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading === 'create' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중...
              </>
            ) : (
              '새 시트 생성하기'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
