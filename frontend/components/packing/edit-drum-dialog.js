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
import { Package, Loader2, Pencil } from 'lucide-react';
import { apiClient } from '@/lib/api';

const DRUM_TYPES = [
  { label: 'Wooden Drum', value: 'WOODEN' },
  { label: 'Steel Drum', value: 'STEEL' },
  { label: 'Plastic Spool', value: 'PLASTIC' },
  { label: 'Plywood Drum', value: 'PLYWOOD' },
];

const DRUM_STATUSES = [
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'In Use', value: 'IN_USE' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Damaged', value: 'DAMAGED' },
  { label: 'Scrapped', value: 'SCRAPPED' },
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

      toast.success('Drum updated successfully');

      setIsEditing(false);
      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to update drum', {
        description: err.message,
      });
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <SheetTitle className="text-base font-semibold text-slate-900">
                    {isEditing ? 'Edit Drum' : 'Drum Details'}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-slate-500">
                    #{drum?.drumNumber} • {drum?.ownership === 'CUSTOMER' ? 'Customer Supplied' : 'Factory Owned'}
                  </SheetDescription>
                </div>
              </div>

              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="editDrumForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Drum Number</Label>
              <Input
                value={formData.drumNumber}
                disabled
                className="h-9 font-mono text-xs uppercase bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) => handleChange('status', val)}
                disabled={!isEditing}
              >
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRUM_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Material Type <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.drumType}
                onValueChange={(val) => handleChange('drumType', val)}
                disabled={!isEditing}
              >
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRUM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Location / Yard Bay</Label>
              <Input
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g. Yard 2, Row 4"
                disabled={!isEditing}
                className="h-9 text-xs"
              />
            </div>
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
                  min="0"
                  value={formData.flangeDiameterMm}
                  onChange={(e) => handleChange('flangeDiameterMm', e.target.value)}
                  placeholder="1200"
                  disabled={!isEditing}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Barrel (mm)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.barrelDiameterMm}
                  onChange={(e) => handleChange('barrelDiameterMm', e.target.value)}
                  placeholder="600"
                  disabled={!isEditing}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Traverse (mm)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.traverseWidthMm}
                  onChange={(e) => handleChange('traverseWidthMm', e.target.value)}
                  placeholder="900"
                  disabled={!isEditing}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-slate-600">Tare Wt (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.tareWeightKg}
                  onChange={(e) => handleChange('tareWeightKg', e.target.value)}
                  placeholder="150"
                  disabled={!isEditing}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Remarks</Label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              placeholder="Optional notes"
              rows={3}
              disabled={!isEditing}
              className="text-xs resize-none"
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
            className="h-9 text-xs cursor-pointer"
          >
            {isEditing ? 'Cancel' : 'Close'}
          </Button>

          {isEditing && (
            <Button
              type="submit"
              form="editDrumForm"
              disabled={loading}
              className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
