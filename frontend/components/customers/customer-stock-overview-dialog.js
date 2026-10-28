'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { PackingListDocumentDialog } from '@/components/packing/packing-list-document-dialog';
import { MaterialConsumptionSheetDialog } from '@/components/dispatch/material-consumption-sheet-dialog';

import {
  Building2,
  Package,
  Layers,
  Truck,
  FileText,
  RotateCcw,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  ExternalLink,
  MapPin,
  Phone,
  FileCheck2,
} from 'lucide-react';

export function CustomerStockOverviewDialog({ customer, open, onOpenChange }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('raw-materials');

  // Preview dialog states
  const [selectedPackingListId, setSelectedPackingListId] = useState(null);
  const [selectedChallanId, setSelectedChallanId] = useState(null);

  const fetchOverview = async () => {
    if (!customer?._id) return;
    setIsLoading(true);
    try {
      const res = await apiClient(`/customers/${customer._id}/stock-overview`);
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load customer stock overview', {
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && customer?._id) {
      fetchOverview();
    }
  }, [open, customer?._id]);

  if (!customer) return null;

  const summary = data?.summary || {};
  const drumSummary = summary.drumSummary || {};

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-6 bg-slate-50">
          <DialogHeader className="border-b border-slate-200 pb-4 bg-white -mx-6 -mt-6 p-6 sticky top-0 z-20 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      {customer.name}
                      <span className="text-xs font-mono font-normal bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {customer.code}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                      <span>GSTIN: <strong className="font-mono text-slate-700">{customer.gstin || 'N/A'}</strong></span>
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.billingAddress?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {customer.billingAddress.city}, {customer.billingAddress.state}
                        </span>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchOverview}
                  disabled={isLoading}
                  className="h-8.5 gap-1.5 text-xs text-slate-700 bg-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total RM Stock
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {summary.totalStockKg ? summary.totalStockKg.toLocaleString('en-IN') : '0.00'}
                <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Customer Owned</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
                Available Free
              </span>
              <div className="text-xl font-bold text-emerald-700 font-mono">
                {summary.totalAvailableKg ? summary.totalAvailableKg.toLocaleString('en-IN') : '0.00'}
                <span className="text-xs font-normal text-emerald-600 ml-1">kg</span>
              </div>
              <span className="text-[10px] text-emerald-600 mt-1 block">Ready for production</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">
                Reserved in POs
              </span>
              <div className="text-xl font-bold text-amber-700 font-mono">
                {summary.totalReservedKg ? summary.totalReservedKg.toLocaleString('en-IN') : '0.00'}
                <span className="text-xs font-normal text-amber-600 ml-1">kg</span>
              </div>
              <span className="text-[10px] text-amber-600 mt-1 block">Locked in WIP</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
                Empty Drums in Yard
              </span>
              <div className="text-xl font-bold text-indigo-700 font-mono">
                {drumSummary.availableEmpty || 0}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  / {drumSummary.totalReceived || 0} total
                </span>
              </div>
              <span className="text-[10px] text-indigo-600 mt-1 block">Available for packaging</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block mb-1">
                Packed / In Use
              </span>
              <div className="text-xl font-bold text-purple-700 font-mono">
                {drumSummary.packed || 0}
                <span className="text-xs font-normal text-purple-600 ml-1">drums</span>
              </div>
              <span className="text-[10px] text-purple-600 mt-1 block">Ready for dispatch</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 mt-6 bg-white rounded-t-xl px-4 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('raw-materials')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'raw-materials'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Raw Material Stock ({data?.rawMaterialStock?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('drums')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'drums'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Returnable Drums ({data?.drums?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inbound')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'inbound'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Inbound Challans ({data?.inboundChallans?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('outbound')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'outbound'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Outbound Challans & Consumption ({data?.outboundChallans?.length || 0})
            </button>
          </div>

          {/* Tab 1: Raw Materials */}
          {activeTab === 'raw-materials' && (
            <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-4">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Material Code & Name</TableHead>
                    <TableHead className="text-xs font-semibold">Category / HSN</TableHead>
                    <TableHead className="text-xs font-semibold">Warehouse</TableHead>
                    <TableHead className="text-xs font-semibold text-right">On-Hand Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Reserved</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Available Free</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        Loading customer stock...
                      </TableCell>
                    </TableRow>
                  ) : !data?.rawMaterialStock?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        No raw material inventory found for this customer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.rawMaterialStock.map((item, idx) => (
                      <TableRow key={item._id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="py-2.5">
                          <div className="font-medium text-xs text-slate-900">
                            {item.materialId?.name || 'Raw Material'}
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            {item.materialId?.code}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600">
                          <div>{item.materialId?.category || 'RAW_MATERIAL'}</div>
                          <span className="text-[11px] font-mono text-slate-400">
                            HSN: {item.materialId?.hsnCode || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600">
                          {item.warehouseId?.name || 'Main Warehouse'}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-mono font-semibold text-xs text-slate-900">
                          {item.quantityOnHand?.toLocaleString('en-IN')} {item.materialId?.baseUnit || 'KG'}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-mono text-xs text-amber-600">
                          {item.quantityReserved?.toLocaleString('en-IN')} {item.materialId?.baseUnit || 'KG'}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-mono font-bold text-xs text-emerald-700">
                          {item.quantityAvailable?.toLocaleString('en-IN')} {item.materialId?.baseUnit || 'KG'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Tab 2: Drums */}
          {activeTab === 'drums' && (
            <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-4">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Drum No / Code</TableHead>
                    <TableHead className="text-xs font-semibold">Size (Flange x Core x Trav)</TableHead>
                    <TableHead className="text-xs font-semibold">Ref RGP No</TableHead>
                    <TableHead className="text-xs font-semibold">Inbound Challan</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        Loading drum inventory...
                      </TableCell>
                    </TableRow>
                  ) : !data?.drums?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        No drums received for this customer yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.drums.map((drum, idx) => (
                      <TableRow key={drum._id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="py-2.5 font-mono font-semibold text-xs text-slate-900">
                          {drum.drumNumber}
                        </TableCell>
                        <TableCell className="py-2.5 font-mono text-xs text-slate-700">
                          {drum.flangeDiameterMm && drum.barrelDiameterMm && drum.traverseWidthMm
                            ? `${drum.flangeDiameterMm}x${drum.barrelDiameterMm}x${drum.traverseWidthMm}`
                            : drum.sizeDescription || '44X16X24'}
                        </TableCell>
                        <TableCell className="py-2.5 font-mono text-xs text-indigo-700 font-medium">
                          {drum.refRgpNumber || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 font-mono text-xs text-slate-600">
                          {drum.inboundChallanNumber || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600 uppercase">
                          {drum.drumType || 'WOODEN'}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              drum.status === 'AVAILABLE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : drum.status === 'PACKED' || drum.status === 'IN_USE'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : drum.status === 'DISPATCHED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {drum.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Tab 3: Inbound Challans */}
          {activeTab === 'inbound' && (
            <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-4">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Challan No & Date</TableHead>
                    <TableHead className="text-xs font-semibold">Vehicle & Location</TableHead>
                    <TableHead className="text-xs font-semibold">Materials Received</TableHead>
                    <TableHead className="text-xs font-semibold">Warehouse</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">
                        Loading inbound challans...
                      </TableCell>
                    </TableRow>
                  ) : !data?.inboundChallans?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">
                        No inbound delivery challans found for this customer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.inboundChallans.map((ic, idx) => (
                      <TableRow key={ic._id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="py-2.5">
                          <div className="font-mono font-semibold text-xs text-slate-900">
                            {ic.customerChallanNumber || ic.challanNumber}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {ic.customerChallanDate
                              ? new Date(ic.customerChallanDate).toLocaleDateString('en-GB')
                              : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600">
                          <div className="font-mono font-medium text-slate-800">
                            {ic.vehicleNumber || '—'}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {ic.transporter || 'Self'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-700">
                          <div className="max-w-md space-y-0.5">
                            {ic.lines?.slice(0, 3).map((l, li) => (
                              <div key={li} className="text-[11px] text-slate-600 flex justify-between gap-2">
                                <span>{l.materialId?.name || l.materialName || 'Material'}:</span>
                                <span className="font-mono font-medium text-slate-900">
                                  {l.quantityReceived || l.quantity} {l.unit || 'KG'}
                                </span>
                              </div>
                            ))}
                            {ic.lines?.length > 3 && (
                              <span className="text-[10px] text-indigo-600 font-medium">
                                +{ic.lines.length - 3} more items
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600">
                          {ic.warehouseId?.name || 'Raw Material Store'}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              ic.status === 'POSTED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {ic.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Tab 4: Outbound Challans & Consumption */}
          {activeTab === 'outbound' && (
            <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-4">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Challan & Date</TableHead>
                    <TableHead className="text-xs font-semibold">Work Order / Packing</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Dispatched Length</TableHead>
                    <TableHead className="text-xs font-semibold">Vehicle / Place</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Official Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        Loading outbound challans...
                      </TableCell>
                    </TableRow>
                  ) : !data?.outboundChallans?.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        No outbound delivery challans generated for this customer yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.outboundChallans.map((oc, idx) => (
                      <TableRow key={oc._id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="py-2.5">
                          <div className="font-mono font-bold text-xs text-slate-900">
                            {oc.challanNumber}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {oc.challanDate
                              ? new Date(oc.challanDate).toLocaleDateString('en-GB')
                              : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-700">
                          <div className="font-mono text-slate-900">
                            WO: {oc.workOrderId?.workOrderNumber || '—'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            PL: {oc.packingListId?.packingListNumber || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-mono font-bold text-xs text-indigo-700">
                          {oc.totalLengthMeters?.toLocaleString('en-IN') || '—'} m
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600">
                          <div className="font-mono">{oc.vehicleNumber || '—'}</div>
                          <div className="text-[11px] text-slate-400">{oc.placeOfSupply || '—'}</div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              oc.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : oc.status === 'DISPATCHED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {oc.status}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {oc.packingListId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedPackingListId(oc.packingListId?._id || oc.packingListId)}
                                className="h-7 text-[11px] px-2 gap-1 text-slate-700 hover:text-indigo-700 hover:border-indigo-300"
                              >
                                <FileText className="w-3 h-3 text-indigo-600" />
                                Packing List
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedChallanId(oc._id)}
                              className="h-7 text-[11px] px-2 gap-1 text-slate-700 hover:text-emerald-700 hover:border-emerald-300"
                            >
                              <FileCheck2 className="w-3 h-3 text-emerald-600" />
                              Consumption Sheet
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested Packing List Dialog (Image 1) */}
      {selectedPackingListId && (
        <PackingListDocumentDialog
          packingListId={selectedPackingListId}
          open={!!selectedPackingListId}
          onOpenChange={(val) => !val && setSelectedPackingListId(null)}
        />
      )}

      {/* Nested Material Consumption Sheet Dialog (Image 2) */}
      {selectedChallanId && (
        <MaterialConsumptionSheetDialog
          challanId={selectedChallanId}
          open={!!selectedChallanId}
          onOpenChange={(val) => !val && setSelectedChallanId(null)}
        />
      )}
    </>
  );
}
