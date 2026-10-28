'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { CreateDrumDialog } from '@/components/packing/create-drum-dialog';
import { EditDrumDialog } from '@/components/packing/edit-drum-dialog';
import { ReceiveCustomerDrumsDialog } from '@/components/packing/receive-customer-drums-dialog';
import { CreatePackingListDialog } from '@/components/packing/create-packing-list-dialog';
import { PackingListDocumentDialog } from '@/components/packing/packing-list-document-dialog';
import { MaterialConsumptionSheetDialog } from '@/components/dispatch/material-consumption-sheet-dialog';

import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Eye,
  FileText,
  Boxes,
  Truck,
  Layers,
  ArrowRight,
  CheckCircle2,
  MoreVertical,
  Building2,
  FileCheck2,
  Clock,
} from 'lucide-react';

export default function PackingPage() {
  const searchParams = useSearchParams();
  const initialWoId = searchParams.get('workOrderId');

  const [activeTab, setActiveTab] = useState('packing-lists'); // 'packing-lists' | 'drums'

  // Packing Lists State
  const [packingLists, setPackingLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Drums State
  const [drums, setDrums] = useState([]);
  const [loadingDrums, setLoadingDrums] = useState(true);
  const [drumSearch, setDrumSearch] = useState('');
  const [drumStatusFilter, setDrumStatusFilter] = useState('ALL');
  const [drumOwnershipFilter, setDrumOwnershipFilter] = useState('ALL');
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Modals State
  const [createPackingOpen, setCreatePackingOpen] = useState(false);
  const [receiveDrumsOpen, setReceiveDrumsOpen] = useState(false);
  const [createDrumOpen, setCreateDrumOpen] = useState(false);
  const [editingDrum, setEditingDrum] = useState(null);

  // Document Previews
  const [previewPackingListId, setPreviewPackingListId] = useState(null);
  const [previewChallanId, setPreviewChallanId] = useState(null);

  // Fetch Customers & Warehouses
  const fetchMasters = async () => {
    try {
      const [cRes, whRes] = await Promise.all([
        apiClient('/customers?limit=100'),
        apiClient('/warehouses?limit=100'),
      ]);
      if (cRes?.data) {
        setCustomers(Array.isArray(cRes.data) ? cRes.data : (cRes.data.items || cRes.data.customers || []));
      }
      if (whRes?.data) {
        setWarehouses(Array.isArray(whRes.data) ? whRes.data : (whRes.data.items || whRes.data.warehouses || []));
      }
    } catch (err) {
      console.error('Failed to load masters in packing page', err);
    }
  };

  // Fetch Packing Lists
  const fetchPackingLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const res = await apiClient('/packing-lists?limit=50');
      if (res.data) {
        setPackingLists(res.data.items || res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load packing lists', { description: err.message });
    } finally {
      setLoadingLists(false);
    }
  }, []);

  // Fetch Drums
  const fetchDrums = useCallback(async () => {
    setLoadingDrums(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (drumStatusFilter !== 'ALL') params.append('status', drumStatusFilter);
      if (drumOwnershipFilter !== 'ALL') params.append('ownership', drumOwnershipFilter);
      if (drumSearch.trim()) params.append('search', drumSearch.trim());

      const res = await apiClient(`/drums?${params.toString()}`);
      if (res.data) {
        setDrums(res.data.items || res.data.drums || []);
      }
    } catch (err) {
      toast.error('Failed to load drums', { description: err.message });
    } finally {
      setLoadingDrums(false);
    }
  }, [drumStatusFilter, drumOwnershipFilter, drumSearch]);

  useEffect(() => {
    fetchMasters();
    fetchPackingLists();
    fetchDrums();
  }, []);

  useEffect(() => {
    if (initialWoId) {
      setCreatePackingOpen(true);
    }
  }, [initialWoId]);

  // Handle finalize drums (transition DRAFT -> PACKED)
  const handlePackList = async (plId) => {
    try {
      await apiClient(`/packing-lists/${plId}/pack`, { method: 'POST' });
      toast.success('Drums sealed and transitioned to PACKED status!');
      fetchPackingLists();
      fetchDrums();
    } catch (err) {
      toast.error('Failed to pack drums', { description: err.message });
    }
  };

  // Handle generate outbound delivery challan from packing list
  const handleGenerateChallan = async (pl) => {
    try {
      const payload = {
        vehicleNumber: 'UP17BT 0896',
        placeOfSupply: 'Haridwar-Uttarakhand',
        transporterName: 'Standard Logistics',
        driverName: 'Driver',
        remarks: 'Being goods returned back to principal after partly completion of job work.',
      };

      const res = await apiClient(`/packing-lists/${pl._id}/generate-challan`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        toast.success(`Outbound Delivery Challan ${res.data.challanNumber} created!`);
        fetchPackingLists();
        fetchDrums();
        // Immediately allow viewing Material Consumption Sheet (Image 2)
        setPreviewChallanId(res.data._id);
      }
    } catch (err) {
      toast.error('Failed to generate delivery challan', { description: err.message });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-orange-600" />
            Packaging &amp; Drum Yard Operations
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Direct 2-step flow: Pack PO cable into drums (Packing List - Image 1), then generate Outbound Delivery Challans (Material Consumption Sheet - Image 2).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchPackingLists();
              fetchDrums();
            }}
            className="h-9 px-3 gap-1.5 text-xs text-slate-700 bg-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setReceiveDrumsOpen(true)}
            className="h-9 px-3 gap-1.5 text-xs text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 cursor-pointer shadow-xs font-semibold"
          >
            <Truck className="w-4 h-4 text-indigo-600" />
            Receive Customer Drums (Challan/RGP)
          </Button>

          <Button
            onClick={() => setCreatePackingOpen(true)}
            className="h-9 px-3.5 gap-2 text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Pack Cable into Drums
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('packing-lists')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'packing-lists'
              ? 'border-orange-600 text-orange-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Packing Lists &amp; Packaging Runs ({packingLists.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('drums')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'drums'
              ? 'border-orange-600 text-orange-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Cable Drums &amp; Ref RGP Inventory ({drums.length})
        </button>
      </div>

      {/* TAB 1: PACKING LISTS */}
      {activeTab === 'packing-lists' && (
        <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-700">Packing List No</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Customer &amp; Work Order</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Cable Size (SIZE)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 text-right">Total Packed Length</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 text-center">Drums</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loadingLists ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-600 mb-2" />
                    Loading packing lists...
                  </TableCell>
                </TableRow>
              ) : packingLists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-14 text-center text-slate-500 text-xs">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800">No packing lists created yet.</p>
                    <p className="text-slate-400 mt-1">
                      Click <strong>&quot;Pack Cable into Drums&quot;</strong> to pack cables from a Production Order into drums.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                packingLists.map((pl) => (
                  <TableRow key={pl._id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3">
                      <div className="font-mono font-bold text-xs text-slate-900">
                        {pl.packingListNumber}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {pl.packingDate ? new Date(pl.packingDate).toLocaleDateString('en-GB') : '—'}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="font-semibold text-xs text-slate-900">
                        {pl.customerId?.name || 'Customer'}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-700">
                        WO: {pl.workOrderId?.workOrderNumber || pl.workOrderNumber || '—'}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 font-mono font-semibold text-xs text-slate-800">
                      {pl.sizeDescription || pl.productId?.code || '4CX35 SQMM A2XFY'}
                    </TableCell>

                    <TableCell className="py-3 text-right font-mono font-bold text-xs text-indigo-700">
                      {pl.totalLengthMeters ? pl.totalLengthMeters.toLocaleString('en-IN') : '0.0'} m
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      <Badge variant="outline" className="font-mono text-xs bg-slate-50">
                        {pl.lines?.length || pl.drumCount || 0} drums
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          pl.status === 'CHALLAN_CREATED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : pl.status === 'PACKED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {pl.status}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Image 1 Document Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewPackingListId(pl._id)}
                          className="h-8 text-xs px-2.5 gap-1.5 text-slate-700 hover:text-orange-700 hover:border-orange-300"
                        >
                          <FileText className="w-3.5 h-3.5 text-orange-600" />
                          Packing List (Image 1)
                        </Button>

                        {/* Step 1 Completion: Finalize DRAFT to PACKED */}
                        {pl.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={() => handlePackList(pl._id)}
                            className="h-8 text-xs px-2.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Finalize &amp; Seal Drums
                          </Button>
                        )}

                        {/* Step 2: Generate Delivery Challan with Consumption Sheet (Image 2) */}
                        {pl.status === 'PACKED' && (
                          <Button
                            size="sm"
                            onClick={() => handleGenerateChallan(pl)}
                            className="h-8 text-xs px-2.5 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Create Outbound Challan
                          </Button>
                        )}

                        {/* If Challan Already Created, allow viewing Image 2 */}
                        {pl.status === 'CHALLAN_CREATED' && pl.outboundChallanId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewChallanId(pl.outboundChallanId?._id || pl.outboundChallanId)}
                            className="h-8 text-xs px-2.5 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                            Consumption Sheet (Image 2)
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* TAB 2: DRUM INVENTORY */}
      {activeTab === 'drums' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search Drum No or Ref RGP..."
                value={drumSearch}
                onChange={(e) => setDrumSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Select value={drumStatusFilter} onValueChange={setDrumStatusFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Status</SelectItem>
                  <SelectItem value="AVAILABLE" className="text-xs">Available Empty</SelectItem>
                  <SelectItem value="PACKED" className="text-xs">Packed with Cable</SelectItem>
                  <SelectItem value="IN_USE" className="text-xs">In Use</SelectItem>
                  <SelectItem value="DISPATCHED" className="text-xs">Dispatched to Client</SelectItem>
                </SelectContent>
              </Select>

              <Select value={drumOwnershipFilter} onValueChange={setDrumOwnershipFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue placeholder="All Ownership" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Ownership</SelectItem>
                  <SelectItem value="CUSTOMER" className="text-xs">Customer Supplied</SelectItem>
                  <SelectItem value="FACTORY" className="text-xs">Factory Owned</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                onClick={() => setCreateDrumOpen(true)}
                className="h-9 px-3 gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Reel
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-700">Drum Identification #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Size (Flange x Core x Trav)</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Ref RGP No</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Inbound Challan</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Customer / Owner</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingDrums ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-xs text-slate-400">
                      Loading drum inventory...
                    </TableCell>
                  </TableRow>
                ) : drums.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                      No drums match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  drums.map((drum) => (
                    <TableRow key={drum._id} className="hover:bg-slate-50/50">
                      <TableCell className="py-2.5 font-mono font-bold text-xs text-slate-900">
                        {drum.drumNumber}
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-slate-700">
                        {drum.sizeDescription ||
                          (drum.flangeDiameterMm && drum.barrelDiameterMm && drum.traverseWidthMm
                            ? `${drum.flangeDiameterMm}X${drum.barrelDiameterMm}X${drum.traverseWidthMm}`
                            : '44X16X24')}
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-indigo-700 font-semibold">
                        {drum.refRgpNumber || '—'}
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-slate-600">
                        {drum.inboundChallanNumber || '—'}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        {drum.ownership === 'CUSTOMER' ? (
                          <span className="font-semibold text-indigo-700">
                            {drum.customerId?.name || 'Customer'}
                          </span>
                        ) : (
                          <span className="text-slate-600">Factory</span>
                        )}
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
                      <TableCell className="py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingDrum(drum)}
                          className="h-7 text-xs text-slate-500 hover:text-slate-900"
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Receive Customer Returnable Drums Dialog */}
      <ReceiveCustomerDrumsDialog
        open={receiveDrumsOpen}
        onOpenChange={setReceiveDrumsOpen}
        customers={customers}
        warehouses={warehouses}
        onSuccess={() => {
          fetchDrums();
          toast.success('Customer returnable drums received into warehouse yard!');
        }}
      />

      {/* Create / Pack Cable into Drums Dialog */}
      <CreatePackingListDialog
        open={createPackingOpen}
        onOpenChange={setCreatePackingOpen}
        defaultWorkOrderId={initialWoId}
        onSuccess={() => {
          fetchPackingLists();
          fetchDrums();
        }}
      />

      {/* Register Reel / Drum Dialog */}
      <CreateDrumDialog
        open={createDrumOpen}
        onOpenChange={setCreateDrumOpen}
        customers={customers}
        warehouses={warehouses}
        onSuccess={() => fetchDrums()}
      />

      {/* Edit Drum Dialog */}
      {editingDrum && (
        <EditDrumDialog
          drum={editingDrum}
          open={!!editingDrum}
          onOpenChange={(val) => !val && setEditingDrum(null)}
          customers={customers}
          initialMode="edit"
          onSuccess={() => fetchDrums()}
        />
      )}

      {/* Official Packing List Document Preview (Image 1) */}
      {previewPackingListId && (
        <PackingListDocumentDialog
          packingListId={previewPackingListId}
          open={Boolean(previewPackingListId)}
          onOpenChange={(val) => !val && setPreviewPackingListId(null)}
        />
      )}

      {/* Material Consumption Sheet Dialog (Image 2) */}
      {previewChallanId && (
        <MaterialConsumptionSheetDialog
          challanId={previewChallanId}
          open={Boolean(previewChallanId)}
          onOpenChange={(val) => !val && setPreviewChallanId(null)}
        />
      )}
    </div>
  );
}
