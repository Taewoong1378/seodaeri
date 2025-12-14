'use client';

import { Button } from '@repo/design-system/components/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@repo/design-system/components/dialog';
import { Input } from '@repo/design-system/components/input';
import { Label } from '@repo/design-system/components/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@repo/design-system/components/select';
import { ArrowDownLeft, ArrowUpRight, Calendar, Check, Loader2, Pen, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAccountList, useSaveDeposit } from '../../../hooks';
import type { DepositInput } from '../../actions/deposit';

type InputMode = 'select' | 'single' | 'recurring';

// 기본 계좌 목록
const DEFAULT_ACCOUNTS = [
  '일반계좌1',
  '일반계좌2',
  '개인연금1',
  '개인연금2',
  'IRP 1',
  'IRP 2',
  'ISA',
  '퇴직연금DC',
];

export function DepositInputModal() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<InputMode>('select');
  const [isWithdraw, setIsWithdraw] = useState(false);

  // TanStack Query hooks
  const { mutate: saveDeposit, isPending: isSaving } = useSaveDeposit();
  const { data: accountList, isLoading: isLoadingAccounts } = useAccountList();

  const accounts = accountList && accountList.length > 0 ? accountList : DEFAULT_ACCOUNTS;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 단일 입금 폼
  const [form, setForm] = useState<DepositInput>({
    date: new Date().toISOString().split('T')[0] || '',
    amount: 0,
    memo: '',
    type: 'DEPOSIT',
    account: '일반계좌1',
  });

  // 자동 입금 설정
  const [recurringForm, setRecurringForm] = useState({
    amount: 0,
    dayOfMonth: 1,
    memo: '월 정기 입금',
    enabled: true,
    account: '일반계좌1',
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const resetState = () => {
    setMode('select');
    setIsWithdraw(false);
    setForm({
      date: new Date().toISOString().split('T')[0] || '',
      amount: 0,
      memo: '',
      type: 'DEPOSIT',
      account: accounts[0] || '일반계좌1',
    });
  };

  const handleSave = () => {
    if (form.amount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }

    saveDeposit(
      {
        ...form,
        type: isWithdraw ? 'WITHDRAW' : 'DEPOSIT',
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            alert(isWithdraw ? '출금내역이 저장되었습니다.' : '입금내역이 저장되었습니다.');
            handleOpenChange(false);
          } else {
            alert(result.error || '저장에 실패했습니다.');
          }
        },
        onError: (error) => {
          console.error('Save error:', error);
          alert('저장 중 오류가 발생했습니다.');
        },
      }
    );
  };

  const handleSaveRecurring = () => {
    if (recurringForm.amount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }

    // 현재 날짜 기준으로 이번 달 입금 생성
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth(), recurringForm.dayOfMonth);

    // 오늘 이전이면 입금 생성
    if (targetDate <= today) {
      saveDeposit(
        {
          date: targetDate.toISOString().split('T')[0] || '',
          amount: recurringForm.amount,
          memo: recurringForm.memo,
          type: 'DEPOSIT',
          account: recurringForm.account,
        },
        {
          onSuccess: (result) => {
            if (result.success) {
              alert('입금내역이 저장되었습니다. 매월 자동 입금을 사용하시려면 설정에서 추가로 설정해주세요.');
              handleOpenChange(false);
            } else {
              alert(result.error || '저장에 실패했습니다.');
            }
          },
          onError: (error) => {
            console.error('Save error:', error);
            alert('저장 중 오류가 발생했습니다.');
          },
        }
      );
    } else {
      alert('선택한 날짜가 아직 도래하지 않았습니다.');
    }
  };

  const updateField = (field: keyof DepositInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <>
      {/* Floating Action Button - Purple for deposits */}
      {mounted &&
        createPortal(
          <div className="fixed bottom-24 left-0 right-0 z-50 max-w-[500px] mx-auto pointer-events-none">
            <Button
              size="icon"
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-xl bg-purple-600 hover:bg-purple-700 active:scale-90 active:bg-purple-800 text-white absolute right-5 bottom-0 pointer-events-auto animate-in zoom-in duration-300 transition-transform"
            >
              <Pen size={24} />
            </Button>
          </div>,
          document.body
        )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[425px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[20px] bg-popover border-border text-popover-foreground"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'min(425px, calc(100vw - 2rem))',
          }}
        >
          <div className="p-5 pb-3 border-b border-border">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-foreground text-lg font-bold">
                입출금 내역 추가
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X size={20} />
                </Button>
              </DialogClose>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Mode Selection */}
            {mode === 'select' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-6">
                  입력 방식을 선택하세요
                </p>
                <Button
                  className="w-full h-20 bg-muted/50 hover:bg-muted border border-border text-foreground flex flex-col gap-2"
                  variant="ghost"
                  onClick={() => setMode('single')}
                >
                  <Calendar size={24} className="text-blue-500" />
                  <span>단일 입금/출금</span>
                </Button>
                <Button
                  className="w-full h-20 bg-muted/50 hover:bg-muted border border-border text-foreground flex flex-col gap-2"
                  variant="ghost"
                  onClick={() => setMode('recurring')}
                >
                  <RefreshCw size={24} className="text-emerald-500" />
                  <span>정기 입금 (매월)</span>
                </Button>
              </div>
            )}

            {/* Single Deposit Form */}
            {mode === 'single' && (
              <div className="space-y-4">
                {/* 입금/출금 선택 */}
                <div className="flex gap-2">
                  <Button
                    variant={!isWithdraw ? 'default' : 'outline'}
                    className={`flex-1 ${!isWithdraw ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-border text-muted-foreground'}`}
                    onClick={() => setIsWithdraw(false)}
                  >
                    <ArrowDownLeft size={16} className="mr-2" />
                    입금
                  </Button>
                  <Button
                    variant={isWithdraw ? 'default' : 'outline'}
                    className={`flex-1 ${isWithdraw ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-border text-muted-foreground'}`}
                    onClick={() => setIsWithdraw(true)}
                  >
                    <ArrowUpRight size={16} className="mr-2" />
                    출금
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account" className="text-muted-foreground">
                    계좌
                  </Label>
                  <Select
                    value={form.account}
                    onValueChange={(value) => updateField('account', value)}
                    disabled={isLoadingAccounts}
                  >
                    <SelectTrigger className="bg-muted/50 border-border text-foreground">
                      <SelectValue placeholder="계좌 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {accounts.map((account) => (
                        <SelectItem
                          key={account}
                          value={account}
                          className="text-foreground hover:bg-muted focus:bg-muted"
                        >
                          {account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-muted-foreground">
                    {isWithdraw ? '출금일' : '입금일'}
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="bg-muted/50 border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-muted-foreground">
                    금액
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      value={form.amount || ''}
                      onChange={(e) => updateField('amount', Number(e.target.value))}
                      placeholder="0"
                      className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo" className="text-muted-foreground">
                    비고 (선택)
                  </Label>
                  <Input
                    id="memo"
                    value={form.memo}
                    onChange={(e) => updateField('memo', e.target.value)}
                    placeholder="예: 월급, 보너스"
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {form.amount > 0 && (
                  <div className={`p-3 rounded-xl border ${isWithdraw ? 'bg-orange-500/10 border-orange-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                    <p className={`text-sm text-center ${isWithdraw ? 'text-orange-600' : 'text-blue-600'}`}>
                      {isWithdraw ? '출금' : '입금'} 금액: <span className="font-bold">₩{formatCurrency(form.amount)}</span>
                    </p>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button
                    className={`w-full ${isWithdraw ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        저장하기
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setMode('select')}
                    disabled={isSaving}
                  >
                    뒤로
                  </Button>
                </div>
              </div>
            )}

            {/* Recurring Deposit Form */}
            {mode === 'recurring' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm text-emerald-600 text-center">
                    매월 같은 날짜에 입금 내역을 추가합니다
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurringAccount" className="text-muted-foreground">
                    계좌
                  </Label>
                  <Select
                    value={recurringForm.account}
                    onValueChange={(value) => setRecurringForm(prev => ({ ...prev, account: value }))}
                    disabled={isLoadingAccounts}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="계좌 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {accounts.map((account) => (
                        <SelectItem
                          key={account}
                          value={account}
                          className="text-foreground hover:bg-muted focus:bg-muted"
                        >
                          {account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dayOfMonth" className="text-muted-foreground">
                    입금일 (매월)
                  </Label>
                  <div className="relative">
                    <Input
                      id="dayOfMonth"
                      type="number"
                      min={1}
                      max={31}
                      value={recurringForm.dayOfMonth}
                      onChange={(e) => setRecurringForm(prev => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
                      className="bg-muted/50 border-border text-foreground pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">일</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurringAmount" className="text-muted-foreground">
                    입금 금액
                  </Label>
                  <div className="relative">
                    <Input
                      id="recurringAmount"
                      type="number"
                      value={recurringForm.amount || ''}
                      onChange={(e) => setRecurringForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      placeholder="0"
                      className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurringMemo" className="text-muted-foreground">
                    비고
                  </Label>
                  <Input
                    id="recurringMemo"
                    value={recurringForm.memo}
                    onChange={(e) => setRecurringForm(prev => ({ ...prev, memo: e.target.value }))}
                    placeholder="예: 월 적립금"
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {recurringForm.amount > 0 && (
                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-sm text-emerald-600 text-center">
                      매월 {recurringForm.dayOfMonth}일: <span className="font-bold">₩{formatCurrency(recurringForm.amount)}</span>
                    </p>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSaveRecurring}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        이번 달 입금 기록하기
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setMode('select')}
                    disabled={isSaving}
                  >
                    뒤로
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
