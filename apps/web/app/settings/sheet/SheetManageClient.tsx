'use client';

import { Button } from '@repo/design-system/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/card';
import { Input } from '@repo/design-system/components/input';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, ExternalLink, FileSpreadsheet, FolderOpen, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { connectSheetById } from '../../actions/onboarding';

interface SheetManageClientProps {
  connected: boolean;
  currentSheetId?: string;
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

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

export function SheetManageClient({ connected, currentSheetId, accessToken }: SheetManageClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<'manual' | 'picker' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sheetInput, setSheetInput] = useState('');
  const [pickerReady, setPickerReady] = useState(false);

  // Google Picker API 로드
  useEffect(() => {
    const loadPicker = () => {
      if (window.gapi) {
        window.gapi.load('picker', () => {
          setPickerReady(true);
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.gapi.load('picker', () => {
          setPickerReady(true);
        });
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
      setError('Google API Key가 설정되지 않았습니다.');
      return;
    }

    setLoading('picker');
    setError(null);
    setSuccess(null);

    try {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMode(window.google.picker.DocsViewMode.LIST);

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setTitle('스프레드시트 선택')
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            if (doc) {
              await handleConnect(doc.id, doc.name);
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            setLoading(null);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error('Picker error:', err);
      setError('Google Picker를 열 수 없습니다.');
      setLoading(null);
    }
  }, [pickerReady, accessToken]);

  const handleConnect = async (sheetId: string, sheetName?: string) => {
    try {
      const result = await connectSheetById(sheetId);
      if (result.success) {
        setSuccess(`"${sheetName || '시트'}" 연동 완료!`);
        setSheetInput('');

        // 시트 변경 시 모든 캐시 무효화 (새 시트 데이터로 갱신)
        queryClient.clear();

        // 시트 변경 후 대시보드로 이동
        router.push('/dashboard');
        router.refresh(); // Next.js 서버 캐시도 갱신
      } else {
        setError(result.error || '연동에 실패했습니다.');
      }
    } catch (err) {
      setError('시트 연동 중 오류가 발생했습니다.');
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
    setSuccess(null);

    await handleConnect(sheetId);
  };

  const sheetUrl = currentSheetId
    ? `https://docs.google.com/spreadsheets/d/${currentSheetId}`
    : null;

  return (
    <div className="space-y-4">
      {/* 현재 연결된 시트 */}
      <Card className="border-border bg-card shadow-none rounded-[24px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            </div>
            현재 연결된 시트
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connected && currentSheetId ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">연결됨</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  ID: {currentSheetId}
                </p>
              </div>
              {sheetUrl && (
                <Link
                  href={sheetUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  스프레드시트 열기
                </Link>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">연결된 시트가 없습니다</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 시트 변경 */}
      <Card className="border-border bg-card shadow-none rounded-[24px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <RefreshCw className="w-5 h-5 text-blue-500" />
            </div>
            {connected ? '다른 시트로 변경' : '시트 연동하기'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {connected
              ? '다른 스프레드시트로 변경하려면 아래에서 선택하세요.'
              : '투자기록 스프레드시트를 연동하세요.'}
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>또는 URL 직접 입력</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="스프레드시트 URL 또는 ID"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                className="flex-1 h-10 px-3 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground text-sm"
              />
              <Button
                onClick={handleManualConnect}
                disabled={loading !== null || !sheetInput.trim()}
                size="sm"
                className="h-10 px-4 bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
              >
                {loading === 'manual' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '변경'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="w-4 h-4" />
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
