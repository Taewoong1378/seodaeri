"use client";

import { Button } from "@repo/design-system/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/card";
import {
  AlertTriangle,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  Rocket,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  type OnboardingResult,
  type SheetValidationResult,
  connectSheetById,
  startWithoutSheet,
  validateSheet,
} from "../actions/onboarding";

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

// 환경변수
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

// Google Client ID에서 App ID 추출 (숫자 부분)
// 형식: 123456789012-xxxxxxxx.apps.googleusercontent.com → 123456789012
function extractAppId(clientId: string): string {
  const match = clientId.match(/^(\d+)-/);
  return match?.[1] || "";
}

export function OnboardingClient({
  userName,
  accessToken,
}: OnboardingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"picker" | "create" | "start" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [pickerReady, setPickerReady] = useState(false);
  const [validationError, setValidationError] =
    useState<SheetValidationResult | null>(null);

  // Google Picker API 로드
  useEffect(() => {
    const loadPicker = () => {
      // gapi 스크립트가 이미 로드되어 있는지 확인
      if (window.gapi) {
        window.gapi.load("picker", () => {
          setPickerReady(true);
        });
        return;
      }

      // gapi 스크립트 동적 로드
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.gapi.load("picker", () => {
          setPickerReady(true);
        });
      };
      script.onerror = () => {
        console.error("Failed to load Google API script");
      };
      document.body.appendChild(script);
    };

    loadPicker();
  }, []);

  // Google Picker 열기
  const openGooglePicker = useCallback(() => {
    if (!pickerReady) {
      setError("Google Picker를 로드하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!accessToken) {
      setError("로그인이 필요합니다. 다시 로그인해주세요.");
      return;
    }

    if (!GOOGLE_API_KEY) {
      setError("Google API Key가 설정되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }

    const appId = extractAppId(GOOGLE_CLIENT_ID);
    console.log("[Picker] Opening with config:", {
      hasAccessToken: !!accessToken,
      hasApiKey: !!GOOGLE_API_KEY,
      hasClientId: !!GOOGLE_CLIENT_ID,
      appId: appId || "NOT_SET",
    });

    if (!appId) {
      console.warn(
        "[Picker] AppId not found. GOOGLE_CLIENT_ID:",
        GOOGLE_CLIENT_ID
      );
    }

    setLoading("picker");
    setError(null);

    try {
      // 스프레드시트만 표시하는 뷰
      const view = new window.google.picker.DocsView(
        window.google.picker.ViewId.SPREADSHEETS
      )
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMode(window.google.picker.DocsViewMode.LIST);

      // Picker 빌더 - setAppId() 추가! (drive.file 스코프에 필수)
      const pickerBuilder = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setTitle("스프레드시트 선택")
        .setCallback(async (data: any) => {
          console.log("[Picker] Callback:", {
            action: data.action,
            docs: data.docs,
          });

          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            if (doc) {
              console.log("[Picker] Selected document:", {
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                url: doc.url,
              });
              try {
                // 시트 형식 검증
                console.log("[Picker] Validating sheet format...");
                const validation = await validateSheet(doc.id);

                if (!validation.valid) {
                  console.log("[Picker] Sheet validation failed:", validation);
                  setValidationError(validation);
                  setLoading(null);
                  return;
                }

                console.log("[Picker] Sheet validation passed");
                const result = await connectSheetById(doc.id);
                console.log("[Picker] connectSheetById result:", result);
                handleResult(result);
              } catch (err: any) {
                console.error("[Picker] connectSheetById error:", {
                  message: err?.message,
                  stack: err?.stack,
                });
                setError("시트 연동 중 오류가 발생했습니다.");
                setLoading(null);
              }
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            console.log("[Picker] Cancelled");
            setLoading(null);
          }
        });

      // AppId가 있으면 설정 (drive.file 스코프 권한 부여에 필수!)
      if (appId) {
        pickerBuilder.setAppId(appId);
        console.log("[Picker] setAppId:", appId);
      }

      const picker = pickerBuilder.build();
      picker.setVisible(true);
      console.log("[Picker] Picker opened");
    } catch (err: any) {
      console.error("[Picker] Error:", {
        message: err?.message,
        stack: err?.stack,
        err,
      });
      setError("Google Picker를 열 수 없습니다. 다시 시도해주세요.");
      setLoading(null);
    }
  }, [pickerReady, accessToken]);

  const handleResult = (result: OnboardingResult) => {
    if (result.success) {
      router.refresh();
      router.push("/dashboard");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } else {
      setError(result.error || "오류가 발생했습니다.");
      setLoading(null);
    }
  };

  // 스프레드시트 없이 바로 시작하기
  const handleStartWithoutSheet = async () => {
    setLoading("start");
    setError(null);
    try {
      const result = await startWithoutSheet();
      if (result.success) {
        // Standalone 유저는 내역 페이지로 바로 이동
        router.refresh();
        router.push("/transactions");
        setTimeout(() => {
          window.location.href = "/transactions";
        }, 500);
      } else {
        setError(result.error || "오류가 발생했습니다.");
        setLoading(null);
      }
    } catch (err: any) {
      console.error("handleStartWithoutSheet error:", err);
      setError(err?.message || "시작 중 오류가 발생했습니다.");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Option 1: 바로 시작하기 (Standalone 모드) - 메인 */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-white">
              <Rocket className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            바로 시작하기
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            복잡한 설정 없이 지금 바로 투자기록을 시작하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleStartWithoutSheet}
            disabled={loading !== null}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {loading === "start" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                시작 중...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                바로 시작하기
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">
          이미 스프레드시트가 있으신가요?
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Option 2: 기존 시트 연동 */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-white">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            내 스프레드시트 연동
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            서대리 투자기록 스프레드시트가 있다면 연동하세요.
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
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                선택 중...
              </>
            ) : !pickerReady ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                로딩 중...
              </>
            ) : (
              <>
                <FolderOpen className="w-4 h-4 mr-2" />
                Google Drive에서 선택
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
