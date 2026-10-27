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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Loader2, PowerOff, CheckCircle } from 'lucide-react';

export function ToggleStatusDialog({ admin, open, onOpenChange, onSuccess }) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextStatus = !admin?.isActive;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!admin) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient(`/admins/${admin.id}/status`, {
        method: 'PATCH',
        body: {
          isActive: nextStatus,
          reason: reason ? reason.trim() : undefined,
        },
      });

      toast.success(
        nextStatus ? 'Admin Reactivated' : 'Admin Deactivated',
        {
          description: `${admin.firstName} (${admin.employeeCode}) has been ${nextStatus ? 'enabled' : 'disabled'}.`,
        }
      );

      setReason('');
      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to change status', {
        description: err.message || 'Operation failed.',
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
              <div
                className={`p-2 rounded-lg border ${
                  nextStatus
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-amber-50 text-amber-600 border-amber-200'
                }`}
              >
                {nextStatus ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <PowerOff className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  {nextStatus ? 'Reactivate Admin Account' : 'Deactivate Admin Account'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {admin?.firstName} {admin?.lastName} ({admin?.employeeCode})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              {nextStatus
                ? 'Reactivating this account will restore access immediately. The user can log in and execute operations based on their department.'
                : 'Deactivating this admin will immediately block their logins and terminate all ongoing sessions without deleting their transaction history.'}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="statusReason" className="text-slate-700 font-medium">
                Reason / Note {nextStatus ? '(Optional)' : '(Recommended for Audit)'}
              </Label>
              <Textarea
                id="statusReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  nextStatus
                    ? 'e.g. Returned from leave, credentials re-verified'
                    : 'e.g. Left organization, departmental reassignment, temporary lock'
                }
                rows={3}
                className="text-xs resize-none"
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
              className={`text-xs h-9 text-white font-medium gap-1.5 ${
                nextStatus
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {nextStatus ? 'Reactivate Account' : 'Deactivate Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
