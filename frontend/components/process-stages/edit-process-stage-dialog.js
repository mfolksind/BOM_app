'use client';

import React, { useState, useEffect } from 'react';
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
import { Pencil, Check } from 'lucide-react';
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

export function EditProcessStageDialog({ open, onOpenChange, stage, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sequenceOrder: 1,
    category: 'CONDUCTOR_PREPARATION',
    description: '',
  });

  useEffect(() => {
    if (stage) {
      setFormData({
        name: stage.name || '',
        sequenceOrder: stage.sequenceOrder || 1,
        category: stage.category || 'CONDUCTOR_PREPARATION',
        description: stage.description || '',
      });
    }
  }, [stage]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Stage name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sequenceOrder: Number(formData.sequenceOrder) || 1,
        category: formData.category,
        description: formData.description.trim() || undefined,
      };

      const res = await api.patch(`/process-stages/${stage._id}`, payload);
      if (res?.success || res?.data) {
        toast.success(`Process Stage updated successfully`);
        if (onSuccess) onSuccess(res.data);
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update process stage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Pencil className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-white">Edit Process Stage</DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Update sequence ordering and process specifications for {stage?.code}.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Stage Code</Label>
              <Input
                value={stage?.code || ''}
                disabled
                className="font-mono text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Sequence Order *</Label>
              <Input
                type="number"
                min="1"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-medium"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
