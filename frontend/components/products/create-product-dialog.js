'use client';

import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Loader2, Cable, Layers, ShieldCheck, BookmarkCheck } from 'lucide-react';

const VOLTAGE_GRADES = ['1.1KV', '3.3KV', '6.6KV', '11KV', '22KV', '33KV'];
const CONDUCTOR_TYPES = ['COPPER', 'ALUMINUM'];
const INSULATION_TYPES = ['XLPE', 'PVC', 'EPR', 'ZHFR'];
const ARMOUR_TYPES = ['UNARMOURED', 'ROUND_WIRE_ARMOURED', 'STRIP_ARMOURED'];

export function CreateProductDialog({ open, onOpenChange, onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    voltageGrade: '1.1KV',
    coreCount: 4,
    crossSectionSqMm: 50,
    conductorMaterial: 'ALUMINUM',
    insulationType: 'XLPE',
    armourType: 'STRIP_ARMOURED',
    standardSpecification: 'IS 7098 Part 1',
    customerId: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      apiClient('/customers?limit=100').then((res) => {
        if (res.data) setCustomers(res.data);
      });
    }
  }, [open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code || !formData.name) {
      toast.error('Required fields missing', {
        description: 'Please enter Product Code and Cable Name.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        voltageGrade: formData.voltageGrade,
        coreCount: Number(formData.coreCount) || 1,
        crossSectionSqMm: Number(formData.crossSectionSqMm) || 1.5,
        conductorMaterial: formData.conductorMaterial,
        insulationType: formData.insulationType,
        armourType: formData.armourType,
        standardSpecification: formData.standardSpecification.trim() || undefined,
        customerId: formData.customerId ? formData.customerId : undefined,
        description: formData.description.trim() || undefined,
        baseUnit: 'METER',
      };

      const res = await apiClient('/products', {
        method: 'POST',
        body: payload,
      });

      toast.success('Cable Product Created Successfully', {
        description: `${formData.name} (${formData.code.toUpperCase()}) added to master catalog.`,
      });

      setFormData({
        code: '',
        name: '',
        voltageGrade: '1.1KV',
        coreCount: 4,
        crossSectionSqMm: 50,
        conductorMaterial: 'ALUMINUM',
        insulationType: 'XLPE',
        armourType: 'STRIP_ARMOURED',
        standardSpecification: 'IS 7098 Part 1',
        customerId: '',
        description: '',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to create cable product', {
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
                <Cable className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Register Cable Product
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Define manufactured cable specification, cores, conductor size, and insulation type.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createProductForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Product Code & Identification */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Product Identification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prodCode" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Product Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="prodCode"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="e.g. CBL-1.1KV-4C-50SQMM"
                  required
                  className="h-10 font-mono uppercase text-sm bg-white"
                />
                <p className="text-[11px] text-slate-500">Unique alphanumeric code for BOM mapping</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prodName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Cable Description / Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="prodName"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. 1.1kV 4C x 50 sq.mm Al XLPE Armoured"
                  required
                  className="h-10 text-sm bg-white"
                />
                <p className="text-[11px] text-slate-500">Commercial specification title</p>
              </div>
            </div>
          </div>

          {/* Section 2: Electrical & Physical Specs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Layers className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Electrical & Conductor Specs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Voltage Grade
                </Label>
                <Select
                  value={formData.voltageGrade}
                  onValueChange={(val) => handleChange('voltageGrade', val)}
                >
                  <SelectTrigger className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Voltage" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLTAGE_GRADES.map((v) => (
                      <SelectItem key={v} value={v} className="text-sm">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Conductor Metal
                </Label>
                <Select
                  value={formData.conductorMaterial}
                  onValueChange={(val) => handleChange('conductorMaterial', val)}
                >
                  <SelectTrigger className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDUCTOR_TYPES.map((c) => (
                      <SelectItem key={c} value={c} className="text-sm">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coreCount" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Number of Cores
                </Label>
                <Input
                  id="coreCount"
                  type="number"
                  value={formData.coreCount}
                  onChange={(e) => handleChange('coreCount', e.target.value)}
                  min={1}
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="crossSection" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Cross Section (sq. mm)
                </Label>
                <Input
                  id="crossSection"
                  type="number"
                  step="0.1"
                  value={formData.crossSectionSqMm}
                  onChange={(e) => handleChange('crossSectionSqMm', e.target.value)}
                  min={0.5}
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Sheathing & Armour Protection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Insulation & Armour Protection
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Insulation Type
                </Label>
                <Select
                  value={formData.insulationType}
                  onValueChange={(val) => handleChange('insulationType', val)}
                >
                  <SelectTrigger className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Insulation" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSULATION_TYPES.map((i) => (
                      <SelectItem key={i} value={i} className="text-sm">
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Armour Protection
                </Label>
                <Select
                  value={formData.armourType}
                  onValueChange={(val) => handleChange('armourType', val)}
                >
                  <SelectTrigger className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Armour" />
                  </SelectTrigger>
                  <SelectContent>
                    {ARMOUR_TYPES.map((a) => (
                      <SelectItem key={a} value={a} className="text-sm">
                        {a.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 4: Standards & Client Allocation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <BookmarkCheck className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                4. Standards & Customer Association
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Customer Allocation (Optional)
                </Label>
                <Select
                  value={formData.customerId || 'NONE'}
                  onValueChange={(val) => handleChange('customerId', val === 'NONE' ? '' : val)}
                >
                  <SelectTrigger className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Standard Catalog (All Customers)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" className="text-sm">
                      Standard Catalog (Shared Across All Customers)
                    </SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c._id} value={c._id} className="text-sm">
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">Assign only if this cable is engineered for a specific client contract.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="standardSpec" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Manufacturing Standard / IS Specification
                </Label>
                <Input
                  id="standardSpec"
                  value={formData.standardSpecification}
                  onChange={(e) => handleChange('standardSpecification', e.target.value)}
                  placeholder="e.g. IS 7098 Part 1 / IEC 60502"
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="productDesc" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Technical Remarks / Notes
                </Label>
                <Textarea
                  id="productDesc"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Notes on conductor stranding class, colour coding, or test parameters..."
                  rows={2}
                  className="text-sm bg-white"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Drawer Sticky Footer */}
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
            form="createProductForm"
            disabled={isSubmitting}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-2 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Cable Product
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
