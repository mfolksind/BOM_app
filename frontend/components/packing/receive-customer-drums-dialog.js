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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Plus, Trash2, Truck, ClipboardList, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export function ReceiveCustomerDrumsDialog({
  open,
  onOpenChange,
  customers = [],
  warehouses = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerChallanNumber, setCustomerChallanNumber] = useState('');
  const [customerChallanDate, setCustomerChallanDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [warehouseId, setWarehouseId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporter, setTransporter] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const [drumRows, setDrumRows] = useState([
    { drumNumber: 'MF/01', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGTH' },
    { drumNumber: 'MF/02', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGTH' },
    { drumNumber: 'MF/03', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGTH' },
    { drumNumber: 'MF/06', drumSize: '44X16X24', drumType: 'WOODEN', tareWeightKg: 150, remarks: 'STD.LENGTH' },
  ]);

  const [localCustomers, setLocalCustomers] = useState(customers);
  const [localWarehouses, setLocalWarehouses] = useState(warehouses);

  useEffect(() => {
    if (customers?.length > 0) setLocalCustomers(customers);
  }, [customers]);

  useEffect(() => {
    if (warehouses?.length > 0) setLocalWarehouses(warehouses);
  }, [warehouses]);

  const fetchMasters = async () => {
    try {
      const [cRes, whRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/warehouses?limit=100'),
      ]);
      const custList = Array.isArray(cRes?.data) ? cRes.data : (cRes?.data?.items || cRes?.data?.customers || []);
      const whList = Array.isArray(whRes?.data) ? whRes.data : (whRes?.data?.items || whRes?.data?.warehouses || []);

      if (custList.length > 0) {
        setLocalCustomers(custList);
        setCustomerId((prev) => prev || custList[0]._id);
      }
      if (whList.length > 0) {
        setLocalWarehouses(whList);
        setWarehouseId((prev) => {
          if (prev) return prev;
          const preferred = whList.find((w) => w.type === 'FINISHED_GOODS' || w.type === 'RAW_MATERIALS') || whList[0];
          return preferred._id;
        });
      }
    } catch (err) {
      console.error('Failed to load masters in ReceiveCustomerDrumsDialog', err);
    }
  };

  useEffect(() => {
    if (open) {
      if (localCustomers.length === 0 || localWarehouses.length === 0) {
        fetchMasters();
      } else {
        if (!customerId && localCustomers.length > 0) {
          setCustomerId(localCustomers[0]._id);
        }
        if (!warehouseId && localWarehouses.length > 0) {
          const fg = localWarehouses.find((w) => w.type === 'FINISHED_GOODS' || w.type === 'RAW_MATERIALS') || localWarehouses[0];
          setWarehouseId(fg._id);
        }
      }
      if (!customerChallanNumber) {
        setCustomerChallanNumber('262740872');
      }
    }
  }, [open, localCustomers, localWarehouses]);

  const handleAddRow = () => {
    const nextNum = drumRows.length + 1;
    setDrumRows((prev) => [
      ...prev,
      {
        drumNumber: `MF/${String(nextNum).padStart(2, '0')}`,
        drumSize: '44X16X24',
        drumType: 'WOODEN',
        tareWeightKg: 150,
        remarks: 'STD.LENGTH',
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    setDrumRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    setDrumRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('Please select the sending Customer');
      return;
    }
    if (!customerChallanNumber.trim()) {
      toast.error('Customer Challan / Ref RGP Number is required');
      return;
    }
    if (!warehouseId) {
      toast.error('Please select receiving warehouse');
      return;
    }
    if (drumRows.length === 0) {
      toast.error('At least one drum is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerId,
        customerChallanNumber: customerChallanNumber.trim(),
        customerChallanDate,
        warehouseId,
        vehicleNumber: vehicleNumber.trim() || undefined,
        transporter: transporter.trim() || undefined,
        lrNumber: lrNumber.trim() || undefined,
        remarks: remarks.trim() || `Customer empty returnable drums against RGP ${customerChallanNumber.trim()}`,
        drums: drumRows.map((d) => ({
          drumNumber: d.drumNumber.trim(),
          drumSize: d.drumSize.trim() || '44X16X24',
          drumType: d.drumType || 'WOODEN',
          tareWeightKg: parseFloat(d.tareWeightKg) || 150,
          remarks: d.remarks || 'STD.LENGTH',
        })),
      };

      const res = await api.post('/drums/receive-inbound', payload);
      if (res?.success || res?.data) {
        toast.success(`Successfully received ${drumRows.length} drums under Challan/RGP #${customerChallanNumber}!`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to receive customer drums');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-white p-0 border border-slate-200 shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-orange-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl text-white">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Receive Customer Drums (Inbound Challan / RGP)
                </DialogTitle>
                <DialogDescription className="text-xs text-orange-100">
                  Record returnable empty cable drums sent by customer with delivery challan / gate pass.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Challan & Customer Meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Sending Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="bg-white text-xs h-9">
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(localCustomers) ? localCustomers : []).map((c) => (
                      <SelectItem key={c._id} value={c._id} className="text-xs">
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Customer Challan / RGP No. *
                </Label>
                <Input
                  value={customerChallanNumber}
                  onChange={(e) => setCustomerChallanNumber(e.target.value)}
                  placeholder="e.g. 262740872"
                  className="bg-white text-xs h-9 font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Challan / RGP Date *</Label>
                <Input
                  type="date"
                  value={customerChallanDate}
                  onChange={(e) => setCustomerChallanDate(e.target.value)}
                  className="bg-white text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Receiving Warehouse *</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="bg-white text-xs h-9">
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(localWarehouses) ? localWarehouses : []).map((w) => (
                      <SelectItem key={w._id} value={w._id} className="text-xs">
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Vehicle Number</Label>
                <Input
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. RJ-02-GB-5511"
                  className="bg-white text-xs h-9 font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Transporter / LR No.</Label>
                <Input
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  placeholder="e.g. LR-2627-991"
                  className="bg-white text-xs h-9"
                />
              </div>
            </div>

            {/* Drums Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Drums Received ({drumRows.length} Drums)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Drum Row
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase">
                    <tr>
                      <th className="p-2.5 w-12 text-center">#</th>
                      <th className="p-2.5">Drum Number</th>
                      <th className="p-2.5">Drum Size</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Tare Wt (Kg)</th>
                      <th className="p-2.5">Remarks</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drumRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2">
                          <Input
                            value={row.drumNumber}
                            onChange={(e) => handleRowChange(idx, 'drumNumber', e.target.value)}
                            placeholder="e.g. MF/01"
                            className="h-8 text-xs font-mono font-bold"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.drumSize}
                            onChange={(e) => handleRowChange(idx, 'drumSize', e.target.value)}
                            placeholder="e.g. 44X16X24"
                            className="h-8 text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <Select
                            value={row.drumType}
                            onValueChange={(val) => handleRowChange(idx, 'drumType', val)}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="WOODEN">Wooden</SelectItem>
                              <SelectItem value="STEEL">Steel</SelectItem>
                              <SelectItem value="PLASTIC">Plastic</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={row.tareWeightKg}
                            onChange={(e) => handleRowChange(idx, 'tareWeightKg', e.target.value)}
                            className="h-8 text-xs font-mono w-24"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.remarks}
                            onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                            placeholder="STD.LENGTH"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {drumRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
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
              disabled={loading}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Receiving Drums...' : `Receive ${drumRows.length} Drums in Yard`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
