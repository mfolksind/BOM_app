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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Cog,
  Workflow,
} from 'lucide-react';
import { api } from '@/lib/api';

export function BatchTestDialog({
  open,
  onOpenChange,
  batch,
  onSuccess,
  onMoveToNextMachine,
}) {
  const [loading, setLoading] = useState(false);
  const [testRows, setTestRows] = useState([]);
  const [testReportNumber, setTestReportNumber] = useState('');
  const [completedQuantity, setCompletedQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [failReason, setFailReason] = useState('');
  const [showFailInput, setShowFailInput] = useState(false);

  useEffect(() => {
    if (batch && open) {
      setTestReportNumber(batch.testReportNumber || `TR-${batch.batchNumber || Date.now()}`);
      setCompletedQuantity(batch.completedQuantity || batch.plannedQuantity || '');
      setRemarks('');
      setFailReason('');
      setShowFailInput(false);

      // Pre-load tests: first from existing batch tests, or machine's configured tests, or starter defaults
      if (Array.isArray(batch.tests) && batch.tests.length > 0) {
        setTestRows([...batch.tests]);
      } else if (batch.machineId?.customTests && batch.machineId.customTests.length > 0) {
        setTestRows(
          batch.machineId.customTests.map((t) => ({
            testName: t.testName,
            testType: t.testType || 'DIMENSIONAL',
            unit: t.unit || '',
            standardSpecification: t.standardSpecification || '',
            minValue: t.minValue,
            maxValue: t.maxValue,
            expectedValue: t.minValue && t.maxValue ? `${t.minValue} - ${t.maxValue} ${t.unit || ''}` : '',
            actualValue: '',
            result: 'PENDING',
            remarks: '',
          })),
        );
      } else {
        // Free hand default initial tests
        setTestRows([
          {
            testName: 'Conductor / Core Dimension Check',
            testType: 'DIMENSIONAL',
            unit: 'mm',
            expectedValue: 'Within IS tolerance',
            actualValue: '',
            result: 'PASSED',
            remarks: '',
          },
          {
            testName: 'Visual & Surface Finish Inspection',
            testType: 'VISUAL',
            unit: '',
            expectedValue: 'Smooth, no cracks or oxidation',
            actualValue: 'Smooth, clean',
            result: 'PASSED',
            remarks: '',
          },
        ]);
      }
    }
  }, [batch, open]);

  const handleAddCustomTest = () => {
    setTestRows((prev) => [
      ...prev,
      {
        testName: '',
        testType: 'OTHER',
        unit: '',
        expectedValue: '',
        actualValue: '',
        result: 'PASSED',
        remarks: '',
      },
    ]);
  };

  const handleUpdateTestRow = (index, field, value) => {
    setTestRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveTestRow = (index) => {
    setTestRows((prev) => prev.filter((_, i) => i !== index));
  };

  // PASS TEST: Completes current batch, releases machine, and moves to next machine
  const handlePassTest = async () => {
    if (testRows.length === 0) {
      toast.error('At least one quality test result is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        testReportNumber: testReportNumber.trim(),
        completedQuantity: parseFloat(completedQuantity) || batch.plannedQuantity,
        tests: testRows.map((t) => ({
          ...t,
          result: 'PASSED',
        })),
        remarks: remarks.trim() || undefined,
      };

      const res = await api.post(`/production-batches/${batch._id}/pass-test`, payload);
      if (res?.success || res?.data) {
        toast.success(res?.message || 'Quality test PASSED! Machine released.');
        onOpenChange(false);
        if (onSuccess) onSuccess();

        // If next stage exists, open dialog for next machine
        if (res?.data?.nextStage && onMoveToNextMachine) {
          onMoveToNextMachine(batch, res.data.nextStage);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit passed test');
    } finally {
      setLoading(false);
    }
  };

  // FAIL TEST: Restarts work on the SAME machine for rework
  const handleFailTest = async () => {
    if (!failReason.trim()) {
      setShowFailInput(true);
      toast.error('Please enter the failure reason / adjustments required on the machine');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        reason: failReason.trim(),
        testReportNumber: testReportNumber.trim(),
        tests: testRows.map((t) => ({
          ...t,
          result: t.result || 'FAILED',
        })),
        remarks: remarks.trim() || undefined,
      };

      const res = await api.post(`/production-batches/${batch._id}/fail-test`, payload);
      if (res?.success || res?.data) {
        toast.error(
          `Test marked FAILED. Work restarted on SAME machine (${batch.machineCode}). Adjust line and test again.`,
        );
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record test failure');
    } finally {
      setLoading(false);
    }
  };

  if (!batch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-white p-0 overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Machine QA Test & Stage Routing
                {batch.reworkCount > 0 && (
                  <Badge className="bg-rose-500 text-white border-0 text-[10px]">
                    Rework Run #{batch.reworkCount}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Batch #{batch.batchNumber} • Machine: <span className="font-bold text-amber-300">{batch.machineCode}</span> • Stage: {batch.processStageId?.name || 'In-Process'}
              </DialogDescription>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Planned Length</span>
            <p className="font-bold text-white font-mono">{batch.plannedQuantity} MTR</p>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600 uppercase">Test Report #</Label>
              <Input
                value={testReportNumber}
                onChange={(e) => setTestReportNumber(e.target.value)}
                className="h-8 text-xs font-mono bg-white"
                placeholder="TR-..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600 uppercase">Tested Length (MTR)</Label>
              <Input
                type="number"
                value={completedQuantity}
                onChange={(e) => setCompletedQuantity(e.target.value)}
                className="h-8 text-xs font-semibold bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600 uppercase">Inspector Remarks</Label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Calibration, speed, or note"
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          {/* Custom Tests Section (Free Hand) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Cog className="w-4 h-4 text-amber-600" />
                  Quality Test Checklist (Free Hand)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect measurements on machine {batch.machineCode}. Add any custom parameters freely.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomTest}
                className="h-7 text-xs border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 gap-1 font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                Add Custom Test
              </Button>
            </div>

            <div className="space-y-2">
              {testRows.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 text-xs"
                >
                  <div className="w-5 font-bold text-slate-400 shrink-0">#{idx + 1}</div>
                  <div className="flex-1 w-full sm:w-auto">
                    <Input
                      placeholder="Test Name (e.g. Diameter, Resistance)"
                      value={row.testName}
                      onChange={(e) => handleUpdateTestRow(idx, 'testName', e.target.value)}
                      className="h-8 text-xs bg-white font-medium"
                    />
                  </div>
                  <div className="w-32 shrink-0">
                    <Input
                      placeholder="Unit (mm, %)"
                      value={row.unit || ''}
                      onChange={(e) => handleUpdateTestRow(idx, 'unit', e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div className="w-40 shrink-0">
                    <Input
                      placeholder="Expected / Target"
                      value={row.expectedValue || ''}
                      onChange={(e) => handleUpdateTestRow(idx, 'expectedValue', e.target.value)}
                      className="h-8 text-xs bg-white text-slate-500"
                    />
                  </div>
                  <div className="w-44 shrink-0">
                    <Input
                      placeholder="Actual Reading *"
                      value={row.actualValue || ''}
                      onChange={(e) => handleUpdateTestRow(idx, 'actualValue', e.target.value)}
                      className="h-8 text-xs bg-white font-semibold text-slate-900 border-amber-200"
                    />
                  </div>
                  <div className="w-28 shrink-0">
                    <Select
                      value={row.result}
                      onValueChange={(val) => handleUpdateTestRow(idx, 'result', val)}
                    >
                      <SelectTrigger className={`h-8 text-xs font-semibold ${row.result === 'PASSED' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : row.result === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-white'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASSED" className="text-emerald-700 font-medium">✓ Pass</SelectItem>
                        <SelectItem value="FAILED" className="text-rose-700 font-medium">✗ Fail</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTestRow(idx)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Failure Reason Input (Appears when Fail is clicked or selected) */}
          {showFailInput && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 space-y-2 animate-in fade-in">
              <Label className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Why did the test fail? (Machine Rework Reason) *
              </Label>
              <Textarea
                placeholder="e.g. Copper wire snapped during drawing; Annealer voltage too low; Diameter out of tolerance by 0.15mm..."
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                className="text-xs bg-white h-20 resize-none border-rose-300 focus:border-rose-500"
                required
              />
              <p className="text-[11px] text-rose-700">
                Notice: Marking test as FAILED will automatically restart production on the <strong>SAME MACHINE ({batch.machineCode})</strong> for rework. It will NOT route to the next machine until it passes.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Fail Action: Restart on Same Machine */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => {
                if (!showFailInput) {
                  setShowFailInput(true);
                } else {
                  handleFailTest();
                }
              }}
              className="bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 font-semibold gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              {showFailInput ? 'Confirm Fail & Rework Same Machine' : 'Fail Test (Rework on Same Machine)'}
            </Button>

            {/* Pass Action: Move to Next Machine */}
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={handlePassTest}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Pass Test & Move Next Machine
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
