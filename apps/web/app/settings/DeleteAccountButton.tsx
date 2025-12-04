'use client';

import { Button } from '@repo/design-system/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/design-system/components/dialog';
import { UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteAccount } from '../actions/account';

export function DeleteAccountButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== '탈퇴') return;

    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.success) {
        router.push('/login');
      } else {
        alert(result.error || '회원탈퇴에 실패했습니다.');
      }
    } catch (error) {
      alert('회원탈퇴 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-12 rounded-[16px] bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 gap-2 text-sm"
        >
          <UserX size={18} />
          회원탈퇴
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0f172a] border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-400">회원탈퇴</DialogTitle>
          <DialogDescription className="text-slate-400">
            정말로 탈퇴하시겠습니까? 탈퇴 시 모든 데이터에 접근할 수 없게 됩니다.
            <br /><br />
            Google 스프레드시트의 데이터는 유지되지만, 앱에서 더 이상 접근할 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-400 mb-2">
            확인을 위해 <span className="text-red-400 font-bold">탈퇴</span>를 입력해주세요.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfText(e.target.value)}
            placeholder="탈퇴"
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            취소
          </Button>
          <Button
            onClick={handleDelete}
            disabled={confirmText !== '탈퇴' || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            {isDeleting ? '처리 중...' : '회원탈퇴'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
