"use client";

import { Button } from "@repo/design-system/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/card";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  type SheetValidationResult,
  type StandaloneDataInfo,
  checkStandaloneData,
  connectSheetById,
  validateSheet,
} from "../../actions/onboarding";

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

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

// Google Client ID에서 App ID 추출 (숫자 부분)
function extractAppId(clientId: string): string {
  const match = clientId.match(/^(\d+)-/);
  return match?.[1] || "";
}

export function SheetManageClient({
  connected,
  currentSheetId,
  accessToken,
}: SheetManageClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<"picker" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pickerReady, setPickerReady] = useState(false);
  const [standaloneData, setStandaloneData] =
    useState<StandaloneDataInfo | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSheet, setPendingSheet] = useState<{
    id: string;
    name?: string;
  } | null>(null);
  const [validationError, setValidationError] =
    useState<SheetValidationResult | null>(null);

  // Standalone 데이터 존재 여부 확인
  useEffect(() => {
    if (!connected) {
      checkStandaloneData().then(setStandaloneData);
    }
  }, [connected]);

  // Google Picker API 로드
  useEffect(() => {
    const loadPicker = () => {
      if (window.gapi) {
        window.gapi.load("picker", () => {
          setPickerReady(true);
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.gapi.load("picker", () => {
          setPickerReady(true);
        });
      };
      document.body.appendChild(script);
    };

    loadPicker();
  }, []);

  // Google Picker 열기
  const openGooglePicker = useCallback(async () => {
    if (!pickerReady) {
      setError("Google Picker를 로드하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!accessToken) {
      setError("로그인이 필요합니다. 다시 로그인해주세요.");
      return;
    }

    if (!GOOGLE_API_KEY) {
      setError("Google API Key가 설정되지 않았습니다.");
      return;
    }

    // 토큰 유효성 사전검증
    try {
      const tokenCheck = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
      );
      if (!tokenCheck.ok) {
        setError(
          "Google 인증이 만료되었습니다. 설정 > 로그아웃 후 다시 로그인해주세요."
        );
        return;
      }
    } catch {
      setError(
        "Google 인증 확인에 실패했습니다. 네트워크 연결을 확인해주세요."
      );
      return;
    }

    const appId = extractAppId(GOOGLE_CLIENT_ID);
    console.log("[Picker:Settings] Opening with config:", {
      hasAccessToken: !!accessToken,
      hasApiKey: !!GOOGLE_API_KEY,
      hasClientId: !!GOOGLE_CLIENT_ID,
      appId: appId || "NOT_SET",
    });

    setLoading("picker");
    setError(null);
    setSuccess(null);

    try {
      const view = new window.google.picker.DocsView(
        window.google.picker.ViewId.SPREADSHEETS
      )
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMode(window.google.picker.DocsViewMode.LIST);

      const pickerBuilder = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setTitle("스프레드시트 선택")
        .setCallback((data: any) => {
          console.log("[Picker:Settings] Callback:", {
            action: data.action,
            docs: data.docs,
          });

          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            if (doc) {
              console.log("[Picker:Settings] Selected:", {
                id: doc.id,
                name: doc.name,
              });
              handleSheetSelected(doc.id, doc.name);
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            setLoading(null);
          }
        });

      // AppId 설정 (drive.file 스코프 권한 부여에 필수!)
      if (appId) {
        pickerBuilder.setAppId(appId);
        console.log("[Picker:Settings] setAppId:", appId);
      }

      const picker = pickerBuilder.build();
      picker.setVisible(true);
    } catch (err: any) {
      console.error("[Picker:Settings] Error:", {
        message: err?.message,
        stack: err?.stack,
      });
      setError("Google Picker를 열 수 없습니다.");
      setLoading(null);
    }
  }, [pickerReady, accessToken]);

  // 시트 선택 후 연결 시도 (검증 + 데이터 확인 포함)
  const handleSheetSelected = async (sheetId: string, sheetName?: string) => {
    setLoading("picker");
    setValidationError(null);

    try {
      // 먼저 시트 형식 검증
      console.log("[Settings] Validating sheet format...");
      const validation = await validateSheet(sheetId);

      if (!validation.valid) {
        console.log("[Settings] Sheet validation failed:", validation);
        setValidationError(validation);
        setLoading(null);
        return;
      }

      console.log("[Settings] Sheet validation passed");

      // 기존 데이터가 있으면 확인 모달 표시
      if (standaloneData?.hasData && !connected) {
        setPendingSheet({ id: sheetId, name: sheetName });
        setShowConfirmModal(true);
        setLoading(null);
      } else {
        // 데이터 없으면 바로 연결
        handleConnect(sheetId, sheetName);
      }
    } catch (err) {
      console.error("[Settings] Validation error:", err);
      setError("시트 검증 중 오류가 발생했습니다.");
      setLoading(null);
    }
  };

  // 실제 연결 처리
  const handleConnect = async (sheetId: string, sheetName?: string) => {
    try {
      setLoading("picker");
      const result = await connectSheetById(sheetId);
      if (result.success) {
        setSuccess(`"${sheetName || "시트"}" 연동 완료!`);

        // 시트 변경 시 모든 캐시 무효화 (새 시트 데이터로 갱신)
        queryClient.clear();

        // 시트 변경 후 대시보드로 이동
        router.push("/dashboard");
        router.refresh(); // Next.js 서버 캐시도 갱신
      } else {
        setError(result.error || "연동에 실패했습니다.");
      }
    } catch (err) {
      setError("시트 연동 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
      setShowConfirmModal(false);
      setPendingSheet(null);
    }
  };

  // 확인 모달에서 연결 확정
  const handleConfirmConnect = () => {
    if (pendingSheet) {
      handleConnect(pendingSheet.id, pendingSheet.name);
    }
  };

  // 확인 모달 취소
  const handleCancelConnect = () => {
    setShowConfirmModal(false);
    setPendingSheet(null);
    setLoading(null);
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
                <span className="text-sm font-medium">
                  연결된 시트가 없습니다
                </span>
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
            {connected ? "다른 시트로 변경" : "시트 연동하기"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {connected
              ? "다른 스프레드시트로 변경하려면 아래에서 선택하세요."
              : "투자기록 스프레드시트를 연동하세요."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drive에서 선택 버튼 */}
          <Button
            onClick={openGooglePicker}
            disabled={loading !== null || !pickerReady}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {loading === "picker" ? (
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

      {/* Standalone Data Warning Modal */}
      {showConfirmModal && standaloneData?.hasData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-500/10 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  기존 데이터가 있습니다
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  앱에서 직접 입력한 데이터가 있습니다. 스프레드시트를 연동하면
                  시트의 데이터를 사용하게 됩니다.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                현재 저장된 데이터
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background rounded-lg p-2">
                  <p className="text-lg font-bold text-foreground">
                    {standaloneData.holdingsCount}
                  </p>
                  <p className="text-xs text-muted-foreground">보유종목</p>
                </div>
                <div className="bg-background rounded-lg p-2">
                  <p className="text-lg font-bold text-foreground">
                    {standaloneData.dividendsCount}
                  </p>
                  <p className="text-xs text-muted-foreground">배당내역</p>
                </div>
                <div className="bg-background rounded-lg p-2">
                  <p className="text-lg font-bold text-foreground">
                    {standaloneData.depositsCount}
                  </p>
                  <p className="text-xs text-muted-foreground">입출금</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-700">
                시트 연동 후에는 시트의 데이터가 사용됩니다. 기존 데이터는 DB에
                보관되지만 앱에 표시되지 않습니다.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleCancelConnect}
                className="flex-1"
                disabled={loading !== null}
              >
                취소
              </Button>
              <Button
                onClick={handleConfirmConnect}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading !== null}
              >
                {loading === "picker" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    연동 중...
                  </>
                ) : (
                  "시트 연동하기"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet Validation Error Modal */}
      {validationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-500/10 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  지원하지 않는 시트 형식
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  선택한 스프레드시트가 서대리 투자기록 시트 형식이 아닙니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="p-1 rounded-full hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {validationError.error ? (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-600">{validationError.error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {validationError.missingTabs.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs font-medium text-amber-700 mb-2">
                      다음 시트 탭이 필요합니다:
                    </p>
                    <ul className="text-xs text-amber-600 space-y-1">
                      {validationError.missingTabs.map((tab) => (
                        <li key={tab}>• {tab}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">
                서대리 투자기록 스프레드시트가 아닌 다른 스프레드시트는 연동할
                수 없습니다. 서대리 유튜브 채널에서 템플릿을 다운로드해주세요.
              </p>
            </div>

            <Button
              onClick={() => setValidationError(null)}
              className="w-full"
              variant="outline"
            >
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
