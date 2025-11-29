'use client';

import { Button } from '@repo/design-system/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/card';
import { Input } from '@repo/design-system/components/input';
import { FileSpreadsheet, Loader2, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  connectSheetById,
  createNewSheet,
  searchAndConnectSheet,
  type OnboardingResult,
} from '../actions/onboarding';

interface OnboardingClientProps {
  userName?: string;
}

export function OnboardingClient({ userName }: OnboardingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'search' | 'create' | 'manual' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualSheetId, setManualSheetId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleResult = (result: OnboardingResult) => {
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || '오류가 발생했습니다.');
    }
  };

  const handleSearchSheet = async () => {
    setLoading('search');
    setError(null);
    try {
      const result = await searchAndConnectSheet();
      handleResult(result);
    } catch (err) {
      setError('시트 검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
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
    if (!manualSheetId.trim()) {
      setError('시트 ID를 입력해주세요.');
      return;
    }

    setLoading('manual');
    setError(null);
    try {
      const result = await connectSheetById(manualSheetId);
      handleResult(result);
    } catch (err) {
      setError('시트 연동 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Option 1: Search existing sheet */}
      <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
            기존 서대리 시트 연동
          </CardTitle>
          <CardDescription className="text-slate-400">
            Google Drive에서 "서대리" 시트를 자동으로 찾아 연동합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSearchSheet}
            disabled={loading !== null}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading === 'search' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                검색 중...
              </>
            ) : (
              '내 드라이브에서 찾기'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Option 2: Create new sheet */}
      <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Plus className="w-5 h-5 text-emerald-400" />
            </div>
            새 시트 만들기
          </CardTitle>
          <CardDescription className="text-slate-400">
            서대리 마스터 템플릿을 복사하여 새로운 투자 기록 시트를 만듭니다.
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
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              '새 시트 생성하기'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Option 3: Manual input */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-slate-500/20">
              <FileSpreadsheet className="w-5 h-5 text-slate-400" />
            </div>
            직접 시트 ID 입력
          </CardTitle>
          <CardDescription className="text-slate-400">
            이미 사용 중인 구글 스프레드시트가 있다면 ID를 직접 입력하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {showManualInput ? (
            <>
              <Input
                placeholder="스프레드시트 ID 입력"
                value={manualSheetId}
                onChange={(e) => setManualSheetId(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                URL에서 ID 찾기: docs.google.com/spreadsheets/d/<span className="text-blue-400">여기가_ID</span>/edit
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleManualConnect}
                  disabled={loading !== null}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white"
                >
                  {loading === 'manual' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      연동 중...
                    </>
                  ) : (
                    '연동하기'
                  )}
                </Button>
                <Button
                  onClick={() => setShowManualInput(false)}
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                >
                  취소
                </Button>
              </div>
            </>
          ) : (
            <Button
              onClick={() => setShowManualInput(true)}
              variant="ghost"
              className="w-full text-slate-400 hover:text-white hover:bg-white/5"
            >
              직접 입력하기
            </Button>
          )}
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
