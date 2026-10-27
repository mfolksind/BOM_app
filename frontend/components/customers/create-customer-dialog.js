'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Loader2, Building2, MapPin, ShieldCheck, CreditCard } from 'lucide-react';

export function CreateCustomerDialog({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    legalName: '',
    gstin: '',
    pan: '',
    contactPerson: '',
    email: '',
    phone: '',
    creditDays: 30,
    jobWorkTerms: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.code ||
      !formData.name ||
      !formData.contactPerson ||
      !formData.email ||
      !formData.phone ||
      !formData.street ||
      !formData.city ||
      !formData.state ||
      !formData.postalCode
    ) {
      toast.error('Required fields missing', {
        description:
          'Please fill in Customer Code, Name, Contact Person, Email, Phone, Street Address, City, State, and Postal Code.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        legalName: formData.legalName.trim() || undefined,
        gstin: formData.gstin.trim() ? formData.gstin.toUpperCase().trim() : undefined,
        pan: formData.pan.trim() ? formData.pan.toUpperCase().trim() : undefined,
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        creditDays: Number(formData.creditDays) || 30,
        jobWorkTerms: formData.jobWorkTerms.trim() || undefined,
        billingAddress: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: 'India',
        },
      };

      const res = await apiClient('/customers', {
        method: 'POST',
        body: payload,
      });

      toast.success('Customer Registered Successfully', {
        description: `${formData.name} (${formData.code.toUpperCase()}) added to master.`,
      });

      setFormData({
        code: '',
        name: '',
        legalName: '',
        gstin: '',
        pan: '',
        contactPerson: '',
        email: '',
        phone: '',
        creditDays: 30,
        jobWorkTerms: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to create customer', {
        description: err.message || 'Validation error from server.',
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
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Register New Customer
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Client company master for job-work contracts, purchase orders, and stock allocation.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createCustomerForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Company Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Company Identification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="custCode" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Customer Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="custCode"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="e.g. CUST-HVL-01"
                  required
                  className="h-10 font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Company Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="custName"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Havells India Limited"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="custLegal" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Legal Entity Name
                </Label>
                <Input
                  id="custLegal"
                  value={formData.legalName}
                  onChange={(e) => handleChange('legalName', e.target.value)}
                  placeholder="Registered corporate legal name"
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tax Registration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Tax Identifiers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="custGstin" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  GSTIN (15 Digits)
                </Label>
                <Input
                  id="custGstin"
                  value={formData.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value)}
                  placeholder="27AAACH7409R1ZZ"
                  maxLength={15}
                  className="h-10 font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custPan" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  PAN (10 Characters)
                </Label>
                <Input
                  id="custPan"
                  value={formData.pan}
                  onChange={(e) => handleChange('pan', e.target.value)}
                  placeholder="AAACH7409R"
                  maxLength={10}
                  className="h-10 font-mono text-sm uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact Person & Terms */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Primary Contact &amp; Credit Terms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="custContact" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Contact Person <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="custContact"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  placeholder="e.g. Mr. Rajesh Sharma"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custPhone" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Phone Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="custPhone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. 9820012345"
                  required
                  className="h-10 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custEmail" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="custEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="procurement@client.com"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="creditDays" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Payment Credit Days
                </Label>
                <Input
                  id="creditDays"
                  type="number"
                  value={formData.creditDays}
                  onChange={(e) => handleChange('creditDays', e.target.value)}
                  min={0}
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Billing Address */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                4. Billing Address
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="space-y-1">
                <Label htmlFor="street" className="text-xs font-medium text-slate-700">Street Address *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                  placeholder="Plot No. 42, Industrial Area, Phase II"
                  required
                  className="h-10 bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="city" className="text-xs font-medium text-slate-700">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Mumbai"
                    required
                    className="h-10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="state" className="text-xs font-medium text-slate-700">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="Maharashtra"
                    required
                    className="h-10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="postalCode" className="text-xs font-medium text-slate-700">Postal Code *</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                    placeholder="400001"
                    required
                    className="h-10 bg-white font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Job Work Terms */}
          <div className="space-y-2">
            <Label htmlFor="terms" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Contractual Job-Work Terms
            </Label>
            <Textarea
              id="terms"
              value={formData.jobWorkTerms}
              onChange={(e) => handleChange('jobWorkTerms', e.target.value)}
              placeholder="e.g. Payment within 30 days of dispatch, 2% scrap allowance, drum returns within 45 days..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </form>

        {/* Sticky Drawer Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-10 text-sm cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="createCustomerForm"
            disabled={isSubmitting}
            className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              'Save & Register Customer'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
