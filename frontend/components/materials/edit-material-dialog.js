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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Loader2, Boxes, Tag, Scale, Pencil } from 'lucide-react';

const MATERIAL_CATEGORIES = [
  { label: 'Copper (Rods, Wires & Strips)', value: 'COPPER' },
  { label: 'Aluminum (Rods & Conductors)', value: 'ALUMINUM' },
  { label: 'PVC Insulation & Sheathing Compound', value: 'PVC_COMPOUND' },
  { label: 'XLPE Cross-Linked Polyethylene', value: 'XLPE_COMPOUND' },
  { label: 'Masterbatch / Color Pigments', value: 'MASTERBATCH' },
  { label: 'GI Wire / Strip (Armouring)', value: 'GI_WIRE_STRIP' },
  { label: 'Binding Tape & Melinex', value: 'TAPE_BINDING' },
  { label: 'Packing Material & Drum Accessories', value: 'PACKING_MATERIAL' },
  { label: 'Chemicals & Solvents', value: 'CHEMICAL_SOLVENT' },
  { label: 'Other Raw Material', value: 'OTHER' },
];

const BASE_UNITS = [
  { label: 'Kilogram (KG)', value: 'KG' },
  { label: 'Meter (MTR)', value: 'METER' },
  { label: 'Kilometer (KM)', value: 'KM' },
  { label: 'Pieces / Nos (PCS)', value: 'PCS' },
  { label: 'Rolls (ROLL)', value: 'ROLL' },
  { label: 'Drums (DRUM)', value: 'DRUM' },
  { label: 'Liters (LITER)', value: 'LITER' },
];

export function EditMaterialDialog({
  material,
  open,
  onOpenChange,
  onSuccess,
  initialMode = 'view',
}) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'COPPER',
    baseUnit: 'KG',
    hsnCode: '',
    description: '',
    standardRate: '',
    defaultReorderThreshold: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setIsEditing(initialMode === 'edit');
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (material && open) {
      setFormData({
        code: material.code || '',
        name: material.name || '',
        category: material.category || 'COPPER',
        baseUnit: material.baseUnit || 'KG',
        hsnCode: material.hsnCode || '',
        description: material.description || '',
        standardRate: material.standardRate !== undefined && material.standardRate !== null ? String(material.standardRate) : '',
        defaultReorderThreshold: material.defaultReorderThreshold !== undefined && material.defaultReorderThreshold !== null ? String(material.defaultReorderThreshold) : '',
      });
    }
  }, [material, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Required fields missing', {
        description: 'Please enter a material name.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        baseUnit: formData.baseUnit,
        hsnCode: formData.hsnCode.trim() || undefined,
        description: formData.description.trim() || undefined,
        standardRate: formData.standardRate ? Number(formData.standardRate) : undefined,
        defaultReorderThreshold: formData.defaultReorderThreshold ? Number(formData.defaultReorderThreshold) : undefined,
      };

      const res = await apiClient(`/materials/${material._id}`, {
        method: 'PATCH',
        body: payload,
      });

      toast.success('Raw Material Updated', {
        description: `${formData.name} catalog record updated.`,
      });

      setIsEditing(false);
      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to update material', {
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold text-slate-900">
                    {isEditing ? 'Edit Raw Material Item' : 'Raw Material Specifications'}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-slate-500 mt-0.5">
                    Code: <span className="font-mono font-bold text-slate-800">{material?.code}</span> ({material?.isActive ? 'Active' : 'Inactive'})
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
                  Edit Specs
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="editMaterialForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Tag className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Item Identification &amp; Category
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editMatCode" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Material Item Code
                </Label>
                <Input
                  id="editMatCode"
                  value={formData.code}
                  disabled
                  className="h-10 font-mono text-sm uppercase bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editMatCat" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Raw Material Category <span className="text-rose-500">*</span>
                </Label>
                <Select value={formData.category} onValueChange={(val) => handleChange('category', val)}>
                  <SelectTrigger id="editMatCat" className="h-10 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {MATERIAL_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-sm">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="editMatName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Material Name &amp; Grade <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="editMatName"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. 8.0mm Electrolytic Copper Continuous Cast Rod (CC Rod)"
                  required
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Scale className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Measurement &amp; Taxation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editBaseUnit" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Base Inventory Unit <span className="text-rose-500">*</span>
                </Label>
                <Select value={formData.baseUnit} onValueChange={(val) => handleChange('baseUnit', val)}>
                  <SelectTrigger id="editBaseUnit" className="h-10 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BASE_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value} className="text-sm">
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editHsnCode" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  HSN / SAC Tax Code
                </Label>
                <Input
                  id="editHsnCode"
                  value={formData.hsnCode}
                  onChange={(e) => handleChange('hsnCode', e.target.value)}
                  placeholder="e.g. 74081190"
                  className="h-10 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editStdRate" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Standard Rate (₹ / Unit)
                </Label>
                <Input
                  id="editStdRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.standardRate}
                  onChange={(e) => handleChange('standardRate', e.target.value)}
                  placeholder="e.g. 740.00"
                  className="h-10 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editReorder" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Reorder Threshold Qty
                </Label>
                <Input
                  id="editReorder"
                  type="number"
                  min="0"
                  value={formData.defaultReorderThreshold}
                  onChange={(e) => handleChange('defaultReorderThreshold', e.target.value)}
                  placeholder="e.g. 500"
                  className="h-10 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="editMatDesc" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Engineering Notes &amp; Specifications
                </Label>
                <Textarea
                  id="editMatDesc"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="e.g. Purity 99.97% ETP copper, conductivity 101% IACS, delivered in 2.5T coil straps..."
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
            {isEditing ? 'Cancel' : 'Close'}
          </Button>

          {isEditing ? (
            <Button
              type="submit"
              form="editMaterialForm"
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
              Edit Specs
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
