'use client';

import { Button } from '@repo/design-system/components/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@repo/design-system/components/dialog';
import { AlertTriangle, UserX, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteAccount } from '../actions/account';

export function DeleteAccountButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfText] = useState('');
  const [errorAlert, setErrorAlert] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  const handleDelete = async () => {
    if (confirmText !== '탈퇴') return;

    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.success) {
        router.push('/login');
      } else {
        setIsOpen(false);
        setErrorAlert({
          isOpen: true,
          message: result.error || '회원탈퇴에 실패했습니다.',
        });
      }
    } catch (error) {
      setIsOpen(false);
      setErrorAlert({
        isOpen: true,
        message: '회원탈퇴 중 오류가 발생했습니다.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-12 rounded-[16px] bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground gap-2 text-sm"
        >
          <UserX size={18} />
          회원탈퇴
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[360px] flex flex-col p-0 gap-0 overflow-hidden rounded-[20px] bg-popover border-border text-popover-foreground"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 'min(360px, calc(100vw - 2rem))',
        }}
      >
        <div className="p-5 pb-3 border-b border-border">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-destructive text-lg font-bold">
              회원탈퇴
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                disabled={isDeleting}
              >
                <X size={20} />
              </Button>
            </DialogClose>
          </DialogHeader>
        </div>
        <div className="p-5 space-y-4">
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            정말로 탈퇴하시겠습니까? 탈퇴 시 모든 데이터에 접근할 수 없게 됩니다.
            <br /><br />
            Google 스프레드시트의 데이터는 유지되지만, 앱에서 더 이상 접근할 수 없습니다.
          </DialogDescription>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              확인을 위해 <span className="text-destructive font-bold">탈퇴</span>를 입력해주세요.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfText(e.target.value)}
              placeholder="탈퇴"
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setIsOpen(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              onClick={handleDelete}
              disabled={confirmText !== '탈퇴' || isDeleting}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50"
            >
              {isDeleting ? '처리 중...' : '회원탈퇴'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Error Alert Dialog */}
    <Dialog open={errorAlert.isOpen} onOpenChange={(open) => setErrorAlert(prev => ({ ...prev, isOpen: open }))}>
      <DialogContent
        className="sm:max-w-[360px] flex flex-col p-0 gap-0 overflow-hidden rounded-[20px] bg-popover border-border text-popover-foreground"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 'min(360px, calc(100vw - 2rem))',
        }}
      >
        <div className="p-5 pb-3 border-b border-border">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-destructive text-lg font-bold">
              오류
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
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {errorAlert.message}
            </p>
          </div>
          <Button
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={() => setErrorAlert(prev => ({ ...prev, isOpen: false }))}
          >
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
