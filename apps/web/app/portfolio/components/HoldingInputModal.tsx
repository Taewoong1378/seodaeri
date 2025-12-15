'use client';

import { Button } from '@repo/design-system/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/dialog';
import { Input } from '@repo/design-system/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/design-system/components/select';
import { useQueryClient } from '@tanstack/react-query';
import { Briefcase, Loader2, X } from 'lucide-react';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { queryKeys } from '../../../lib/query-client';
import { saveHolding } from '../../actions/holding';

interface HoldingInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatNumber(value: string): string {
  const numbers = value.replace(/[^\d.]/g, '');
  const parts = numbers.split('.');
  if (parts[0]) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return parts.join('.');
}

function parseFormattedNumber(value: string): number {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

export function HoldingInputModal({
  isOpen,
  onClose,
  onSuccess,
}: HoldingInputModalProps): JSX.Element {
  const queryClient = useQueryClient();

  const [country, setCountry] = useState<string>('한국');
  const [ticker, setTicker] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [avgPrice, setAvgPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = country === '미국' ? 'USD' : 'KRW';

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setQuantity(formatted);
    setError(null);
  }, []);

  const handleAvgPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setAvgPrice(formatted);
    setError(null);
  }, []);

  const resetForm = useCallback(() => {
    setCountry('한국');
    setTicker('');
    setName('');
    setQuantity('');
    setAvgPrice('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(async () => {
    const tickerVal = ticker.trim().toUpperCase();
    const nameVal = name.trim();
    const quantityNum = parseFormattedNumber(quantity);
    const avgPriceNum = parseFormattedNumber(avgPrice);

    if (!tickerVal) {
      setError('종목코드를 입력해주세요.');
      return;
    }

    if (!nameVal) {
      setError('종목명을 입력해주세요.');
      return;
    }

    if (quantityNum <= 0) {
      setError('수량을 입력해주세요.');
      return;
    }

    if (avgPriceNum <= 0) {
      setError('평단가를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await saveHolding({
        country,
        ticker: tickerVal,
        name: nameVal,
        quantity: quantityNum,
        avgPrice: avgPriceNum,
        currency,
      });

      if (result.success) {
        // 캐시 무효화
        queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        handleClose();
        onSuccess?.();
      } else {
        setError(result.error || '저장에 실패했습니다.');
      }
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }, [country, ticker, name, quantity, avgPrice, currency, queryClient, handleClose, onSuccess]);

  const isFormValid = ticker.trim() && name.trim() && parseFormattedNumber(quantity) > 0 && parseFormattedNumber(avgPrice) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[420px] bg-popover border-border rounded-[24px] p-0 gap-0 overflow-hidden"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 'min(420px, calc(100vw - 2rem))',
        }}
      >
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              종목 추가
            </DialogTitle>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* 국가 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              국가
            </label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="bg-muted/50 border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="한국">한국</SelectItem>
                <SelectItem value="미국">미국</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 종목코드 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              종목코드 (티커)
            </label>
            <Input
              type="text"
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder={country === '미국' ? 'AAPL, NVDA, SPY...' : '005930, 360750...'}
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground uppercase"
            />
          </div>

          {/* 종목명 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              종목명
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder={country === '미국' ? 'Apple Inc.' : 'TIGER 미국S&P500'}
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* 수량 & 평단가 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                수량
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={quantity}
                onChange={handleQuantityChange}
                placeholder="0"
                className="text-right bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                평단가 ({currency === 'USD' ? '$' : '₩'})
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={avgPrice}
                onChange={handleAvgPriceChange}
                placeholder="0"
                className="text-right bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
