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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Loader2, Edit3, Building2, User, Pencil } from 'lucide-react';

const DEPARTMENTS = [
  'MANAGEMENT',
  'PRODUCTION',
  'STORES',
  'QUALITY',
  'DISPATCH',
  'MAINTENANCE',
  'ACCOUNTS',
];

export function EditAdminDialog({
  admin,
  open,
  onOpenChange,
  onSuccess,
  initialMode = 'view',
}) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    department: 'MANAGEMENT',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setIsEditing(initialMode === 'edit');
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (admin) {
      setFormData({
        firstName: admin.firstName || '',
        lastName: admin.lastName || '',
        phone: admin.phone || '',
        department: admin.department || 'MANAGEMENT',
      });
    }
  }, [admin]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!admin) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient(`/admins/${admin.id}`, {
        method: 'PATCH',
        body: formData,
      });

      toast.success('Admin Updated', {
        description: `Profile for ${formData.firstName} updated successfully.`,
      });

      setIsEditing(false);
      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to update admin', {
        description: err.message || 'Update failed.',
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold text-slate-900">
                    {isEditing ? 'Edit Administrator Profile' : 'Administrator Profile Overview'}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-slate-500 font-mono mt-0.5">
                    {admin?.employeeCode} • {admin?.email}
                  </SheetDescription>
                </div>
              </div>

              {!isEditing && (
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="editAdminForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Names */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Personal Information
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editFirstName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  First Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="editFirstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="e.g. Rahul"
                  required
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editLastName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Last Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="editLastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="e.g. Sharma"
                  required
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Department & Contact */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Department & Contact
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Department
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => handleChange('department', val)}
                >
                  <SelectTrigger className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept} className="text-sm">
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPhone" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Phone
                </Label>
                <Input
                  id="editPhone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-10 text-sm font-mono bg-white"
                />
              </div>
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
            {isEditing ? 'Cancel' : 'Close'}
          </Button>

          {isEditing ? (
            <Button
              type="submit"
              form="editAdminForm"
              disabled={isSubmitting}
              className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-2 cursor-pointer px-6"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-2 cursor-pointer px-6"
            >
              <Pencil className="w-4 h-4" />
              Edit Administrator
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
