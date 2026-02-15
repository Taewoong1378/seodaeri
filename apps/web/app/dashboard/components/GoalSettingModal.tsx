"use client";

import { toast } from "@repo/design-system";
import { Button } from "@repo/design-system/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/dialog";
import { Input } from "@repo/design-system/components/input";
import { Label } from "@repo/design-system/components/label";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSaveGoal } from "../../../hooks";

const formatNumberWithComma = (value: string): string => {
  const numbers = value.replace(/[^\d]/g, "");
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseFormattedNumber = (value: string): number => {
  return Number.parseInt(value.replace(/,/g, ""), 10) || 0;
};

interface GoalSettingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "finalAsset" | "annualDeposit";
  currentGoal?: number | null;
}

const LABELS = {
  finalAsset: {
    title: "최종 총자산 목표 설정",
    label: "최종 총자산 목표 금액",
    description: "최종적으로 달성하고 싶은 총 자산 목표를 설정하세요.",
  },
  annualDeposit: {
    title: "연간 입금액 목표 설정",
    label: "연간 입금액 목표 금액",
    description: "올해 입금하고 싶은 목표 금액을 설정하세요.",
  },
};

export function GoalSettingModal({
  open,
  onOpenChange,
  type,
  currentGoal,
}: GoalSettingModalProps) {
  const [formattedGoal, setFormattedGoal] = useState<string>("");
  const { mutate: saveGoal, isPending: isSaving } = useSaveGoal();

  const handleInputFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    },
    [],
  );

  useEffect(() => {
    if (open) {
      if (currentGoal != null && currentGoal > 0) {
        setFormattedGoal(formatNumberWithComma(String(currentGoal)));
      } else {
        setFormattedGoal("");
      }
    }
  }, [open, currentGoal]);

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormattedGoal(formatNumberWithComma(e.target.value));
  };

  const handleSave = () => {
    const amount = parseFormattedNumber(formattedGoal);

    if (amount <= 0) {
      toast.error("목표 금액을 입력해주세요.");
      return;
    }

    saveGoal(
      { type, amount },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast.success("목표가 설정되었습니다.");
            onOpenChange(false);
          } else {
            toast.error(result.error || "목표 설정에 실패했습니다.");
          }
        },
        onError: () => {
          toast.error("목표 설정에 실패했습니다.");
        },
      },
    );
  };

  const labels = LABELS[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-card border-0 shadow-xl"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "min(425px, calc(100vw - 2rem))",
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 z-10">
          <DialogHeader className="p-0 space-y-0">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              {labels.title}
            </DialogTitle>
          </DialogHeader>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            >
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground text-center">
              {labels.description}
            </p>

            <div className="space-y-2">
              <Label
                htmlFor="goalAmount"
                className="text-sm font-medium text-foreground"
              >
                {labels.label}
              </Label>
              <div className="relative">
                <Input
                  id="goalAmount"
                  type="text"
                  inputMode="numeric"
                  value={formattedGoal}
                  onChange={handleGoalChange}
                  onFocus={handleInputFocus}
                  placeholder="0"
                  className="h-12 text-right pr-8 font-medium"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  원
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                className="flex-1 h-12 bg-muted text-muted-foreground hover:bg-muted/80 rounded-xl font-medium"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button
                className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장하기"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
