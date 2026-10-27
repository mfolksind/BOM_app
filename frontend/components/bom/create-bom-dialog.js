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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Layers, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';

export function CreateBomDialog({ open, onOpenChange, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    bomNumber: '',
    batchSize: 1000,
    outputUnit: 'METER',
    notes: '',
    items: [
      {
        materialId: '',
        quantityPerUnit: '',
        scrapTolerancePercentage: 0,
        stageSequence: 1,
        notes: '',
      },
    ],
  });

  useEffect(() => {
    if (open) {
      Promise.all([
        apiClient('/products?limit=100'),
        apiClient('/materials?limit=100'),
      ])
        .then(([prodRes, matRes]) => {
          if (prodRes?.data) setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.items || []);
          if (matRes?.data) setMaterials(Array.isArray(matRes.data) ? matRes.data : matRes.data.items || []);
        })
        .catch((err) => {
          console.error('Failed to load master metadata', err);
        });
    }
  }, [open]);

  const handleProductChange = (productId) => {
    const prod = products.find((p) => p._id === productId);
    setFormData((prev) => ({
      ...prev,
      productId,
      outputUnit: prod?.baseUnit || 'METER',
      bomNumber: prod && !prev.bomNumber ? `BOM-${prod.code}-V1` : prev.bomNumber,
    }));
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          materialId: '',
          quantityPerUnit: '',
          scrapTolerancePercentage: 0,
          stageSequence: prev.items.length + 1,
          notes: '',
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) {
      toast.error('At least one raw material line is required in a BOM');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productId) {
      toast.error('Target Cable Product is required');
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      toast.error('At least one raw material line item is required');
      return;
    }

    const seenMaterials = new Set();
    for (let i = 0; i < formData.items.length; i++) {
      const line = formData.items[i];
      if (!line.materialId) {
        toast.error(`Please select a raw material for Line #${i + 1}`);
        return;
      }
      if (seenMaterials.has(line.materialId)) {
        toast.error('Duplicate raw material detected. Each material can appear only once in a recipe.');
        return;
      }
      seenMaterials.add(line.materialId);

      const qty = parseFloat(line.quantityPerUnit);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`Valid consumption rate greater than 0 is required for Line #${i + 1}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        productId: formData.productId,
        batchSize: parseFloat(formData.batchSize) || 1000,
        outputUnit: formData.outputUnit || 'METER',
        bomNumber: formData.bomNumber?.trim() ? formData.bomNumber.trim().toUpperCase() : undefined,
        notes: formData.notes?.trim() || undefined,
        items: formData.items.map((itm) => ({
          materialId: itm.materialId,
          quantityPerUnit: parseFloat(itm.quantityPerUnit),
          scrapTolerancePercentage: parseFloat(itm.scrapTolerancePercentage) || 0,
          stageSequence: parseInt(itm.stageSequence, 10) || 1,
          notes: itm.notes?.trim() || undefined,
          isMandatory: true,
        })),
      };

      const res = await apiClient('/boms', {
        method: 'POST',
        body: payload,
      });

      toast.success('BOM Created Successfully', {
        description: `BOM registered as Draft. You can review and activate it anytime.`,
      });

      onOpenChange(false);
      setFormData({
        productId: '',
        bomNumber: '',
        batchSize: 1000,
        outputUnit: 'METER',
        notes: '',
        items: [
          {
            materialId: '',
            quantityPerUnit: '',
            scrapTolerancePercentage: 0,
            stageSequence: 1,
            notes: '',
          },
        ],
      });

      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to create BOM', {
        description: err.message || 'Validation error from server.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const productOptions = products.map((p) => ({
    value: p._id,
    label: p.name,
    code: p.code,
    subLabel: `${p.cableCategory || 'POWER_CABLE'} • ${p.voltageGrade || '1.1KV'}`,
  }));

  const materialOptions = materials.map((m) => ({
    value: m._id,
    label: m.name,
    code: m.code,
    subLabel: `${m.category || 'RAW_MATERIAL'} • ${m.baseUnit || 'KG'}`,
  }));

  const selectedProduct = products.find((p) => p._id === formData.productId);

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
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  New Bill of Materials (BOM)
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Define engineering manufacturing norms and raw material consumption rates.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createBomForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Finished Cable Product */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Target Cable Product
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Cable Product <span className="text-rose-500">*</span>
              </Label>
              <SearchableSelect
                options={productOptions}
                value={formData.productId}
                onChange={handleProductChange}
                placeholder="Search and choose cable product..."
                searchPlaceholder="Search product by name, code, voltage..."
              />
            </div>

            {selectedProduct && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Category: <strong className="text-slate-900 font-semibold">{selectedProduct.cableCategory || 'POWER_CABLE'}</strong>
                </span>
                <span className="text-slate-600">
                  Voltage: <strong className="text-slate-900 font-semibold">{selectedProduct.voltageGrade || '1.1KV'}</strong>
                </span>
                <span className="text-slate-600">
                  Conductor: <strong className="text-slate-900 font-semibold">{selectedProduct.conductorMaterial}</strong>
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Standard Batch Output <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    step="any"
                    value={formData.batchSize}
                    onChange={(e) => setFormData({ ...formData, batchSize: e.target.value })}
                    className="h-10 text-sm bg-white font-medium"
                    required
                  />
                  <span className="text-xs font-bold text-slate-600 px-3 py-2.5 bg-slate-100 rounded-md border border-slate-200">
                    {formData.outputUnit}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Standard batch size (usually 1,000 meters).</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Custom BOM Identifier
                </Label>
                <Input
                  placeholder="Auto-generated if empty"
                  value={formData.bomNumber}
                  onChange={(e) => setFormData({ ...formData, bomNumber: e.target.value })}
                  className="h-10 text-sm bg-white font-mono uppercase"
                />
                <p className="text-[11px] text-slate-500">e.g. BOM-LT-4C-50-V1</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Engineering Notes & Specifications
              </Label>
              <Textarea
                placeholder="Specify extrusion heat zones, conductor compacting ratio, spark test voltage..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="text-sm bg-white resize-none"
              />
            </div>
          </div>

          {/* Section 2: Material Consumption Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Raw Material Consumption Norms ({formData.items.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-8 gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Material Line
              </Button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const selectedMat = materials.find((m) => m._id === item.materialId);
                return (
                  <div
                    key={index}
                    className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {selectedMat ? `${selectedMat.name} (${selectedMat.code})` : `Material #${index + 1}`}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        onClick={() => handleRemoveItem(index)}
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                          Raw Material <span className="text-rose-500">*</span>
                        </Label>
                        <SearchableSelect
                          options={materialOptions}
                          value={item.materialId}
                          onChange={(val) => handleItemChange(index, 'materialId', val)}
                          placeholder="Search and choose raw material..."
                          searchPlaceholder="Search material by name, code, category..."
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider truncate block">
                            Norm Qty {selectedMat ? `(${selectedMat.baseUnit})` : ''} *
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0.0001"
                            placeholder="e.g. 145.5"
                            value={item.quantityPerUnit}
                            onChange={(e) => handleItemChange(index, 'quantityPerUnit', e.target.value)}
                            className="h-9 text-xs bg-white font-medium"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider truncate block">
                            Scrap %
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={item.scrapTolerancePercentage}
                            onChange={(e) => handleItemChange(index, 'scrapTolerancePercentage', e.target.value)}
                            className="h-9 text-xs bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider truncate block">
                            Stage Seq
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.stageSequence}
                            onChange={(e) => handleItemChange(index, 'stageSequence', e.target.value)}
                            className="h-9 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Input
                          placeholder="Process stage notes (e.g. Conductor Stranding, Inner Sheathing)"
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          className="h-8 text-xs bg-white placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-10 text-slate-700 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="createBomForm"
            disabled={isSubmitting}
            className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving BOM...
              </>
            ) : (
              'Save Draft BOM'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
