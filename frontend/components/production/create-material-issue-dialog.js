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
import { Plus, Trash2, ArrowRightLeft, Boxes, Warehouse } from 'lucide-react';

export function CreateMaterialIssueDialog({
  open,
  onOpenChange,
  productionOrderId,
  warehouses = [],
  materials = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    remarks: '',
    lines: [
      {
        materialId: '',
        issuedQuantity: '',
        unit: 'KG',
        ownerType: 'CUSTOMER',
        remarks: '',
      },
    ],
  });

  const handleAddLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          materialId: '',
          issuedQuantity: '',
          unit: 'KG',
          ownerType: 'CUSTOMER',
          remarks: '',
        },
      ],
    }));
  };

  const handleRemoveLine = (idx) => {
    if (formData.lines.length === 1) {
      toast.error('Material issue requires at least one raw material line item');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  };

  const handleLineChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.lines];
      if (field === 'materialId') {
        const mat = materials.find((m) => m._id === value);
        updated[index] = {
          ...updated[index],
          materialId: value,
          unit: mat?.baseUnit || 'KG',
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, lines: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sourceWarehouseId) {
      toast.error('Source raw material warehouse is required');
      return;
    }
    if (!formData.destinationWarehouseId) {
      toast.error('Destination WIP floor location is required');
      return;
    }

    for (let i = 0; i < formData.lines.length; i++) {
      const line = formData.lines[i];
      if (!line.materialId) {
        toast.error(`Please select a raw material for Line #${i + 1}`);
        return;
      }
      const qty = parseFloat(line.issuedQuantity);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`Please enter a valid quantity greater than 0 for Line #${i + 1}`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        sourceWarehouseId: formData.sourceWarehouseId,
        destinationWarehouseId: formData.destinationWarehouseId,
        remarks: formData.remarks.trim() || undefined,
        lines: formData.lines.map((l) => ({
          materialId: l.materialId,
          issuedQuantity: parseFloat(l.issuedQuantity),
          unit: l.unit || 'KG',
          ownerType: l.ownerType,
          remarks: l.remarks.trim() || undefined,
        })),
      };

      await onSuccess(productionOrderId, payload);
      onOpenChange(false);
      setFormData({
        sourceWarehouseId: '',
        destinationWarehouseId: '',
        remarks: '',
        lines: [
          {
            materialId: '',
            issuedQuantity: '',
            unit: 'KG',
            ownerType: 'CUSTOMER',
            remarks: '',
          },
        ],
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
        className="w-full sm:max-w-2xl md:max-w-3xl bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Issue Materials to Floor (MIN)
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Transfer allocated raw materials from store warehouse to WIP machine floor.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createMaterialIssueForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Warehouses */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Warehouse className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Transfer Locations
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Source Store Warehouse <span className="text-rose-500">*</span>
                </Label>
                <SearchableSelect
                  options={warehouses.map((w) => ({
                    value: w._id,
                    label: w.name,
                    code: w.code,
                    subLabel: w.type || 'RAW_MATERIAL',
                  }))}
                  value={formData.sourceWarehouseId}
                  onChange={(val) => setFormData({ ...formData, sourceWarehouseId: val })}
                  placeholder="From Raw Material Store..."
                  searchPlaceholder="Search warehouse..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Destination WIP Floor <span className="text-rose-500">*</span>
                </Label>
                <SearchableSelect
                  options={warehouses.map((w) => ({
                    value: w._id,
                    label: w.name,
                    code: w.code,
                    subLabel: w.type || 'WIP_FLOOR',
                  }))}
                  value={formData.destinationWarehouseId}
                  onChange={(val) => setFormData({ ...formData, destinationWarehouseId: val })}
                  placeholder="To WIP Floor Store..."
                  searchPlaceholder="Search warehouse..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Material Issue Note Remarks
              </Label>
              <Input
                placeholder="e.g. Copper rod coils and XLPE granules issued for work order shift"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="h-10 text-sm bg-white"
              />
            </div>
          </div>

          {/* Section 2: Material lines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Materials to Issue
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                className="h-8 gap-1.5 text-slate-900 border-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Material
              </Button>
            </div>

            <div className="space-y-3">
              {formData.lines.map((line, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Material Item #{idx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                      onClick={() => handleRemoveLine(idx)}
                      disabled={formData.lines.length === 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Material *</Label>
                      <SearchableSelect
                        options={materials.map((m) => ({
                          value: m._id,
                          label: m.name,
                          code: m.code,
                          subLabel: `${m.category || 'RAW_MATERIAL'} • ${m.baseUnit || 'KG'}`,
                        }))}
                        value={line.materialId}
                        onChange={(val) => handleLineChange(idx, 'materialId', val)}
                        placeholder="Select raw material..."
                        searchPlaceholder="Search material by name or code..."
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Qty {line.unit ? `(${line.unit})` : ''} *
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0.001"
                        placeholder="Quantity"
                        value={line.issuedQuantity}
                        onChange={(e) => handleLineChange(idx, 'issuedQuantity', e.target.value)}
                        className="h-9 text-sm bg-white font-medium"
                        required
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Ownership</Label>
                      <Select
                        value={line.ownerType}
                        onValueChange={(val) => handleLineChange(idx, 'ownerType', val)}
                      >
                        <SelectTrigger className="w-full h-9 text-sm bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CUSTOMER" className="text-sm">Customer-Supplied</SelectItem>
                          <SelectItem value="FACTORY" className="text-sm">Factory Owned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
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
            form="createMaterialIssueForm"
            disabled={loading}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
          >
            {loading ? 'Creating Issue Note...' : 'Issue Materials to Floor'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
