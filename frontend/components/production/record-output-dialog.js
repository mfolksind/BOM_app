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
import { CheckCircle2, ShieldCheck, Cable, Warehouse, Package } from 'lucide-react';

export function RecordOutputDialog({
  open,
  onOpenChange,
  batchId,
  warehouses = [],
  drums = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    outputLengthMeters: '',
    outputWeightKg: '',
    targetWarehouseId: '',
    isFinalStage: false,
    drumId: '',
    qualityStatus: 'PASSED',
    testReportNumber: '',
    remarks: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.targetWarehouseId) {
      toast.error('Target destination warehouse is required');
      return;
    }

    const length = parseFloat(formData.outputLengthMeters);
    if (isNaN(length) || length <= 0) {
      toast.error('Output length must be greater than 0 meters');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        outputLengthMeters: length,
        outputWeightKg: formData.outputWeightKg ? parseFloat(formData.outputWeightKg) : 0,
        targetWarehouseId: formData.targetWarehouseId,
        isFinalStage: formData.isFinalStage,
        drumId: formData.drumId || undefined,
        qualityStatus: formData.qualityStatus,
        testReportNumber: formData.testReportNumber.trim() || undefined,
        remarks: formData.remarks.trim() || undefined,
      };

      await onSuccess(batchId, payload);
      onOpenChange(false);
      setFormData({
        outputLengthMeters: '',
        outputWeightKg: '',
        targetWarehouseId: '',
        isFinalStage: false,
        drumId: '',
        qualityStatus: 'PASSED',
        testReportNumber: '',
        remarks: '',
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
        className="w-full sm:max-w-xl md:max-w-2xl bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Log Batch Output & QA
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Record inspected output meters, electrical spark/resistance tests, and drum winding.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="recordOutputForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Output Measurements */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Cable className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Output Quantities & Storage
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Inspected Output Length (Meters) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0.1"
                  placeholder="e.g. 2480"
                  value={formData.outputLengthMeters}
                  onChange={(e) => setFormData({ ...formData, outputLengthMeters: e.target.value })}
                  className="h-10 text-sm font-bold text-slate-900 bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Net Cable Weight (Kg)
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 1840.5"
                  value={formData.outputWeightKg}
                  onChange={(e) => setFormData({ ...formData, outputWeightKg: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Target Warehouse (FG or Next WIP Stage) <span className="text-rose-500">*</span>
              </Label>
              <SearchableSelect
                options={warehouses.map((w) => ({
                  value: w._id,
                  label: w.name,
                  code: w.code,
                  subLabel: w.type || 'FINISHED_GOODS',
                }))}
                value={formData.targetWarehouseId}
                onChange={(val) => setFormData({ ...formData, targetWarehouseId: val })}
                placeholder="Select destination storage..."
                searchPlaceholder="Search warehouse..."
              />
            </div>
          </div>

          {/* Section 2: Quality Inspection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Quality Control & Testing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Quality Inspection Result
                </Label>
                <Select
                  value={formData.qualityStatus}
                  onValueChange={(val) => setFormData({ ...formData, qualityStatus: val })}
                >
                  <SelectTrigger className="w-full h-10 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASSED" className="text-sm">Passed (Routine HV Spark Test Clear)</SelectItem>
                    <SelectItem value="CONDITIONAL" className="text-sm">Conditional Hold</SelectItem>
                    <SelectItem value="REJECTED" className="text-sm">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  QA Test Certificate / Routine Lab #
                </Label>
                <Input
                  placeholder="e.g. QC-TR-8841"
                  value={formData.testReportNumber}
                  onChange={(e) => setFormData({ ...formData, testReportNumber: e.target.value })}
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Drum Allocation & Completion */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Package className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Packaging & Finished Goods Stage
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Wind on Cable Drum (Optional)
              </Label>
              <SearchableSelect
                options={[
                  { value: 'NONE', label: 'No Drum (Continuous Coiled / Intermediate)' },
                  ...drums.map((d) => ({
                    value: d._id,
                    label: d.drumNumber,
                    subLabel: `${d.drumType || 'DRUM'} • ${d.status || 'AVAILABLE'}`,
                  })),
                ]}
                value={formData.drumId || 'NONE'}
                onChange={(val) => setFormData({ ...formData, drumId: val === 'NONE' ? '' : val })}
                placeholder="Assign drum..."
                searchPlaceholder="Search drum number..."
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFinalStage}
                  onChange={(e) => setFormData({ ...formData, isFinalStage: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-900">Final Finished Goods (FG) Stage</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Check if cable manufacturing is fully completed and ready for final testing/dispatch.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                QA & Output Notes
              </Label>
              <Input
                placeholder="e.g. Insulation resistance 500 MOhm/km, sequential meter printing legible"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="h-10 text-sm bg-white"
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
            form="recordOutputForm"
            disabled={loading}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
          >
            {loading ? 'Recording Output...' : 'Log & Post Output to Stock'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
