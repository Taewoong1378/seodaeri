'use client';

import { Button } from '@repo/design-system/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/dialog';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  isLoading = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[360px] flex flex-col p-0 gap-0 overflow-hidden rounded-[20px] bg-popover border-border text-foreground"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 'min(360px, calc(100vw - 2rem))',
        }}
      >
        <div className="p-5 pb-3 border-b border-border">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-foreground text-lg font-bold">
              {title}
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                disabled={isLoading}
              >
                <X size={20} />
              </Button>
            </DialogClose>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col items-center text-center gap-3">
            {variant === 'danger' && (
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              className={`flex-1 ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AlertDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  buttonText?: string;
  variant?: 'error' | 'success' | 'default';
}

export function AlertDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  buttonText = '확인',
  variant = 'default',
}: AlertDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[360px] flex flex-col p-0 gap-0 overflow-hidden rounded-[20px] bg-popover border-border text-foreground"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 'min(360px, calc(100vw - 2rem))',
        }}
      >
        <div className="p-5 pb-3 border-b border-border">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-foreground text-lg font-bold">
              {title}
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

        <div className="p-5 space-y-4">
          <div className="flex flex-col items-center text-center gap-3">
            {variant === 'error' && (
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          <Button
            className={`w-full ${
              variant === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : variant === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
            onClick={() => onOpenChange(false)}
          >
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
