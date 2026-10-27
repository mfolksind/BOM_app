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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Cog, Pencil, Eye, Activity, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export function EditMachineDialog({
  machine,
  open,
  onOpenChange,
  initialMode = 'view',
  stages = [],
  onSuccess,
}) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    machineType: '',
    status: 'AVAILABLE',
    processStageIds: [],
    capacityPerShift: '',
    speedMetersPerMinute: '',
    location: '',
    isActive: true,
  });

  useEffect(() => {
    setIsEditing(initialMode === 'edit');
  }, [initialMode, open]);

  useEffect(() => {
    if (machine) {
      setFormData({
        name: machine.name || '',
        machineType: machine.machineType || '',
        status: machine.status || 'AVAILABLE',
        processStageIds: (machine.processStageIds || []).map((s) => (typeof s === 'object' ? s._id : s)),
        capacityPerShift: machine.capacityPerShift !== undefined ? String(machine.capacityPerShift) : '',
        speedMetersPerMinute: machine.speedMetersPerMinute !== undefined ? String(machine.speedMetersPerMinute) : '',
        location: machine.location || '',
        isActive: machine.isActive !== undefined ? machine.isActive : true,
      });
    }
  }, [machine, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Machine name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        machineType: formData.machineType.trim() || undefined,
        status: formData.status,
        processStageIds: formData.processStageIds,
        capacityPerShift: formData.capacityPerShift ? parseFloat(formData.capacityPerShift) : undefined,
        speedMetersPerMinute: formData.speedMetersPerMinute ? parseFloat(formData.speedMetersPerMinute) : undefined,
        location: formData.location.trim() || undefined,
        isActive: formData.isActive,
      };

      const res = await api.patch(`/machines/${machine._id}`, payload);
      if (res?.success || res?.data) {
        toast.success(`Machine ${machine.code} updated successfully`);
        if (onSuccess) onSuccess(res?.data);
        setIsEditing(false);
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update machine');
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (stageId) => {
    if (!isEditing) return;
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Available / Ready</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 animate-pulse">Running Job</Badge>;
      case 'MAINTENANCE':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Maintenance</Badge>;
      case 'BREAKDOWN':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Breakdown</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl lg:w-[48vw] lg:max-w-[840px] bg-white p-0 flex flex-col h-full shadow-2xl border-l border-slate-200"
      >
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
          <SheetHeader className="p-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
                  <Cog className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-xl font-bold text-slate-900">
                      {machine?.name || 'Machine Details'}
                    </SheetTitle>
                    {getStatusBadge(formData.status)}
                  </div>
                  <SheetDescription className="text-xs text-slate-500 mt-0.5">
                    Equipment Code: <span className="font-mono font-semibold text-slate-800">{machine?.code}</span>
                  </SheetDescription>
                </div>
              </div>

              {!isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-8 gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Settings
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Machine Identification */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Machine Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Machine Code (System Key)
                  </Label>
                  <Input
                    value={machine?.code || ''}
                    disabled
                    className="h-9 font-mono uppercase text-sm bg-slate-50 text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Machine Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Machine Type / Category
                  </Label>
                  <Input
                    value={formData.machineType}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({ ...formData, machineType: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Operational Status
                  </Label>
                  {isEditing ? (
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
                  ) : (
                    <div className="h-9 px-3 rounded-md border border-slate-200 bg-slate-50 flex items-center">
                      {getStatusBadge(formData.status)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Operating Specs & Location */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Operating Parameters & Location
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Capacity Per Shift (m)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    value={formData.speedMetersPerMinute}
                    onChange={(e) => setFormData({ ...formData, speedMetersPerMinute: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Bay / Location
                  </Label>
                  <Input
                    disabled={!isEditing}
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
                    Process operations assigned to this manufacturing machine.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500 font-mono">
                  {formData.processStageIds.length} Linked
                </span>
              </div>

              {stages.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  No process stages available in master data.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stages.map((stg) => {
                    const isSelected = formData.processStageIds.includes(stg._id);
                    return (
                      <div
                        key={stg._id}
                        onClick={() => toggleStage(stg._id)}
                        className={`p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                          isEditing ? 'cursor-pointer' : 'cursor-default'
                        } ${
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
              Close
            </Button>
            {isEditing && (
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer shadow-xs"
              >
                {loading ? 'Saving Changes...' : 'Save Machine Settings'}
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
