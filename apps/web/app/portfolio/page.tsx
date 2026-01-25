import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/button";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkSheetConnection } from "../actions/onboarding";
import { BottomNav } from "../dashboard/components/BottomNav";
import { SyncButton } from "../dashboard/components/SyncButton";
import { PortfolioContent } from "./components/PortfolioContent";

export default async function PortfolioPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // 데모 계정은 시트 연동 체크 스킵 (Play Store 심사용)
  let sheetUrl: string | null = null;
  let isStandalone = false;
  if (!session.isDemo) {
    const connectionResult = await checkSheetConnection();
    if (!connectionResult.connected && !connectionResult.isStandalone) {
      redirect("/onboarding");
    }
    isStandalone = connectionResult.isStandalone || false;
    sheetUrl = connectionResult.sheetId
      ? `https://docs.google.com/spreadsheets/d/${connectionResult.sheetId}/edit`
      : null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">
          포트폴리오
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

      <main className="p-5 space-y-6">
        <PortfolioContent sheetUrl={sheetUrl} isStandalone={isStandalone} />
      </main>

      <BottomNav />
    </div>
  );
}
