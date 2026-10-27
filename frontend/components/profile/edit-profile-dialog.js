'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2, UserCog, Mail, Phone, Building, User } from 'lucide-react';

export function EditProfileDialog({ open, onOpenChange }) {
  const { user, updateUserState } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First and Last name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient('/auth/me', {
        method: 'PATCH',
        body: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || undefined,
        },
      });

      if (res.data) {
        updateUserState(res.data);
      }

      toast.success('Profile Updated', {
        description: 'Your profile changes have been saved.',
      });
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to update profile', {
        description: err.message || 'Operation failed.',
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
                <UserCog className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Edit Personal Profile
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 font-mono mt-0.5">
                  {user?.employeeCode} • {user?.role}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="editProfileForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Read-only system identifiers */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Employee Identification:</span>
              <span className="font-mono font-semibold text-slate-900">{user?.employeeCode}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Official Email:</span>
              <span className="font-medium text-slate-900">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Department:</span>
              <span className="font-medium text-slate-900">{user?.department || 'MANAGEMENT'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Security Clearance:</span>
              <span className="font-semibold text-indigo-700">{user?.role}</span>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Personal Contact Information
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profFirstName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  First Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="profFirstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  required
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profLastName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Last Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="profLastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  required
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profPhone" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Phone Number (WhatsApp / Mobile)
              </Label>
              <Input
                id="profPhone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="h-10 text-sm font-mono bg-white"
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
            form="editProfileForm"
            disabled={isSubmitting}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-2 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
