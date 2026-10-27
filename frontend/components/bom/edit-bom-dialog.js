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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import {
  Layers,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Lock,
  Archive,
} from 'lucide-react';

export function EditBomDialog({
  bom,
  open,
  onOpenChange,
  onSuccess,
  initialMode = 'view',
}) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [materials, setMaterials] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bomDetails, setBomDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [formData, setFormData] = useState({
    batchSize: 1000,
    outputUnit: 'METER',
    notes: '',
    items: [],
  });

  useEffect(() => {
    if (open) {
      setIsEditing(initialMode === 'edit');
      apiClient('/materials?limit=100').then((res) => {
        if (res.data) setMaterials(Array.isArray(res.data) ? res.data : res.data.items || []);
      });
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (bom && open) {
      setLoadingDetails(true);
      apiClient(`/boms/${bom._id}`)
        .then((res) => {
          if (res.data) {
            const { version, items = [] } = res.data;
            setBomDetails(res.data);
            setFormData({
              batchSize: version.batchSize || 1000,
              outputUnit: version.outputUnit || 'METER',
              notes: version.notes || '',
              items: items.map((itm) => ({
                materialId: itm.materialId?._id || itm.materialId,
                quantityPerUnit: itm.quantityPerUnit,
                scrapTolerancePercentage: itm.scrapTolerancePercentage || 0,
                stageSequence: itm.stageSequence || 1,
                notes: itm.notes || '',
              })),
            });
          }
        })
        .catch((err) => {
          toast.error('Failed to load BOM recipe items', { description: err.message });
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [bom, open]);

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
      toast.error('At least one raw material line is required');
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

    if (!formData.items || formData.items.length === 0) {
      toast.error('At least one raw material line is required');
      return;
    }

    const seenMaterials = new Set();
    for (let i = 0; i < formData.items.length; i++) {
      const line = formData.items[i];
      if (!line.materialId) {
        toast.error(`Please select raw material on Line #${i + 1}`);
        return;
      }
      if (seenMaterials.has(line.materialId)) {
        toast.error('Duplicate material detected. Each material can appear only once.');
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
        batchSize: parseFloat(formData.batchSize) || 1000,
        outputUnit: formData.outputUnit || 'METER',
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

      const res = await apiClient(`/boms/${bom._id}`, {
        method: 'PATCH',
        body: payload,
      });

      toast.success('BOM Recipe Updated Successfully');
      setIsEditing(false);
      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error('Failed to update BOM', {
        description: err.message || 'Validation error from server.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const version = bomDetails?.version || bom;
  const rawItems = bomDetails?.items || [];
  const isDraft = version?.status === 'DRAFT';

  const materialOptions = materials.map((m) => ({
    value: m._id,
    label: m.name,
    code: m.code,
    subLabel: `${m.category || 'RAW_MATERIAL'} • ${m.baseUnit || 'KG'}`,
  }));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active Approved</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Draft (In Review)</Badge>;
      case 'ARCHIVED':
        return <Badge variant="secondary" className="text-slate-500 bg-slate-100">Archived</Badge>;
      case 'SUPERSEDED':
        return <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">Superseded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-xl font-bold text-slate-900">
                      {isEditing ? `Edit ${version?.bomNumber || 'BOM'}` : (version?.bomNumber || 'BOM Details')}
                    </SheetTitle>
                    {getStatusBadge(version?.status)}
                  </div>
                  <SheetDescription className="text-xs text-slate-500 mt-0.5">
                    Target Cable: <span className="font-semibold text-slate-800">{version?.productId?.name}</span> ({version?.productId?.code}) • Version v{version?.versionNumber}.0
                  </SheetDescription>
                </div>
              </div>

              {/* View / Edit Mode Toggle Button */}
              {!isEditing && isDraft && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-8 gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Recipe
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        {loadingDetails ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
            Loading BOM recipe details...
          </div>
        ) : isEditing ? (
          <form id="editBomForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Batch Standard & Specs
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Standard Batch Size <span className="text-rose-500">*</span>
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
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    BOM Number
                  </Label>
                  <Input
                    value={version?.bomNumber}
                    disabled
                    className="h-10 text-sm bg-slate-100 font-mono text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Engineering Notes
                </Label>
                <Textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Specify extruder heat profile zones, conductor compacting ratio..."
                  className="text-sm bg-white resize-none"
                />
              </div>
            </div>

            {/* Consumption breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Consumption Recipe ({formData.items.length})
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
                            placeholder="Select raw material..."
                            searchPlaceholder="Search material by name or code..."
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
                            placeholder="Process stage notes"
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
        ) : (
          /* View Mode */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {!isDraft && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-600">
                <Lock className="w-4 h-4 text-slate-500" />
                This BOM recipe is {version?.status}. Active/Archived versions cannot be modified to guarantee manufacturing traceability.
              </div>
            )}

            {/* Overview Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/70 border border-slate-200 rounded-xl text-sm">
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Version</p>
                <p className="font-bold text-slate-900 mt-0.5">v{version?.versionNumber}.0</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Standard Batch</p>
                <p className="font-bold text-slate-900 mt-0.5">{version?.batchSize} {version?.outputUnit}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Effective Date</p>
                <p className="font-medium text-slate-800 mt-0.5">
                  {version?.effectiveFrom ? new Date(version.effectiveFrom).toLocaleDateString() : 'Immediate'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Sign-Off</p>
                <p className="font-medium text-slate-800 mt-0.5">
                  {version?.approvedBy ? `${version.approvedBy.firstName || ''} ${version.approvedBy.lastName || ''}` : 'Pending'}
                </p>
              </div>
            </div>

            {version?.notes && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                <span className="font-bold text-slate-900">Engineering Remarks: </span>
                {version.notes}
              </div>
            )}

            {/* Consumption Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900 text-sm">
                  Raw Material Consumption Recipe ({rawItems.length} materials)
                </h4>
                <span className="text-xs text-slate-500">Per {version?.batchSize} {version?.outputUnit}</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-10 text-center text-xs font-semibold">#</TableHead>
                      <TableHead className="text-xs font-semibold">Material</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Rate</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Scrap %</TableHead>
                      <TableHead className="text-xs font-semibold">Process Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawItems.map((item, idx) => (
                      <TableRow key={item._id || idx} className="hover:bg-slate-50/60">
                        <TableCell className="text-center font-bold text-slate-400 text-xs">
                          {item.stageSequence || idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-xs">
                            {item.materialId?.name || 'Raw Material'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.materialId?.code} • {item.materialId?.category}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 text-xs">
                          {item.quantityPerUnit} <span className="font-normal text-[11px] text-slate-500">{item.materialId?.baseUnit || 'KG'}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {item.scrapTolerancePercentage ? (
                            <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                              +{item.scrapTolerancePercentage}%
                            </span>
                          ) : (
                            <span className="text-slate-400">0%</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {item.notes || <span className="text-slate-400 italic">Standard</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                onOpenChange(false);
              }
            }}
            disabled={isSubmitting}
            className="h-10 text-slate-700 cursor-pointer"
          >
            {isEditing ? 'Cancel Edit' : 'Close Overview'}
          </Button>

          {isEditing && isDraft && (
            <Button
              type="submit"
              form="editBomForm"
              disabled={isSubmitting}
              className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Recipe Changes'
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
