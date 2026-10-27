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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { Cpu, Calendar, Play, Layers } from 'lucide-react';

export function CreateProductionOrderDialog({
  open,
  onOpenChange,
  workOrders = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    workOrderId: '',
    plannedLengthMeters: '',
    startDate: new Date().toISOString().split('T')[0],
    targetCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    remarks: '',
  });

  const handleWorkOrderSelect = (woId) => {
    const wo = workOrders.find((w) => w._id === woId);
    setFormData((prev) => ({
      ...prev,
      workOrderId: woId,
      plannedLengthMeters: wo ? wo.orderedLengthMeters - (wo.producedLengthMeters || 0) : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.workOrderId) {
      toast.error('Work order is required');
      return;
    }

    const length = parseFloat(formData.plannedLengthMeters);
    if (isNaN(length) || length <= 0) {
      toast.error('Planned production length must be greater than 0 meters');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        plannedLengthMeters: length,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        targetCompletionDate: formData.targetCompletionDate ? new Date(formData.targetCompletionDate).toISOString() : undefined,
        remarks: formData.remarks.trim() || undefined,
      };

      await onSuccess(formData.workOrderId, payload);
      onOpenChange(false);
      setFormData({
        workOrderId: '',
        plannedLengthMeters: '',
        startDate: new Date().toISOString().split('T')[0],
        targetCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remarks: '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validWorkOrders = workOrders.filter((w) => ['CONFIRMED', 'IN_PROGRESS'].includes(w.status));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Launch Production Order
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Release work order to factory shopfloor for sequential machine execution.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createProdOrderForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Work Order Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Work Order Source
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Source Confirmed Work Order <span className="text-rose-500">*</span>
              </Label>
              <SearchableSelect
                options={validWorkOrders.map((w) => ({
                  value: w._id,
                  label: w.workOrderNumber,
                  code: w.productId?.code,
                  subLabel: `${w.customerId?.name || 'Customer'} • ${w.orderedLengthMeters?.toLocaleString()}m`,
                }))}
                value={formData.workOrderId}
                onChange={handleWorkOrderSelect}
                placeholder="Select confirmed work order..."
                searchPlaceholder="Search work order by number, client, cable..."
                emptyMessage="No confirmed work orders found. Confirm a work order first."
              />
              {validWorkOrders.length === 0 ? (
                <p className="text-xs text-amber-600 font-medium">
                  No confirmed work orders found. Confirm a draft work order first to release it to the shopfloor.
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Select an authorized work order to inherit BOM recipes and material allocations.
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Production Parameters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Layers className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Run Length & Scheduling
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Planned Run Length (Meters) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                min="1"
                placeholder="e.g. 5000"
                value={formData.plannedLengthMeters}
                onChange={(e) => setFormData({ ...formData, plannedLengthMeters: e.target.value })}
                className="h-10 text-sm font-semibold text-slate-900 bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Shopfloor Start Date
                </Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Target Completion Date
                </Label>
                <Input
                  type="date"
                  value={formData.targetCompletionDate}
                  onChange={(e) => setFormData({ ...formData, targetCompletionDate: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Shopfloor Shift Instructions / Line Assignment
              </Label>
              <Textarea
                placeholder="e.g. Begin with wire drawing line 1, pass to extrusion bay 2, standard QA testing..."
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="text-sm bg-white"
              />
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
            form="createProdOrderForm"
            disabled={loading || !formData.workOrderId}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            {loading ? 'Releasing Order...' : 'Release to Shopfloor'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
