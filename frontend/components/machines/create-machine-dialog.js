import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { Cog, Plus, Layers, Activity } from 'lucide-react';
import { api } from '@/lib/api';

export function CreateMachineDialog({ open, onOpenChange, stages = [], onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    machineType: '',
    status: 'AVAILABLE',
    processStageIds: [],
    capacityPerShift: '',
    speedMetersPerMinute: '',
    location: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error('Machine code is required');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Machine name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        machineType: formData.machineType.trim() || undefined,
        status: formData.status,
        processStageIds: formData.processStageIds,
        capacityPerShift: formData.capacityPerShift ? parseFloat(formData.capacityPerShift) : undefined,
        speedMetersPerMinute: formData.speedMetersPerMinute ? parseFloat(formData.speedMetersPerMinute) : undefined,
        location: formData.location.trim() || undefined,
        isActive: true,
      };

      const res = await api.post('/machines', payload);
      if (res?.success || res?.data) {
        toast.success(`Machine ${payload.code} registered successfully`);
        if (onSuccess) onSuccess(res?.data);
        onOpenChange(false);
        setFormData({
          code: '',
          name: '',
          machineType: '',
          status: 'AVAILABLE',
          processStageIds: [],
          capacityPerShift: '',
          speedMetersPerMinute: '',
          location: '',
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to register machine');
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (stageId) => {
    setFormData((prev) => {
      const exists = prev.processStageIds.includes(stageId);
      return {
        ...prev,
        processStageIds: exists
          ? prev.processStageIds.filter((id) => id !== stageId)
          : [...prev.processStageIds, stageId],
      };
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl lg:w-[48vw] lg:max-w-[840px] bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                <Cog className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  Register Shopfloor Machine
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  Configure manufacturing line machines, rated capacity, and assigned process stages.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Basic Identification */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Machine Identification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Machine Code <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. MACH-EXT-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="h-9 font-mono uppercase text-sm"
                    required
                  />
                  <p className="text-[11px] text-slate-400">Unique alphanumeric equipment code</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Machine Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. 70mm Extruder Line 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-sm"
                    required
                  />
                  <p className="text-[11px] text-slate-400">Descriptive shopfloor name</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Machine Type / Category
                  </Label>
                  <Input
                    placeholder="e.g. Extruder, Strander, Armouring"
                    value={formData.machineType}
                    onChange={(e) => setFormData({ ...formData, machineType: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Operational Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available (Idle / Ready)</SelectItem>
                      <SelectItem value="RUNNING">Running (Active Job)</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance / Scheduled Check</SelectItem>
                      <SelectItem value="BREAKDOWN">Breakdown (Out of Order)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Performance & Location */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Operating Parameters & Location
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Capacity Per Shift (Meters)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 15000"
                    value={formData.capacityPerShift}
                    onChange={(e) => setFormData({ ...formData, capacityPerShift: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Rated Speed (m/min)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 150"
                    value={formData.speedMetersPerMinute}
                    onChange={(e) => setFormData({ ...formData, speedMetersPerMinute: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Shopfloor Bay / Location
                  </Label>
                  <Input
                    placeholder="e.g. Bay 2, Line A"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Process Stages Assignment */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Capable Process Stages
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the cable production stages that can be routed to this machine.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500 font-mono">
                  {formData.processStageIds.length} Selected
                </span>
              </div>

              {stages.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  No process stages configured. Stages can be linked later.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stages.map((stg) => {
                    const isSelected = formData.processStageIds.includes(stg._id);
                    return (
                      <div
                        key={stg._id}
                        onClick={() => toggleStage(stg._id)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{stg.name}</p>
                          <p className={`font-mono text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                            {stg.code}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                            isSelected ? 'bg-white text-slate-900 border-white font-bold' : 'border-slate-300'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Drawer Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9 text-xs border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer shadow-xs"
            >
              {loading ? 'Registering...' : 'Register Machine'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
