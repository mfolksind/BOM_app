'use client';

import React, { useState } from 'react';
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
import { Loader2, UserPlus, Shield, Building2, KeyRound } from 'lucide-react';

const DEPARTMENTS = [
  'MANAGEMENT',
  'PRODUCTION',
  'STORES',
  'QUALITY',
  'DISPATCH',
  'MAINTENANCE',
  'ACCOUNTS',
];

export function CreateAdminDialog({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    employeeCode: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    department: 'MANAGEMENT',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeCode || !formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast.error('Required fields missing', {
        description: 'Please fill out employee code, email, password, and full name.',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password too short', {
        description: 'Password must be at least 8 characters and contain letters and numbers.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient('/admins', {
        method: 'POST',
        body: {
          ...formData,
          employeeCode: formData.employeeCode.toUpperCase().trim(),
          email: formData.email.toLowerCase().trim(),
        },
      });

      toast.success('Admin Created Successfully', {
        description: `Account for ${formData.firstName} (${formData.employeeCode.toUpperCase()}) created.`,
      });

      setFormData({
        employeeCode: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        department: 'MANAGEMENT',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to create admin', {
        description: err.message || 'Validation failed on server.',
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
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Provision Admin Account
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Super Admin control: Provision an administrator account with departmental operational authority.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createAdminForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Personal Details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  First Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="e.g. Rahul"
                  required
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Last Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="e.g. Sharma"
                  required
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Enterprise Identification */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Enterprise Credential & Department
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="employeeCode" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Employee Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="employeeCode"
                  value={formData.employeeCode}
                  onChange={(e) => handleChange('employeeCode', e.target.value)}
                  placeholder="e.g. EMP-ADM-042"
                  required
                  className="h-10 text-sm uppercase font-mono bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Official Email Address <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="name@mfolks.com"
                  required
                  className="h-10 text-sm bg-white"
                />
              </div>

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
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Phone (Optional)
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-10 text-sm font-mono bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Initial Security */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Initial Security Key
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Initial Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Min 8 characters (letters & numbers)"
                required
                className="h-10 text-sm bg-white"
              />
              <p className="text-[11px] text-slate-500">
                The administrator can update this password in their personal profile after logging in.
              </p>
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
            form="createAdminForm"
            disabled={isSubmitting}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-2 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Administrator
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
