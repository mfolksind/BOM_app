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
import { Layers, Activity, User, Cog } from 'lucide-react';

export function CreateBatchDialog({
  open,
  onOpenChange,
  productionOrderId,
  stages = [],
  machines = [],
  operators = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    processStageId: '',
    machineId: '',
    plannedQuantity: '',
    shift: 'SHIFT_1',
    operatorId: '',
    remarks: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.processStageId) {
      toast.error('Process stage is required (e.g. Stranding, Insulation, Armouring)');
      return;
    }

    const qty = parseFloat(formData.plannedQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Planned quantity must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const selectedMachine = machines.find((m) => m._id === formData.machineId);
      const payload = {
        processStageId: formData.processStageId,
        machineId: formData.machineId || undefined,
        machineCode: selectedMachine?.code || undefined,
        plannedQuantity: qty,
        unit: 'METER',
        shift: formData.shift,
        operatorId: formData.operatorId || undefined,
        remarks: formData.remarks.trim() || undefined,
      };

      await onSuccess(productionOrderId, payload);
      onOpenChange(false);
      setFormData({
        processStageId: '',
        machineId: '',
        plannedQuantity: '',
        shift: 'SHIFT_1',
        operatorId: '',
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
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Create Process Stage Batch
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Assign WIP cable run to a specific machine line and operating shift.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="createBatchForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Section 1: Process Stage */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Stage Classification
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Process Stage <span className="text-rose-500">*</span>
              </Label>
              <SearchableSelect
                options={stages.map((s) => ({
                  value: s._id,
                  label: s.name,
                  code: s.code,
                }))}
                value={formData.processStageId}
                onChange={(val) => setFormData({ ...formData, processStageId: val })}
                placeholder="Select process stage..."
                searchPlaceholder="Search stage by name or code..."
              />
            </div>
          </div>

          {/* Section 2: Machine & Shift Assignment */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Cog className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Machine Line & Shift Schedule
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Machine Line / Extruder
                </Label>
                <SearchableSelect
                  options={machines.map((m) => ({
                    value: m._id,
                    label: m.name,
                    code: m.code,
                  }))}
                  value={formData.machineId}
                  onChange={(val) => setFormData({ ...formData, machineId: val })}
                  placeholder="Assign machine..."
                  searchPlaceholder="Search machine..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Operating Shift
                </Label>
                <Select
                  value={formData.shift}
                  onValueChange={(val) => setFormData({ ...formData, shift: val })}
                >
                  <SelectTrigger className="w-full h-10 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHIFT_1" className="text-sm">Shift 1 (Morning: 07:00 - 15:30)</SelectItem>
                    <SelectItem value="SHIFT_2" className="text-sm">Shift 2 (Evening: 15:30 - 00:00)</SelectItem>
                    <SelectItem value="SHIFT_3" className="text-sm">Shift 3 (Night: 00:00 - 07:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Planned Batch Run (Meters) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 2500"
                  value={formData.plannedQuantity}
                  onChange={(e) => setFormData({ ...formData, plannedQuantity: e.target.value })}
                  className="h-10 text-sm font-semibold text-slate-900 bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Shift Operator / Line Incharge
                </Label>
                <SearchableSelect
                  options={operators.map((op) => ({
                    value: op._id,
                    label: `${op.firstName || ''} ${op.lastName || ''}`.trim() || op.email,
                    code: op.employeeCode || '',
                    subLabel: op.email || '',
                  }))}
                  value={formData.operatorId}
                  onChange={(val) => setFormData({ ...formData, operatorId: val })}
                  placeholder="Select operator..."
                  searchPlaceholder="Search operator by name or code..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Shift Notes / Run Parameters
              </Label>
              <Input
                placeholder="e.g. Check extruder heating zones 1 through 4 before line feed"
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
            form="createBatchForm"
            disabled={loading}
            className="text-sm h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
          >
            {loading ? 'Creating Batch...' : 'Create Stage Batch'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
