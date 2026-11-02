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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

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
      toast.error('Drum number is required');
      return;
    }

    if (formData.ownership === 'CUSTOMER' && !formData.customerId) {
      toast.error('Customer is required for customer-owned drums');
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
        className="w-full sm:max-w-lg md:max-w-xl bg-white p-0 flex flex-col h-full shadow-xl border-l border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-white">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-slate-900">
                  New Drum
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Register a cable drum in the yard inventory
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createDrumForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Drum Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. DRM-1400-01"
                value={formData.drumNumber}
                onChange={(e) => setFormData({ ...formData, drumNumber: e.target.value })}
                className="h-9 text-xs font-mono uppercase bg-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Material Type <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.drumType}
                onValueChange={(val) => setFormData({ ...formData, drumType: val })}
              >
                <SelectTrigger className="w-full h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WOODEN" className="text-xs">Wooden Drum</SelectItem>
                  <SelectItem value="STEEL" className="text-xs">Steel Drum</SelectItem>
                  <SelectItem value="PLASTIC" className="text-xs">Plastic Spool</SelectItem>
                  <SelectItem value="PLYWOOD" className="text-xs">Plywood Drum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Ownership <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.ownership}
                onValueChange={(val) => setFormData({ ...formData, ownership: val })}
              >
                <SelectTrigger className="w-full h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACTORY" className="text-xs">Factory Owned</SelectItem>
                  <SelectItem value="CUSTOMER" className="text-xs">Customer Supplied</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.ownership === 'CUSTOMER' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Customer <span className="text-rose-500">*</span>
                </Label>
                <SearchableSelect
                  options={(customers || []).map((c) => ({
                    value: c._id,
                    label: c.name,
                    code: c.code || 'CUST',
                    subLabel: c.phone || c.email || '',
                  }))}
                  value={formData.customerId}
                  onChange={(val) => setFormData({ ...formData, customerId: val })}
                  placeholder="Select customer"
                  searchPlaceholder="Search customer by name or code..."
                  className="w-full h-9 text-xs bg-white"
                />
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-3">
              Dimensions &amp; Weight
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Flange (mm)</Label>
                <Input
                  type="number"
                  placeholder="1400"
                  value={formData.flangeDiameterMm}
                  onChange={(e) => setFormData({ ...formData, flangeDiameterMm: e.target.value })}
                  className="h-8 text-xs font-mono bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Barrel (mm)</Label>
                <Input
                  type="number"
                  placeholder="700"
                  value={formData.barrelDiameterMm}
                  onChange={(e) => setFormData({ ...formData, barrelDiameterMm: e.target.value })}
                  className="h-8 text-xs font-mono bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Traverse (mm)</Label>
                <Input
                  type="number"
                  placeholder="900"
                  value={formData.traverseWidthMm}
                  onChange={(e) => setFormData({ ...formData, traverseWidthMm: e.target.value })}
                  className="h-8 text-xs font-mono bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Tare Wt (kg)</Label>
                <Input
                  type="number"
                  placeholder="120"
                  value={formData.tareWeightKg}
                  onChange={(e) => setFormData({ ...formData, tareWeightKg: e.target.value })}
                  className="h-8 text-xs font-mono bg-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Remarks</Label>
            <Input
              placeholder="Optional notes or description"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="h-9 text-xs bg-white"
            />
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs h-9 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="createDrumForm"
            disabled={loading}
            className="text-xs h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
          >
            {loading ? 'Creating...' : 'Create Drum'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
