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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Loader2, Warehouse, MapPin, Boxes } from 'lucide-react';

const WAREHOUSE_TYPES = [
  { label: 'Raw Material Store', value: 'RAW_MATERIAL' },
  { label: 'Customer Supplied Store (Job-Work)', value: 'CUSTOMER_SUPPLIED' },
  { label: 'Shopfloor WIP (Work In Progress)', value: 'WORK_IN_PROGRESS' },
  { label: 'Finished Cable Goods Store', value: 'FINISHED_GOODS' },
  { label: 'Scrap & Waste Yard', value: 'SCRAP' },
  { label: 'Packing Material Store (Drums/Reels)', value: 'PACKING_MATERIAL' },
  { label: 'Quarantine / QC Inspection Area', value: 'QUARANTINE' },
];

export function CreateWarehouseDialog({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'RAW_MATERIAL',
    location: '',
    address: '',
    capacity: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code || !formData.name) {
      toast.error('Required fields missing', {
        description: 'Please enter both warehouse code and warehouse name.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        type: formData.type,
        location: formData.location.trim() || undefined,
        address: formData.address.trim() || undefined,
        capacity: formData.capacity ? Number(formData.capacity) : undefined,
        description: formData.description.trim() || undefined,
      };

      const res = await apiClient('/warehouses', {
        method: 'POST',
        body: payload,
      });

      toast.success('Warehouse Created Successfully', {
        description: `${formData.name} (${formData.code.toUpperCase()}) added to master.`,
      });

      setFormData({
        code: '',
        name: '',
        type: 'RAW_MATERIAL',
        location: '',
        address: '',
        capacity: '',
        description: '',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to create warehouse', {
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
                <Warehouse className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Register Warehouse Facility
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Configure raw materials, customer job-work yards, WIP staging bays, or finished cable storage.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createWarehouseForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Boxes className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Facility Classification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="whCode" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Warehouse Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="whCode"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="e.g. WH-RAW-01"
                  required
                  className="h-10 font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whType" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Operational Type <span className="text-rose-500">*</span>
                </Label>
                <Select value={formData.type} onValueChange={(val) => handleChange('type', val)}>
                  <SelectTrigger id="whType" className="h-10 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WAREHOUSE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-sm">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="whName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Warehouse Facility Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="whName"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Central Copper & Aluminum Yard"
                  required
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Location &amp; Capacity
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="whLocation" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Plant Bay / Floor Zone
                </Label>
                <Input
                  id="whLocation"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g. Shed 3, Bay B, Floor 1"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whCapacity" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Capacity Metric (Tons / SqFt)
                </Label>
                <Input
                  id="whCapacity"
                  type="number"
                  min="0"
                  value={formData.capacity}
                  onChange={(e) => handleChange('capacity', e.target.value)}
                  placeholder="e.g. 500"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="whAddress" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Facility Physical Address
                </Label>
                <Input
                  id="whAddress"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Plant Site address / Gate Entry number"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="whDesc" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Storage Facility Remarks
                </Label>
                <Textarea
                  id="whDesc"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="e.g. Overhead crane access 15T, humidity controlled insulation granule room..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
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
            Cancel
          </Button>
          <Button
            type="submit"
            form="createWarehouseForm"
            disabled={isSubmitting}
            className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Facility...
              </>
            ) : (
              'Save & Register Warehouse'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
