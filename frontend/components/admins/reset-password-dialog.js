'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Loader2, KeyRound, AlertTriangle } from 'lucide-react';

export function ResetPasswordDialog({ admin, open, onOpenChange, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!admin) return;

    if (newPassword.length < 8) {
      toast.error('Password too short', {
        description: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords mismatch', {
        description: 'New password and confirmation do not match.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient(`/admins/${admin.id}/reset-password`, {
        method: 'POST',
        body: { newPassword },
      });

      toast.success('Password Reset Successful', {
        description: `New password set for ${admin.firstName} (${admin.employeeCode}).`,
      });

      setNewPassword('');
      setConfirmPassword('');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error('Failed to reset password', {
        description: err.message || 'Operation rejected.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Force Reset Password
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Override credentials for {admin?.firstName} {admin?.lastName} ({admin?.employeeCode})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4 text-xs">
            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg flex items-start gap-2.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Resetting will immediately invalidate all active sessions for this administrator and force them to re-login.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-slate-700 font-medium">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters (letters & numbers)"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Set New Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
