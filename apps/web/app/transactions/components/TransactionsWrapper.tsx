"use client";

import { Button } from "@repo/design-system/components/button";
import { Pen } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSuspenseTransactionData } from "../../../hooks";
import { DepositInputModal } from "../../dashboard/components/DepositInputModal";
import { DividendInputModal } from "../../dashboard/components/DividendInputModal";
import { AccountBalanceInputModal } from "./AccountBalanceInputModal";
import { type TabType, TransactionsClient } from "./TransactionsClient";

export function TransactionsWrapper() {
  const [activeTab, setActiveTab] = useState<TabType>("balance");
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { transactions: data, accountBalances } = useSuspenseTransactionData();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (data?.error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">{data.error}</p>
      </div>
    );
  }

  return (
    <>
      <TransactionsClient
        transactions={data?.transactions || []}
        accountBalances={accountBalances || []}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isStandalone={data?.isStandalone ?? false}
      />

      {/* Tab-specific modals with color-coded floating buttons */}
      {activeTab === "balance" && (
        <>
          {mounted &&
            createPortal(
              <div className="fixed bottom-24 left-0 right-0 z-50 max-w-[500px] mx-auto pointer-events-none">
                <Button
                  size="icon"
                  onClick={() => setIsBalanceModalOpen(true)}
                  className="h-14 w-14 rounded-full shadow-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 active:bg-emerald-800 text-white absolute right-5 bottom-0 pointer-events-auto animate-in zoom-in duration-300 transition-all border-4 border-white/20"
                >
                  <Pen size={24} />
                </Button>
              </div>,
              document.body
            )}
          <AccountBalanceInputModal
            isOpen={isBalanceModalOpen}
            onClose={() => setIsBalanceModalOpen(false)}
          />
        </>
      )}
      {activeTab === "dividend" && <DividendInputModal />}
      {activeTab === "deposit" && <DepositInputModal />}
    </>
  );
}
