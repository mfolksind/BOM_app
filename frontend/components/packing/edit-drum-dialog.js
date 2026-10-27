'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, ShieldCheck, Ruler, Scale, Loader2, Pencil } from 'lucide-react';
import { apiClient } from '@/lib/api';

const DRUM_TYPES = [
  { label: 'Wooden Reel / Drum', value: 'WOODEN' },
  { label: 'Steel Corrugated Drum', value: 'STEEL' },
  { label: 'Plastic Flange Spool', value: 'PLASTIC' },
  { label: 'Plywood Reel', value: 'PLYWOOD' },
];

const DRUM_STATUSES = [
  { label: 'Available (Empty)', value: 'AVAILABLE' },
  { label: 'In Use (Wound with Cable)', value: 'IN_USE' },
  { label: 'Dispatched to Client', value: 'DISPATCHED' },
  { label: 'Damaged / Under Repair', value: 'DAMAGED' },
  { label: 'Scrapped / Retired', value: 'SCRAPPED' },
];

export function EditDrumDialog({
  drum,
  open,
  onOpenChange,
  customers = [],
  onSuccess,
  initialMode = 'view',
}) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    drumNumber: '',
    drumType: 'WOODEN',
    status: 'AVAILABLE',
    flangeDiameterMm: '',
    barrelDiameterMm: '',
    traverseWidthMm: '',
    tareWeightKg: '',
    location: '',
    remarks: '',
  });

  useEffect(() => {
    if (open) {
      setIsEditing(initialMode === 'edit');
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (drum && open) {
      setFormData({
        drumNumber: drum.drumNumber || '',
        drumType: drum.drumType || 'WOODEN',
        status: drum.status || 'AVAILABLE',
        flangeDiameterMm: drum.flangeDiameterMm !== undefined && drum.flangeDiameterMm !== null ? String(drum.flangeDiameterMm) : '',
        barrelDiameterMm: drum.barrelDiameterMm !== undefined && drum.barrelDiameterMm !== null ? String(drum.barrelDiameterMm) : '',
        traverseWidthMm: drum.traverseWidthMm !== undefined && drum.traverseWidthMm !== null ? String(drum.traverseWidthMm) : '',
        tareWeightKg: drum.tareWeightKg !== undefined && drum.tareWeightKg !== null ? String(drum.tareWeightKg) : '',
        location: drum.location || '',
        remarks: drum.remarks || '',
      });
    }
  }, [drum, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const payload = {
        drumType: formData.drumType,
        status: formData.status,
        flangeDiameterMm: formData.flangeDiameterMm ? parseFloat(formData.flangeDiameterMm) : undefined,
        barrelDiameterMm: formData.barrelDiameterMm ? parseFloat(formData.barrelDiameterMm) : undefined,
        traverseWidthMm: formData.traverseWidthMm ? parseFloat(formData.traverseWidthMm) : undefined,
        tareWeightKg: formData.tareWeightKg ? parseFloat(formData.tareWeightKg) : undefined,
        location: formData.location.trim() || undefined,
        remarks: formData.remarks.trim() || undefined,
      };

      const res = await apiClient(`/drums/${drum._id}`, {
        method: 'PATCH',
        body: payload,
      });

      toast.success('Drum Specs Updated', {
        description: `Drum ${drum.drumNumber} details saved.`,
      });

      setIsEditing(false);
      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to update drum', {
        description: err.message || 'Validation error from server.',
      });
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold text-slate-900">
                    {isEditing ? 'Edit Drum Specs & Status' : 'Cable Drum Overview'}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-slate-500 mt-0.5">
                    Drum #{' '}
                    <span className="font-mono font-bold text-slate-800">
                      {drum?.drumNumber}
                    </span>{' '}
                    ({drum?.ownership === 'CUSTOMER' ? 'Customer Supplied' : 'Factory Owned'})
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
                  Edit Drum
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="editDrumForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Drum Identification */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Identification & Status
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Drum Serial #
                </Label>
                <Input
                  value={formData.drumNumber}
                  disabled
                  className="h-10 font-mono text-sm uppercase bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Current Status <span className="text-rose-500">*</span>
                </Label>
                <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                  <SelectTrigger className="h-10 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRUM_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-sm">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Drum Material Construction <span className="text-rose-500">*</span>
                </Label>
                <Select value={formData.drumType} onValueChange={(val) => handleChange('drumType', val)}>
                  <SelectTrigger className="h-10 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRUM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-sm">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Physical Location / Bay
                </Label>
                <Input
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g. Yard 2, Row 4"
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Physical Dimensions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Ruler className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Dimensions & Weight
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Flange Diameter (mm)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.flangeDiameterMm}
                  onChange={(e) => handleChange('flangeDiameterMm', e.target.value)}
                  placeholder="e.g. 1200"
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Barrel Diameter (mm)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.barrelDiameterMm}
                  onChange={(e) => handleChange('barrelDiameterMm', e.target.value)}
                  placeholder="e.g. 600"
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Traverse Width (mm)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.traverseWidthMm}
                  onChange={(e) => handleChange('traverseWidthMm', e.target.value)}
                  placeholder="e.g. 900"
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Tare (Empty) Weight (kg)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.tareWeightKg}
                  onChange={(e) => handleChange('tareWeightKg', e.target.value)}
                  placeholder="e.g. 150"
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Condition & Notes
                </Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => handleChange('remarks', e.target.value)}
                  placeholder="e.g. Lagging boards repaired, ready for winding..."
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
            disabled={loading}
            className="h-10 text-sm cursor-pointer"
          >
            {isEditing ? 'Cancel' : 'Close'}
          </Button>

          {isEditing ? (
            <Button
              type="submit"
              form="editDrumForm"
              disabled={loading}
              className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer shadow-sm"
            >
              {loading ? (
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
              Edit Drum
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
