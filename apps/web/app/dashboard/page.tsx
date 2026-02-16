import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/button";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkSheetConnection } from "../actions/onboarding";
import { getDashboardData } from "../actions/dashboard";
import { BottomNav } from "./components/BottomNav";
import { DashboardContent } from "./components/DashboardContent";
import { SyncButton } from "./components/SyncButton";

export default async function DashboardPage() {
  const session = await auth();

  // 로그인 체크
  if (!session?.user) {
    redirect("/login");
  }

  // 데모 계정은 시트 연동 체크 스킵 (Play Store 심사용)
  let sheetUrl: string | null = null;
  if (!session.isDemo) {
    // 시트 연동 체크 - 연동 안 되어 있고 standalone도 아니면 온보딩으로
    const { connected, sheetId, isStandalone } = await checkSheetConnection();
    if (!connected && !isStandalone) {
      redirect("/onboarding");
    }
    sheetUrl = sheetId
      ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
      : null;
  }

  // SSR 프리페치: 스플래시 스크린 중 데이터를 미리 로드
  // WebView가 HTML을 받을 때 이미 데이터가 포함되어 있으므로
  // 클라이언트 fetch 없이 즉시 렌더링 → App.Ready 즉시 전송 → 스플래시 빠르게 해제
  const serverData = await getDashboardData().catch(() => null);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">
          굴림
        </span>
        <div className="flex items-center gap-3">
          {sheetUrl && (
            <Link href={sheetUrl} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 rounded-full"
              >
                <ExternalLink size={14} />
                시트
              </Button>
            </Link>
          )}
          <SyncButton />
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || "프로필"}
              width={32}
              height={32}
              className="rounded-full border border-border ring-2 ring-background"
            />
          )}
        </div>
      </header>

      <main className="p-4">
        <DashboardContent serverData={serverData} />
      </main>

      <BottomNav />
    </div>
  );
}
