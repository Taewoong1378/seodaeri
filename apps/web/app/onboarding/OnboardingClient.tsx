'use client';

import { Button } from '@repo/design-system/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/card';
import { Input } from '@repo/design-system/components/input';
import { FileSpreadsheet, FolderOpen, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  type OnboardingResult,
  connectSheetById,
  createNewSheet,
} from '../actions/onboarding';

interface OnboardingClientProps {
  userName?: string;
  accessToken?: string;
}

// Google Picker API 타입 선언
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// URL에서 스프레드시트 ID 추출
function extractSheetId(input: string): string {
  if (!input.includes('/')) {
    return input.trim();
  }
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || input.trim();
}

// 환경변수
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

export function OnboardingClient({ userName, accessToken }: OnboardingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'manual' | 'picker' | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetInput, setSheetInput] = useState('');
  const [pickerReady, setPickerReady] = useState(false);

  // Google Picker API 로드
  useEffect(() => {
    const loadPicker = () => {
      // gapi 스크립트가 이미 로드되어 있는지 확인
      if (window.gapi) {
        window.gapi.load('picker', () => {
          setPickerReady(true);
        });
        return;
      }

      // gapi 스크립트 동적 로드
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.gapi.load('picker', () => {
          setPickerReady(true);
        });
      };
      script.onerror = () => {
        console.error('Failed to load Google API script');
      };
      document.body.appendChild(script);
    };

    loadPicker();
  }, []);

  // Google Picker 열기
  const openGooglePicker = useCallback(() => {
    if (!pickerReady) {
      setError('Google Picker를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!accessToken) {
      setError('로그인이 필요합니다. 다시 로그인해주세요.');
      return;
    }

    if (!GOOGLE_API_KEY) {
      setError('Google API Key가 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }

    setLoading('picker');
    setError(null);

    try {
      // 스프레드시트만 표시하는 뷰
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMode(window.google.picker.DocsViewMode.LIST);

      // Picker 빌더
      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setTitle('스프레드시트 선택')
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            if (doc) {
              try {
                const result = await connectSheetById(doc.id);
                handleResult(result);
              } catch (err) {
                setError('시트 연동 중 오류가 발생했습니다.');
                setLoading(null);
              }
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            setLoading(null);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error('Picker error:', err);
      setError('Google Picker를 열 수 없습니다. 다시 시도해주세요.');
      setLoading(null);
    }
  }, [pickerReady, accessToken]);

  const handleResult = (result: OnboardingResult) => {
    if (result.success) {
      router.refresh();
      router.push('/dashboard');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } else {
      setError(result.error || '오류가 발생했습니다.');
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

  // 템플릿 복사해서 새 시트 만들기
  const handleCreateSheet = async () => {
    setLoading('create');
    setError(null);
    try {
      const result = await createNewSheet();
      handleResult(result);
    } catch (err: any) {
      console.error('handleCreateSheet error:', err);
      setError(err?.message || '시트 생성 중 오류가 발생했습니다.');
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
            이미 사용 중인 투자기록 스프레드시트를 연동하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drive에서 선택 버튼 */}
          <Button
            onClick={openGooglePicker}
            disabled={loading !== null || !pickerReady}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {loading === 'picker' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                선택 중...
              </>
            ) : !pickerReady ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                로딩 중...
              </>
            ) : (
              <>
                <FolderOpen className="w-4 h-4" />
                Google Drive에서 선택
              </>
            )}
          </Button>

          {/* 또는 직접 입력 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex-1 h-px bg-white/10" />
              <span>또는 URL 직접 입력</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="스프레드시트 URL 또는 ID"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                className="flex-1 h-10 px-3 bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm"
              />
              <Button
                onClick={handleManualConnect}
                disabled={loading !== null || !sheetInput.trim()}
                size="sm"
                className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
              >
                {loading === 'manual' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '연동'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-slate-500">처음이신가요?</span>
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {loading === 'create' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                새 시트 생성하기
              </>
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
