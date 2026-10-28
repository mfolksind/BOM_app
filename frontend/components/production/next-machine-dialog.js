'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowRight, Cog, CheckCircle2, Workflow, Cpu } from 'lucide-react';
import { api } from '@/lib/api';

export function NextMachineDialog({
  open,
  onOpenChange,
  nextStageInfo,
  previousBatch,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [shift, setShift] = useState('SHIFT_A');
  const [plannedQuantity, setPlannedQuantity] = useState(
    previousBatch?.completedQuantity || previousBatch?.plannedQuantity || 1000,
  );
  const [remarks, setRemarks] = useState('');

  const availableMachines = Array.isArray(nextStageInfo?.availableMachines)
    ? nextStageInfo.availableMachines
    : [];

  React.useEffect(() => {
    if (availableMachines.length > 0) {
      // Preselect first available machine
      const avail = availableMachines.find((m) => m.status === 'AVAILABLE');
      setSelectedMachineId(avail ? avail._id : availableMachines[0]._id);
    }
    if (previousBatch) {
      setPlannedQuantity(previousBatch.completedQuantity || previousBatch.plannedQuantity || 1000);
      setRemarks(`Routed from Machine ${previousBatch.machineCode || ''} (Stage: ${previousBatch.processStageId?.name || ''})`);
    }
  }, [nextStageInfo, previousBatch, open]);

  const handleStartNextBatch = async () => {
    if (!selectedMachineId) {
      toast.error('Please select a machine for the next stage');
      return;
    }

    setLoading(true);
    try {
      const selectedMachine = availableMachines.find((m) => m._id === selectedMachineId);
      const payload = {
        processStageId: nextStageInfo?.nextStageId,
        machineId: selectedMachineId,
        machineCode: selectedMachine?.code || undefined,
        plannedQuantity: parseFloat(plannedQuantity) || 1000,
        unit: 'METER',
        shift,
        remarks: remarks.trim() || undefined,
      };

      const orderId = previousBatch?.productionOrderId?._id || previousBatch?.productionOrderId;
      if (!orderId) {
        toast.error('Production order reference is missing');
        return;
      }

      const res = await api.post(`/production-orders/${orderId}/batches`, payload);
      if (res?.success || res?.data) {
        toast.success(`Started production on Next Machine (${selectedMachine?.code || ''}) for ${nextStageInfo?.nextStageName || 'next stage'}!`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start batch on next machine');
    } finally {
      setLoading(false);
    }
  };

  if (!nextStageInfo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/20 text-white">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              Advance to Next Machine
            </DialogTitle>
            <DialogDescription className="text-xs text-emerald-100">
              Previous test passed. Route work to the next stage in production sequence.
            </DialogDescription>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Next Stage (Step {nextStageInfo?.sequenceOrder || 1})
              </span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{nextStageInfo?.nextStageName || 'Next Stage'}</p>
              <p className="font-mono text-xs text-slate-400">{nextStageInfo?.nextStageCode || ''}</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Workflow className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Select Machine for this Stage *</Label>
            {availableMachines.length === 0 ? (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                No machines currently mapped to {nextStageInfo?.nextStageName || 'this stage'}. Please map machines in Machines & Equipment.
              </p>
            ) : (
              <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                <SelectTrigger className="w-full text-sm bg-white">
                  <SelectValue placeholder="Choose Machine" />
                </SelectTrigger>
                <SelectContent>
                  {availableMachines.map((m) => (
                    <SelectItem key={m._id} value={m._id} className="text-xs">
                      <span className="font-mono font-bold mr-2">{m.code}</span> — {m.name} ({m.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Planned Length (MTR)</Label>
              <Input
                type="number"
                value={plannedQuantity}
                onChange={(e) => setPlannedQuantity(e.target.value)}
                className="text-sm font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Operating Shift</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger className="text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHIFT_A">Shift A (Morning)</SelectItem>
                  <SelectItem value="SHIFT_B">Shift B (Evening)</SelectItem>
                  <SelectItem value="SHIFT_C">Shift C (Night)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Operator Remarks</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Later
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading || !selectedMachineId}
            onClick={handleStartNextBatch}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            <Cpu className="w-4 h-4" />
            {loading ? 'Starting Line...' : 'Start Production on Next Machine'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
