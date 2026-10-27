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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Loader2, Building2, MapPin, ShieldCheck, CreditCard, Pencil } from 'lucide-react';

export function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
  initialMode = 'view',
}) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [formData, setFormData] = useState({
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
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setIsEditing(initialMode === 'edit');
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        legalName: customer.legalName || '',
        gstin: customer.gstin || '',
        pan: customer.pan || '',
        contactPerson: customer.contactPerson || '',
        email: customer.email || '',
        phone: customer.phone || '',
        creditDays: customer.creditDays ?? 30,
        jobWorkTerms: customer.jobWorkTerms || '',
        street: customer.billingAddress?.street || '',
        city: customer.billingAddress?.city || '',
        state: customer.billingAddress?.state || '',
        postalCode: customer.billingAddress?.postalCode || '',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
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
        description: 'Company Name, Contact Person, Email, Phone, Street, City, State, and Postal Code are required.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        legalName: formData.legalName.trim() || undefined,
        gstin: formData.gstin.trim() ? formData.gstin.toUpperCase().trim() : undefined,
        pan: formData.pan.trim() ? formData.pan.toUpperCase().trim() : undefined,
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        creditDays: Number(formData.creditDays) || 30,
        jobWorkTerms: formData.jobWorkTerms.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        billingAddress: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: 'India',
        },
      };

      const res = await api.patch(`/customers/${customer._id}`, payload);

      toast.success('Customer Updated Successfully', {
        description: `${formData.name} profile has been updated.`,
      });

      setIsEditing(false);
      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to update customer', {
        description: err.message || 'Validation error from server.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold text-slate-900">
                    {isEditing ? 'Edit Customer Profile' : 'Customer Overview'}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-slate-500 mt-0.5">
                    Code: <span className="font-mono font-bold text-slate-800">{customer.code}</span> ({customer.isActive ? 'Active' : 'Inactive'})
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
                  Edit Details
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="editCustomerForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Company Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Company Identification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Company Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Havells India Limited"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editLegalName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Legal Entity Name
                </Label>
                <Input
                  id="editLegalName"
                  value={formData.legalName}
                  onChange={(e) => handleChange('legalName', e.target.value)}
                  placeholder="Registered name on GST"
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
                <Label htmlFor="editGstin" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  GSTIN (15 Digits)
                </Label>
                <Input
                  id="editGstin"
                  value={formData.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value)}
                  placeholder="27AAACH7409R1ZZ"
                  maxLength={15}
                  className="h-10 font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPan" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  PAN (10 Characters)
                </Label>
                <Input
                  id="editPan"
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
                <Label htmlFor="editContactPerson" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Contact Person <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="editContactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  placeholder="Mr. Rajesh Sharma"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPhone" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Phone Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="editPhone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. 9820012345"
                  required
                  className="h-10 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editEmail" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="procurement@client.com"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editCreditDays" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Payment Credit Days
                </Label>
                <Input
                  id="editCreditDays"
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
                <Label htmlFor="editStreet" className="text-xs font-medium text-slate-700">Street Address *</Label>
                <Input
                  id="editStreet"
                  value={formData.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                  placeholder="Plot No. 42, Industrial Area, Phase II"
                  required
                  className="h-10 bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editCity" className="text-xs font-medium text-slate-700">City *</Label>
                  <Input
                    id="editCity"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Mumbai"
                    required
                    className="h-10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editState" className="text-xs font-medium text-slate-700">State *</Label>
                  <Input
                    id="editState"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="Maharashtra"
                    required
                    className="h-10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editPostalCode" className="text-xs font-medium text-slate-700">Postal Code *</Label>
                  <Input
                    id="editPostalCode"
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

          {/* Section 5: Terms & Notes */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editTerms" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Contractual Job-Work Terms
              </Label>
              <Textarea
                id="editTerms"
                value={formData.jobWorkTerms}
                onChange={(e) => handleChange('jobWorkTerms', e.target.value)}
                placeholder="Payment against dispatch, 2% scrap allowance, reel return within 45 days..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editNotes" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Internal Account Notes
              </Label>
              <Textarea
                id="editNotes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Special shipping instructions, gate pass requirements, or preferred delivery timing..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
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
            {isEditing ? 'Cancel' : 'Close'}
          </Button>

          {isEditing ? (
            <Button
              type="submit"
              form="editCustomerForm"
              disabled={isSubmitting}
              className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer shadow-sm"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Customer Profile
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
