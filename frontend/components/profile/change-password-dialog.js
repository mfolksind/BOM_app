'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Loader2, KeyRound, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export function ChangePasswordDialog({ open, onOpenChange }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { logout } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Missing fields', {
        description: 'Please fill in current and new passwords.',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password too short', {
        description: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      toast.error('Password requirements', {
        description: 'Password must contain at least one number.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Password mismatch', {
        description: 'New password and confirmation do not match.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword,
          newPassword,
          confirmPassword,
        },
      });

      toast.success('Password Changed Successfully', {
        description: 'Your security key was updated. Please log in with your new password.',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onOpenChange(false);

      // Log out to clear old session tokens and re-authenticate cleanly
      setTimeout(async () => {
        await logout();
      }, 1000);
    } catch (err) {
      toast.error('Failed to change password', {
        description: err.message || 'Incorrect current password or server validation error.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Change Account Password
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Update your authentication key. All existing active sessions will be revoked for security.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="changePasswordForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold block">Security Invalidation Notice:</span>
              Changing your password immediately invalidates prior refresh tokens across all devices. You will be redirected to log in with your new password.
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPass" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Current Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="currentPass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                className="h-10 text-sm bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="newPass" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  New Password <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <Input
                id="newPass"
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters (letters & numbers)"
                required
                className="h-10 text-sm bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPass" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Confirm New Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="confirmPass"
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                className="h-10 text-sm bg-white"
              />
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="text-sm h-10 border-slate-200 cursor-pointer bg-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="changePasswordForm"
            disabled={isSubmitting}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-2 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Update Password
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
