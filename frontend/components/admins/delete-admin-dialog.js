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
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Loader2, Trash2, AlertOctagon } from 'lucide-react';

export function DeleteAdminDialog({ admin, open, onOpenChange, onSuccess }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!admin) return;

    setIsDeleting(true);
    try {
      await apiClient(`/admins/${admin.id}`, {
        method: 'DELETE',
      });

      toast.success('Admin Deleted', {
        description: `Account for ${admin.firstName} (${admin.employeeCode}) was permanently removed.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error('Deletion Failed', {
        description: err.message || 'Cannot delete admin with active operational dependencies.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">
                Delete Admin Account
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Permanent deletion confirmation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-3 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Are you sure you want to delete administrator{' '}
            <span className="font-semibold text-slate-900">
              {admin?.firstName} {admin?.lastName}
            </span>{' '}
            (<span className="font-mono text-slate-700">{admin?.employeeCode}</span>)?
          </p>
          <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-lg text-rose-800 text-[11px] leading-relaxed">
            This action cannot be undone. If this admin has signed off on inbound challans or production work orders, the system will prevent deletion and require deactivation instead to preserve audit logs.
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            className="text-xs h-9 border-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
            className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-medium gap-1.5"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
