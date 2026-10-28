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
import { Workflow, Plus } from 'lucide-react';
import { api } from '@/lib/api';

const STAGE_CATEGORIES = [
  { value: 'CONDUCTOR_PREPARATION', label: 'Conductor Preparation (Drawing/Stranding)' },
  { value: 'INSULATION', label: 'Insulation Extrusion (XLPE/PVC)' },
  { value: 'ASSEMBLY', label: 'Laying-Up & Core Assembly' },
  { value: 'SHEATHING', label: 'Sheathing (Bedding & Jacketing)' },
  { value: 'ARMOURING', label: 'Armouring (Strip/Wire Application)' },
  { value: 'TESTING_PACKING', label: 'Final Testing & Drum Reeling' },
  { value: 'OTHER', label: 'Other Manufacturing Stage' },
];

export function CreateProcessStageDialog({ open, onOpenChange, onSuccess, nextSequence = 1 }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    sequenceOrder: nextSequence,
    category: 'CONDUCTOR_PREPARATION',
    description: '',
  });

  React.useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        sequenceOrder: nextSequence,
      }));
    }
  }, [open, nextSequence]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error('Stage code is required');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Stage name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        sequenceOrder: Number(formData.sequenceOrder) || 1,
        category: formData.category,
        description: formData.description.trim() || undefined,
        isActive: true,
      };

      const res = await api.post('/process-stages', payload);
      if (res?.success || res?.data) {
        toast.success(`Process Stage ${payload.name} created successfully`);
        if (onSuccess) onSuccess(res.data);
        onOpenChange(false);
        setFormData({
          code: '',
          name: '',
          sequenceOrder: nextSequence + 1,
          category: 'CONDUCTOR_PREPARATION',
          description: '',
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create process stage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-white">Create Process Stage</DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Define a manufacturing step in the cable production routing sequence.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Stage Code *</Label>
              <Input
                placeholder="e.g. STAGE-DRAWING"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="font-mono text-sm uppercase"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Sequence Order *</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 1"
                value={formData.sequenceOrder}
                onChange={(e) => setFormData({ ...formData, sequenceOrder: e.target.value })}
                className="text-sm font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Stage Name *</Label>
            <Input
              placeholder="e.g. Wire Drawing, Extrusion, Armouring"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Process Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(val) => setFormData({ ...formData, category: val })}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="text-xs">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Description / Specifications</Label>
            <Textarea
              placeholder="Operational details, line controls, or tolerances..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-xs h-20 resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-medium"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Stage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
