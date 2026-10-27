'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { Package, ShieldCheck, Ruler, Scale } from 'lucide-react';

export function CreateDrumDialog({
  open,
  onOpenChange,
  customers = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    drumNumber: '',
    drumType: 'WOODEN',
    ownership: 'FACTORY',
    customerId: '',
    flangeDiameterMm: '',
    barrelDiameterMm: '',
    traverseWidthMm: '',
    tareWeightKg: '',
    maxCapacityMeters: '',
    remarks: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.drumNumber.trim()) {
      toast.error('Drum serial identification number is required');
      return;
    }

    if (formData.ownership === 'CUSTOMER' && !formData.customerId) {
      toast.error('Customer reference is required for customer-supplied drums');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        drumNumber: formData.drumNumber.trim().toUpperCase(),
        drumType: formData.drumType,
        ownership: formData.ownership,
        customerId: formData.ownership === 'CUSTOMER' ? formData.customerId : undefined,
        flangeDiameterMm: formData.flangeDiameterMm ? parseFloat(formData.flangeDiameterMm) : undefined,
        barrelDiameterMm: formData.barrelDiameterMm ? parseFloat(formData.barrelDiameterMm) : undefined,
        traverseWidthMm: formData.traverseWidthMm ? parseFloat(formData.traverseWidthMm) : undefined,
        tareWeightKg: formData.tareWeightKg ? parseFloat(formData.tareWeightKg) : undefined,
        maxCapacityMeters: formData.maxCapacityMeters ? parseFloat(formData.maxCapacityMeters) : undefined,
        remarks: formData.remarks.trim() || undefined,
      };

      await onSuccess(payload);
      onOpenChange(false);
      setFormData({
        drumNumber: '',
        drumType: 'WOODEN',
        ownership: 'FACTORY',
        customerId: '',
        flangeDiameterMm: '',
        barrelDiameterMm: '',
        traverseWidthMm: '',
        tareWeightKg: '',
        maxCapacityMeters: '',
        remarks: '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
                <Package className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Register Cable Drum
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Track returnable cable spools, wooden reels, and corrugated steel drums.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createDrumForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Drum Identification */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Drum Identification & Type
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Drum Serial Number / Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. DRM-WD-1400-01"
                  value={formData.drumNumber}
                  onChange={(e) => setFormData({ ...formData, drumNumber: e.target.value })}
                  className="h-10 text-sm font-mono uppercase bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Drum Material Type <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.drumType}
                  onValueChange={(val) => setFormData({ ...formData, drumType: val })}
                >
                  <SelectTrigger className="w-full h-10 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WOODEN" className="text-sm">Heavy Wooden Drum</SelectItem>
                    <SelectItem value="STEEL" className="text-sm">Corrugated Steel Drum</SelectItem>
                    <SelectItem value="PLASTIC" className="text-sm">Plastic Spool (Control / Small Wires)</SelectItem>
                    <SelectItem value="PLYWOOD" className="text-sm">Export Plywood Drum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Ownership */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Custody & Ownership
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Drum Ownership <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.ownership}
                  onValueChange={(val) => setFormData({ ...formData, ownership: val })}
                >
                  <SelectTrigger className="w-full h-10 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FACTORY" className="text-sm">Factory Owned (Returnable)</SelectItem>
                    <SelectItem value="CUSTOMER" className="text-sm">Customer Supplied Drum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.ownership === 'CUSTOMER' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Customer Owner <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(val) => setFormData({ ...formData, customerId: val })}
                  >
                    <SelectTrigger className="w-full h-10 text-sm bg-white">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {customers.map((c) => (
                        <SelectItem key={c._id} value={c._id} className="text-sm">
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Dimensions & Weight */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Ruler className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Physical Dimensions & Tare Weight
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Flange Diameter (mm)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 1400"
                  value={formData.flangeDiameterMm}
                  onChange={(e) => setFormData({ ...formData, flangeDiameterMm: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Barrel Diameter (mm)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 700"
                  value={formData.barrelDiameterMm}
                  onChange={(e) => setFormData({ ...formData, barrelDiameterMm: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Traverse Width (mm)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 900"
                  value={formData.traverseWidthMm}
                  onChange={(e) => setFormData({ ...formData, traverseWidthMm: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Tare Empty Weight (Kg)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 120"
                  value={formData.tareWeightKg}
                  onChange={(e) => setFormData({ ...formData, tareWeightKg: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Notes & Inspection Status
              </Label>
              <Input
                placeholder="e.g. Inspected on delivery, painted ends for export compliance"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
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
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-sm h-10 border-slate-200 cursor-pointer bg-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="createDrumForm"
            disabled={loading}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
          >
            {loading ? 'Registering...' : 'Register Drum'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
