'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Trash2, Plus, AlertCircle, Package, Truck, Layers, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export function CreateScrapChallanDialog({
  open,
  onOpenChange,
  customers = [],
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [activeInboundChallans, setActiveInboundChallans] = useState([]);
  const [loadingChallans, setLoadingChallans] = useState(false);

  // Selected Inbound Challan blocks: Array of { inboundChallanId, challanNumber, challanDate, vehicleNumber, totalRemainingQuantity, lots: [...] }
  const [selectedChallanBlocks, setSelectedChallanBlocks] = useState([]);
  const [activePickerChallanId, setActivePickerChallanId] = useState('');

  // Transport details
  const [challanNumber, setChallanNumber] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporter, setTransporter] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Chopanki');
  const [remarks, setRemarks] = useState('Job work scrap / manufacturing waste returned to principal');

  // When customer changes, load customer's un-depleted inbound challans
  useEffect(() => {
    if (!selectedCustomerId) {
      setActiveInboundChallans([]);
      setSelectedChallanBlocks([]);
      return;
    }

    const loadInboundChallans = async () => {
      setLoadingChallans(true);
      try {
        const res = await api.get(
          `/outbound-challans/scrap/active-inbound-challans?customerId=${selectedCustomerId}`,
        );
        const list = res?.data || [];
        setActiveInboundChallans(list);
      } catch (err) {
        console.error('Failed to load active inbound challans', err);
        toast.error('Failed to load active inbound challans for selected customer');
      } finally {
        setLoadingChallans(false);
      }
    };

    loadInboundChallans();
    setSelectedChallanBlocks([]);
  }, [selectedCustomerId]);

  // Options for customer select
  const customerOptions = useMemo(() => {
    return (customers || []).map((c) => ({
      value: String(c._id),
      label: c.name,
      code: c.code || 'CUST',
      subLabel: c.phone || c.email || '',
    }));
  }, [customers]);

  // Available un-depleted Inbound Challan options not yet added to blocks
  const availableChallanOptions = useMemo(() => {
    const addedIds = new Set(selectedChallanBlocks.map((b) => b.inboundChallanId || b.challanNumber));
    return (activeInboundChallans || [])
      .filter((ic) => !addedIds.has(ic.inboundChallanId || ic.challanNumber))
      .map((ic) => {
        const dStr = ic.challanDate ? new Date(ic.challanDate).toLocaleDateString('en-GB') : '';
        return {
          value: String(ic.inboundChallanId || ic.challanNumber),
          label: ic.customerChallanNumber || ic.challanNumber,
          code: `${(ic.totalRemainingQuantity || 0).toLocaleString()} Kgs Left`,
          subLabel: `${dStr ? `Dt. ${dStr} • ` : ''}${ic.lots?.length || 0} material lot(s)`,
        };
      });
  }, [activeInboundChallans, selectedChallanBlocks]);

  // Handle adding an Inbound Challan block to the scrap list
  const handleAddChallanBlock = (challanKey) => {
    if (!challanKey) return;
    const ic = activeInboundChallans.find(
      (c) => String(c.inboundChallanId || c.challanNumber) === String(challanKey),
    );
    if (!ic) return;

    const items = (ic.lots || []).map((lot) => ({
      inboundChallanId: ic.inboundChallanId,
      inboundChallanNumber: ic.customerChallanNumber || ic.challanNumber,
      inboundChallanDate: ic.challanDate,
      lotId: lot.lotId,
      lotNumber: lot.lotNumber,
      materialId: lot.materialId,
      materialCode: lot.materialCode || '',
      materialName: lot.materialName || 'Raw Material',
      warehouseName: lot.warehouseName || '',
      initialQuantity: lot.initialQuantity || lot.currentBalance || 0,
      quantityAvailable: lot.quantityAvailable || lot.currentBalance || 0,
      scrapQuantity: '',
      unit: lot.unit || 'KGS',
      remarks: 'Process Waste Return',
    }));

    setSelectedChallanBlocks((prev) => [
      ...prev,
      {
        inboundChallanId: ic.inboundChallanId,
        challanNumber: ic.customerChallanNumber || ic.challanNumber,
        challanDate: ic.challanDate,
        vehicleNumber: ic.vehicleNumber || '',
        totalRemainingQuantity: ic.totalRemainingQuantity || 0,
        items,
      },
    ]);
    setActivePickerChallanId('');
  };

  const handleRemoveChallanBlock = (index) => {
    setSelectedChallanBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScrapQtyChange = (blockIdx, itemIdx, val) => {
    setSelectedChallanBlocks((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[blockIdx].items[itemIdx].scrapQuantity = val;
      return copy;
    });
  };

  const handleScrapRemarksChange = (blockIdx, itemIdx, val) => {
    setSelectedChallanBlocks((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[blockIdx].items[itemIdx].remarks = val;
      return copy;
    });
  };

  const handleAddManualItem = (blockIdx) => {
    setSelectedChallanBlocks((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parent = copy[blockIdx];
      copy[blockIdx].items.push({
        inboundChallanId: parent?.inboundChallanId,
        inboundChallanNumber: parent?.challanNumber,
        inboundChallanDate: parent?.challanDate,
        lotId: null,
        lotNumber: 'MANUAL',
        materialId: null,
        materialCode: 'CUSTOM',
        materialName: 'Other Process Waste',
        warehouseName: '',
        initialQuantity: 0,
        quantityAvailable: 0,
        scrapQuantity: '',
        unit: 'KGS',
        remarks: 'Manual entry',
      });
      return copy;
    });
  };

  const handleRemoveItem = (blockIdx, itemIdx) => {
    setSelectedChallanBlocks((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[blockIdx].items = copy[blockIdx].items.filter((_, i) => i !== itemIdx);
      return copy;
    });
  };

  const totalScrapWeight = useMemo(() => {
    let sum = 0;
    selectedChallanBlocks.forEach((block) => {
      block.items.forEach((item) => {
        sum += parseFloat(item.scrapQuantity) || 0;
      });
    });
    return Number(sum.toFixed(2));
  }, [selectedChallanBlocks]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    if (selectedChallanBlocks.length === 0) {
      toast.error('Please select at least one Inbound Challan');
      return;
    }

    // Flatten items with positive scrap quantity
    const payloadItems = [];
    selectedChallanBlocks.forEach((block) => {
      block.items.forEach((item) => {
        const qty = parseFloat(item.scrapQuantity);
        if (qty > 0) {
          payloadItems.push({
            inboundChallanId: item.inboundChallanId || block.inboundChallanId || undefined,
            inboundChallanNumber: item.inboundChallanNumber || block.challanNumber || undefined,
            inboundChallanDate: item.inboundChallanDate || block.challanDate || undefined,
            lotId: item.lotId || undefined,
            lotNumber: item.lotNumber,
            materialId: item.materialId || undefined,
            materialCode: item.materialCode,
            materialName: item.materialName,
            initialQuantity: item.initialQuantity || 0,
            quantityAvailable: item.quantityAvailable || 0,
            scrapQuantity: qty,
            unit: item.unit || 'KGS',
            remarks: item.remarks,
          });
        }
      });
    });

    if (payloadItems.length === 0) {
      toast.error('Please enter scrap quantity for at least one material');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        challanNumber: challanNumber.trim() || undefined,
        challanDate,
        vehicleNumber: vehicleNumber.trim() || undefined,
        transporter: transporter.trim() || undefined,
        lrNumber: lrNumber.trim() || undefined,
        placeOfSupply: placeOfSupply.trim() || 'Chopanki',
        remarks: remarks.trim() || undefined,
        items: payloadItems,
      };

      const res = await api.post('/outbound-challans/scrap', payload);
      toast.success('Scrap return challan created successfully', {
        description: `Challan ${res?.data?.challanNumber || ''} created with Inbound Challan traceability`,
      });

      onSuccess?.(res?.data);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create scrap challan', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create scrap challan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-[1140px] p-0 flex flex-col bg-slate-50 overflow-hidden"
      >
        <SheetHeader className="px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-amber-50 text-amber-700">
              <Package className="w-4 h-4" />
            </span>
            <div>
              <SheetTitle className="text-base font-semibold text-slate-900">
                Create Scrap Return Challan
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 mt-0.5">
                Select active Inbound Challans to return raw material process waste / scrap back to principal.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Config Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Customer &amp; Dispatch Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer Picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    Customer / Principal Factory *
                  </Label>
                  <SearchableSelect
                    options={customerOptions}
                    value={selectedCustomerId}
                    onChange={(val) => setSelectedCustomerId(val)}
                    placeholder="Select Customer..."
                    searchPlaceholder="Search customer name/code..."
                    className="h-9 text-xs bg-white"
                  />
                </div>

                {/* Challan Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    Scrap Challan Number (Auto if blank)
                  </Label>
                  <Input
                    placeholder="e.g. MF/SC/2627/001"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="h-9 text-xs font-mono bg-white border-slate-200"
                  />
                </div>

                {/* Challan Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Challan Date *</Label>
                  <Input
                    type="date"
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    className="h-9 text-xs bg-white border-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Vehicle & Transport */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Vehicle Number</Label>
                  <Input
                    placeholder="e.g. RJ-02-GB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="h-9 text-xs font-mono uppercase bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Transporter Name</Label>
                  <Input
                    placeholder="e.g. VRL Logistics"
                    value={transporter}
                    onChange={(e) => setTransporter(e.target.value)}
                    className="h-9 text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">LR / Bilty Number</Label>
                  <Input
                    placeholder="e.g. LR-998811"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    className="h-9 text-xs font-mono bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Place of Supply</Label>
                  <Input
                    placeholder="e.g. Chopanki / Bhiwadi"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="h-9 text-xs bg-white border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium text-slate-700">Remarks / Reason</Label>
                <Input
                  placeholder="Reason for return of scrap material to principal..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-9 text-xs bg-white border-slate-200"
                />
              </div>
            </div>

            {/* Inbound Challan Selector Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    Select Active Inbound Challans
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select customer inbound challans that currently have raw material stock left to return scrap against.
                  </p>
                </div>

                {selectedCustomerId && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="w-80">
                      <SearchableSelect
                        options={availableChallanOptions}
                        value={activePickerChallanId}
                        onChange={(id) => handleAddChallanBlock(id)}
                        placeholder={
                          loadingChallans
                            ? 'Checking available inbound challans...'
                            : availableChallanOptions.length === 0
                              ? 'No un-depleted challans available'
                              : '+ Add Inbound Challan...'
                        }
                        searchPlaceholder="Search challan #..."
                        disabled={loadingChallans || availableChallanOptions.length === 0}
                        className="h-9 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {!selectedCustomerId && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center text-xs text-slate-500">
                  Please select a Customer above to choose Inbound Challans.
                </div>
              )}

              {selectedCustomerId && !loadingChallans && activeInboundChallans.length === 0 && (
                <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-lg text-center text-xs text-amber-800 flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>No active or un-depleted Inbound Challans found for this customer. All materials have been consumed.</span>
                </div>
              )}
            </div>

            {/* Inbound Challan Blocks */}
            {selectedChallanBlocks.map((block, bIdx) => (
              <div
                key={block.inboundChallanId || block.challanNumber || bIdx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
              >
                {/* Block Header */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      Inbound Challan: {block.challanNumber}
                    </span>
                    {block.challanDate && (
                      <Badge variant="outline" className="font-mono text-[10px] bg-white text-slate-600">
                        Dt. {new Date(block.challanDate).toLocaleDateString('en-GB')}
                      </Badge>
                    )}
                    {block.vehicleNumber && (
                      <span className="text-[11px] font-mono text-slate-500">
                        (Vehicle: {block.vehicleNumber})
                      </span>
                    )}
                    <Badge variant="secondary" className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Balance in Plant: {(block.totalRemainingQuantity || 0).toLocaleString()} Kgs
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddManualItem(bIdx)}
                      className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Custom Item
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChallanBlock(bIdx)}
                      className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      Remove Challan
                    </Button>
                  </div>
                </div>

                {/* Items Table */}
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-700 w-10">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Material Description</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 w-24">Material Code</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 w-28">Lot #</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 w-28 text-right">
                        Originally Received
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 w-28 text-right text-emerald-800">
                        Quantity Left
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 w-36 text-right">
                        Scrap Return Qty (Kgs) *
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Remarks / Reason</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {block.items.map((item, iIdx) => (
                      <TableRow key={iIdx} className="hover:bg-slate-50/50">
                        <TableCell className="text-xs font-medium text-slate-500 py-2.5">
                          {iIdx + 1}
                        </TableCell>
                        <TableCell className="font-medium text-xs text-slate-900 py-2.5">
                          {item.materialName}
                          {item.warehouseName && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              Warehouse: {item.warehouseName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600 py-2.5">
                          {item.materialCode || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-600 py-2.5">
                          {item.lotNumber || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right text-slate-500 py-2.5">
                          {(item.initialQuantity || 0).toLocaleString()} {item.unit}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-right text-emerald-700 py-2.5">
                          {(item.quantityAvailable || 0).toLocaleString()} {item.unit}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={item.scrapQuantity}
                            onChange={(e) => handleScrapQtyChange(bIdx, iIdx, e.target.value)}
                            className="h-8 text-xs font-mono font-bold text-right bg-white border-slate-200"
                          />
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Input
                            placeholder="e.g. Trim scrap, extrusion loss"
                            value={item.remarks || ''}
                            onChange={(e) => handleScrapRemarksChange(bIdx, iIdx, e.target.value)}
                            className="h-8 text-xs bg-white border-slate-200"
                          />
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(bIdx, iIdx)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}

            {/* Total Summary Banner */}
            {selectedChallanBlocks.length > 0 && (
              <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Inbound Challans Selected: </span>
                  <strong className="text-slate-900 font-mono">{selectedChallanBlocks.length}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Total Scrap Weight to Return: </span>
                  <strong className="text-slate-900 font-mono text-sm ml-1 text-amber-900 font-bold">
                    {totalScrapWeight.toLocaleString()} Kgs
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <SheetFooter className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={submitting || selectedChallanBlocks.length === 0}
              size="sm"
              className="h-9 px-4 gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submitting ? 'Generating Challan...' : 'Generate Scrap Challan & Sheet'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
