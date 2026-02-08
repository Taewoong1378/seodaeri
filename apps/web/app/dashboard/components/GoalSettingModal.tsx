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
import { Check, Loader2, X, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSaveGoal } from "../../../hooks";

interface GoalSettingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'yearly' | 'monthly';
  currentGoal?: number | null;
}

const LABELS = {
  yearly: { title: '연간 목표 설정', label: '연간 목표 금액', description: '올해 달성하고 싶은 총 자산 목표를 설정하세요' },
  monthly: { title: '월간 목표 설정', label: '이번 달 목표 금액', description: '이번 달 달성하고 싶은 총 자산 목표를 설정하세요' },
};

export function GoalSettingModal({
  open,
  onOpenChange,
  type,
  currentGoal,
}: GoalSettingModalProps) {
  const [formattedGoal, setFormattedGoal] = useState<string>("");
  const { mutate: saveGoal, isPending: isSaving } = useSaveGoal();

  const formatNumberWithComma = (value: string): string => {
    const numbers = value.replace(/[^\d]/g, "");
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseFormattedNumber = (value: string): number => {
    return Number.parseInt(value.replace(/,/g, ""), 10) || 0;
  };

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

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
      }
    );
  };

  const labels = LABELS[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[28px] bg-white border-0 shadow-2xl"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "min(425px, calc(100vw - 2rem))",
        }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <DialogHeader className="p-0 space-y-0">
            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Target size={20} className="text-blue-600" />
              {labels.title}
            </DialogTitle>
          </DialogHeader>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </Button>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-blue-700 text-center font-medium">
                {labels.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="goalAmount"
                className="text-sm font-medium text-gray-700"
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  원
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6">
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-medium text-base text-white"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    저장하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
