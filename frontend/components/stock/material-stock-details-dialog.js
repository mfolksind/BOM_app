'use client';

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import {
  Boxes,
  RefreshCw,
  Warehouse,
  Building2,
  Lock,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export function MaterialStockDetailsDialog({ material, open, onOpenChange }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const materialId = material?._id || material?.material?._id || material?.id;

  const fetchStockDetails = async () => {
    if (!materialId) return;
    setIsLoading(true);
    try {
      const res = await apiClient(`/inventory/materials/${materialId}`);
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load specific material stock', {
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && materialId) {
      fetchStockDetails();
    } else {
      setData(null);
    }
  }, [open, materialId]);

  if (!material) return null;

  const matInfo = data?.material || material.material || material;
  const summary = data?.summary || {
    totalOnHand: material.totalOnHand || 0,
    totalReserved: material.totalReserved || 0,
    totalAvailable: material.totalAvailable || 0,
    factoryOnHand: material.factoryOnHand || 0,
    customerOnHand: material.customerOnHand || 0,
  };
  const balances = data?.balances || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl md:max-w-4xl p-0 flex flex-col bg-slate-50 border-l border-slate-200"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs shrink-0">
            <SheetHeader className="p-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                    <Boxes className="w-6 h-6" />
                  </span>
                  <div>
                    <SheetTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      {matInfo.name}
                      <span className="text-xs font-mono font-normal bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {matInfo.code}
                      </span>
                    </SheetTitle>
                    <SheetDescription className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2.5">
                      <span>Category: <strong className="text-slate-700">{matInfo.category || 'RAW_MATERIAL'}</strong></span>
                      <span>•</span>
                      <span>Unit: <strong className="font-mono text-slate-700">{matInfo.baseUnit || 'KG'}</strong></span>
                    </SheetDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchStockDetails}
                    disabled={isLoading}
                    className="h-8.5 gap-1.5 text-xs text-slate-700 bg-white cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </SheetHeader>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPI Cards (Clean, Unified Typography) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Global On-Hand
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {summary.totalOnHand ? Number(summary.totalOnHand).toLocaleString('en-IN') : '0.00'}
                  <span className="text-xs font-normal text-slate-500 ml-1">{matInfo.baseUnit || 'kg'}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Total all plants</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Reserved in WIP
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {summary.totalReserved ? Number(summary.totalReserved).toLocaleString('en-IN') : '0.00'}
                  <span className="text-xs font-normal text-slate-500 ml-1">{matInfo.baseUnit || 'kg'}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Locked in active POs</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Free Available
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {summary.totalAvailable ? Number(summary.totalAvailable).toLocaleString('en-IN') : '0.00'}
                  <span className="text-xs font-normal text-slate-500 ml-1">{matInfo.baseUnit || 'kg'}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Ready for production</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Customer Owned
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {summary.customerOnHand ? Number(summary.customerOnHand).toLocaleString('en-IN') : '0.00'}
                  <span className="text-xs font-normal text-slate-500 ml-1">{matInfo.baseUnit || 'kg'}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Client Job-Work Stock</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Factory Owned
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {summary.factoryOnHand ? Number(summary.factoryOnHand).toLocaleString('en-IN') : '0.00'}
                  <span className="text-xs font-normal text-slate-500 ml-1">{matInfo.baseUnit || 'kg'}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Internal Inventory</span>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-indigo-600" />
                    Specific Warehouse &amp; Ownership Breakdown
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Physical location, customer ownership, and active reservations for {matInfo.name}.
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-700">Warehouse / Yard</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Ownership / Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">On-Hand Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Reserved in WIP</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Available Free</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Batch / Lot Reference</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-xs text-slate-400">
                        Loading specific material breakdown...
                      </TableCell>
                    </TableRow>
                  ) : balances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-xs text-slate-500">
                        No warehouse stock records found for this material.
                      </TableCell>
                    </TableRow>
                  ) : (
                    balances.map((b, idx) => (
                      <TableRow key={b._id || idx} className="hover:bg-slate-50/60">
                        <TableCell className="py-3">
                          <div className="font-semibold text-xs text-slate-900">
                            {b.warehouseId?.name || 'Main Warehouse'}
                          </div>
                          {b.warehouseId?.code && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {b.warehouseId.code}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-3">
                          {b.ownerType === 'CUSTOMER' ? (
                            <div>
                              <span className="font-semibold text-xs text-slate-900 block">
                                {b.customerId?.name || 'Customer Owned'}
                              </span>
                              {b.customerId?.code && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  {b.customerId.code}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                              Factory Owned
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono font-bold text-xs text-slate-900">
                          {b.quantityOnHand?.toLocaleString('en-IN')} {matInfo.baseUnit || 'KG'}
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono font-medium text-xs text-slate-900">
                          {b.quantityReserved > 0 ? (
                            <span className="text-slate-900">
                              {b.quantityReserved?.toLocaleString('en-IN')} {matInfo.baseUnit || 'KG'}
                            </span>
                          ) : (
                            <span className="text-slate-400">0.00</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-right font-mono font-bold text-xs text-slate-900">
                          {b.quantityAvailable?.toLocaleString('en-IN')} {matInfo.baseUnit || 'KG'}
                        </TableCell>

                        <TableCell className="py-3 text-xs text-slate-600 font-mono">
                          {b.lotId?.lotNumber ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {b.lotId.lotNumber}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 px-4"
            >
              Close Details
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
