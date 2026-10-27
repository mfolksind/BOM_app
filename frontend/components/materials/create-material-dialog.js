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
import { Loader2, Boxes, Tag, Scale } from 'lucide-react';

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

export function CreateMaterialDialog({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'COPPER',
    baseUnit: 'KG',
    hsnCode: '',
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
        description: 'Please enter both material code and material name.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        category: formData.category,
        baseUnit: formData.baseUnit,
        hsnCode: formData.hsnCode.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      const res = await apiClient('/materials', {
        method: 'POST',
        body: payload,
      });

      toast.success('Raw Material Added to Catalog', {
        description: `${formData.name} (${formData.code.toUpperCase()}) created.`,
      });

      setFormData({
        code: '',
        name: '',
        category: 'COPPER',
        baseUnit: 'KG',
        hsnCode: '',
        description: '',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to create material', {
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
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Add Raw Material Item
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Define raw stock item, metallurgy/chemical category, HSN taxation code, and base inventory unit.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createMaterialForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Tag className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Item Identification &amp; Category
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="matCode" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Material Item Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="matCode"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="e.g. MAT-CU-8MM"
                  required
                  className="h-10 font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="matCat" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Raw Material Category <span className="text-rose-500">*</span>
                </Label>
                <Select value={formData.category} onValueChange={(val) => handleChange('category', val)}>
                  <SelectTrigger id="matCat" className="h-10 text-sm bg-white">
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
                <Label htmlFor="matName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Material Name &amp; Grade <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="matName"
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
                <Label htmlFor="baseUnit" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Base Inventory Unit <span className="text-rose-500">*</span>
                </Label>
                <Select value={formData.baseUnit} onValueChange={(val) => handleChange('baseUnit', val)}>
                  <SelectTrigger id="baseUnit" className="h-10 text-sm bg-white">
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
                <Label htmlFor="hsnCode" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  HSN / SAC Tax Code
                </Label>
                <Input
                  id="hsnCode"
                  value={formData.hsnCode}
                  onChange={(e) => handleChange('hsnCode', e.target.value)}
                  placeholder="e.g. 74081190"
                  className="h-10 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="matDesc" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Engineering Notes &amp; Specifications
                </Label>
                <Textarea
                  id="matDesc"
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
            Cancel
          </Button>
          <Button
            type="submit"
            form="createMaterialForm"
            disabled={isSubmitting}
            className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding Material...
              </>
            ) : (
              'Save & Add to Catalog'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
