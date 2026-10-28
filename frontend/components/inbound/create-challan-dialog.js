"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Plus, Trash2, Truck, Package } from "lucide-react";
import { api } from "@/lib/api";

export function CreateInboundChallanDialog({ open, onOpenChange, customers = [], warehouses = [], materials = [], onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [localCustomers, setLocalCustomers] = useState(customers);
    const [localWarehouses, setLocalWarehouses] = useState(warehouses);
    const [localMaterials, setLocalMaterials] = useState(materials);

    useEffect(() => {
        if (customers?.length > 0) setLocalCustomers(customers);
    }, [customers]);

    useEffect(() => {
        if (warehouses?.length > 0) setLocalWarehouses(warehouses);
    }, [warehouses]);

    useEffect(() => {
        if (materials?.length > 0) setLocalMaterials(materials);
    }, [materials]);

    useEffect(() => {
        if (open) {
            if (!customers || customers.length === 0) {
                api.get("/customers?limit=100")
                    .then((res) => {
                        const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
                        if (list.length > 0) setLocalCustomers(list);
                    })
                    .catch((e) => console.error(e));
            }
            if (!warehouses || warehouses.length === 0) {
                api.get("/warehouses?limit=100")
                    .then((res) => {
                        const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
                        if (list.length > 0) setLocalWarehouses(list);
                    })
                    .catch((e) => console.error(e));
            }
            if (!materials || materials.length === 0) {
                api.get("/materials?limit=100")
                    .then((res) => {
                        const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
                        if (list.length > 0) setLocalMaterials(list);
                    })
                    .catch((e) => console.error(e));
            }
        }
    }, [open, customers, warehouses, materials]);

    const [formData, setFormData] = useState({
        customerChallanNumber: "",
        customerChallanDate: new Date().toISOString().split("T")[0],
        ownerType: "CUSTOMER",
        customerId: "",
        warehouseId: "",
        vehicleNumber: "",
        transporterName: "",
        lrNumber: "",
        remarks: "",
        lines: [
            {
                materialId: "",
                declaredQuantity: "",
                receivedQuantity: "",
                unit: "KG",
                supplierLotNumber: "",
                remarks: "",
            },
        ],
    });

    const [includeDrums, setIncludeDrums] = useState(false);
    const [drumData, setDrumData] = useState({
        quantity: "5",
        drumSize: "44X16X24",
        drumType: "WOODEN",
        refRgpNumber: "",
        prefix: "MF/",
        startingNumber: "1",
        tareWeightKg: "85",
        remarks: "STD.LENGTH",
    });

    const handleAddLine = () => {
        setFormData((prev) => ({
            ...prev,
            lines: [
                ...prev.lines,
                {
                    materialId: "",
                    declaredQuantity: "",
                    receivedQuantity: "",
                    unit: "KG",
                    supplierLotNumber: "",
                    remarks: "",
                },
            ],
        }));
    };

    const handleRemoveLine = (index) => {
        if (formData.lines.length === 1) {
            toast.error("Challan must contain at least one line item");
            return;
        }
        setFormData((prev) => ({
            ...prev,
            lines: prev.lines.filter((_, i) => i !== index),
        }));
    };

    const handleLineChange = (index, field, value) => {
        setFormData((prev) => {
            const updated = [...prev.lines];
            updated[index] = { ...updated[index], [field]: value };
            if (field === "materialId") {
                const selectedMat = (localMaterials || []).find((m) => m._id === value);
                if (selectedMat?.baseUnit) {
                    updated[index].unit = selectedMat.baseUnit;
                }
            }
            return { ...prev, lines: updated };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerChallanNumber.trim()) {
            toast.error("Customer delivery challan number is required");
            return;
        }
        if (formData.ownerType === "CUSTOMER" && !formData.customerId) {
            toast.error("Customer account is required");
            return;
        }
        if (!formData.warehouseId) {
            toast.error("Receiving destination warehouse is required");
            return;
        }

        const validLines = formData.lines.filter((l) => l.materialId);
        if (validLines.length === 0 && (!includeDrums || parseInt(drumData.quantity) <= 0)) {
            toast.error("Please add at least one raw material line item or returnable drum entry");
            return;
        }

        for (let i = 0; i < validLines.length; i++) {
            const line = validLines[i];
            const declQty = parseFloat(line.declaredQuantity);
            if (isNaN(declQty) || declQty <= 0) {
                toast.error(`Declared quantity must be greater than 0 on line #${i + 1}`);
                return;
            }
            if (line.receivedQuantity) {
                const recQty = parseFloat(line.receivedQuantity);
                if (isNaN(recQty) || recQty <= 0) {
                    toast.error(`Received quantity must be greater than 0 on line #${i + 1}`);
                    return;
                }
            }
        }

        setLoading(true);
        try {
            const payload = {
                customerChallanNumber: formData.customerChallanNumber.trim(),
                customerChallanDate: formData.customerChallanDate,
                ownerType: formData.ownerType,
                customerId: formData.ownerType === "CUSTOMER" ? formData.customerId : undefined,
                warehouseId: formData.warehouseId,
                vehicleNumber: formData.vehicleNumber.trim() || undefined,
                transporterName: formData.transporterName.trim() || undefined,
                lrNumber: formData.lrNumber.trim() || undefined,
                remarks: formData.remarks.trim() || undefined,
                lines: validLines.map((l) => ({
                    materialId: l.materialId,
                    declaredQuantity: parseFloat(l.declaredQuantity),
                    receivedQuantity: l.receivedQuantity ? parseFloat(l.receivedQuantity) : parseFloat(l.declaredQuantity),
                    unit: l.unit || "KG",
                    supplierLotNumber: l.supplierLotNumber.trim() || undefined,
                    remarks: l.remarks.trim() || undefined,
                })),
            };

            if (includeDrums && parseInt(drumData.quantity) > 0) {
                payload.drums = {
                    quantity: parseInt(drumData.quantity),
                    drumSize: drumData.drumSize.trim() || "44X16X24",
                    drumType: drumData.drumType,
                    refRgpNumber: drumData.refRgpNumber.trim() || formData.customerChallanNumber.trim(),
                    prefix: drumData.prefix.trim() || "MF/",
                    tareWeightKg: parseFloat(drumData.tareWeightKg) || 85,
                    remarks: drumData.remarks.trim() || "STD.LENGTH",
                };
            }

            const res = await api.post("/inbound-challans", payload);
            if (res?.success || res?.data) {
                toast.success("Inbound Delivery Challan created successfully in DRAFT state");
                if (onSuccess) onSuccess(res?.data);
                onOpenChange(false);
                setFormData({
                    customerChallanNumber: "",
                    customerChallanDate: new Date().toISOString().split("T")[0],
                    ownerType: "CUSTOMER",
                    customerId: "",
                    warehouseId: "",
                    vehicleNumber: "",
                    transporterName: "",
                    lrNumber: "",
                    remarks: "",
                    lines: [
                        {
                            materialId: "",
                            declaredQuantity: "",
                            receivedQuantity: "",
                            unit: "KG",
                            supplierLotNumber: "",
                            remarks: "",
                        },
                    ],
                });
            }
        } catch (err) {
            toast.error(err.message || "Failed to create inbound challan");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const customerOptions = (localCustomers || []).map((c) => ({
        value: c._id,
        label: c.name,
        code: c.code,
        subLabel: c.phone || c.email || "",
    }));

    const warehouseOptions = (localWarehouses || []).map((w) => ({
        value: w._id,
        label: w.name,
        code: w.code,
        subLabel: w.type || "RAW_MATERIAL",
    }));

    const materialOptions = (localMaterials || []).map((m) => ({
        value: m._id,
        label: m.name,
        code: m.code,
        subLabel: `${m.category || "RAW_MATERIAL"} • ${m.baseUnit || "KG"}`,
    }));

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
                                <Truck className="w-5 h-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900">Receive Inbound Delivery Challan</SheetTitle>
                                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                                    Record incoming customer-supplied raw materials directly into warehouse stock.
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                <form id="createChallanForm" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                        Customer DC / Invoice Ref <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        placeholder="e.g. DC-2026-904"
                                        value={formData.customerChallanNumber}
                                        onChange={(e) => setFormData({ ...formData, customerChallanNumber: e.target.value })}
                                        className="h-9 text-sm font-semibold"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                        Challan Issue Date <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.customerChallanDate}
                                        onChange={(e) => setFormData({ ...formData, customerChallanDate: e.target.value })}
                                        className="h-9 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                        Customer / Consignor <span className="text-rose-500">*</span>
                                    </Label>
                                    <SearchableSelect
                                        options={customerOptions}
                                        value={formData.customerId}
                                        onChange={(val) => setFormData({ ...formData, customerId: val })}
                                        placeholder="Search & choose customer..."
                                        searchPlaceholder="Search customer by name or code..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                        Destination Warehouse <span className="text-rose-500">*</span>
                                    </Label>
                                    <SearchableSelect
                                        options={warehouseOptions}
                                        value={formData.warehouseId}
                                        onChange={(val) => setFormData({ ...formData, warehouseId: val })}
                                        placeholder="Select receiving warehouse..."
                                        searchPlaceholder="Search warehouse..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Vehicle #</Label>
                                    <Input
                                        placeholder="e.g. MH-12-AB-1234"
                                        value={formData.vehicleNumber}
                                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                        className="h-9 text-sm uppercase"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Transporter</Label>
                                    <Input
                                        placeholder="Transporter Name"
                                        value={formData.transporterName}
                                        onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                                        className="h-9 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">LR / Bilty #</Label>
                                    <Input
                                        placeholder="LR-00982"
                                        value={formData.lrNumber}
                                        onChange={(e) => setFormData({ ...formData, lrNumber: e.target.value })}
                                        className="h-9 text-sm uppercase"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Remarks / Notes</Label>
                                <Textarea
                                    placeholder="Gate-in inspection notes, seal numbers..."
                                    rows={2}
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    className="text-sm resize-none"
                                />
                            </div>
                        </div>

                        {/* Customer Returnable Drums Receipt Section */}
                        <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-200/90 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="p-2 bg-orange-100 text-orange-700 rounded-lg shrink-0">
                                        <Package className="w-4 h-4" />
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                                            Customer Returnable Empty Drums Received
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                            Did the customer send empty drums on this delivery challan? (e.g. 5 drums for cable winding)
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant={includeDrums ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setIncludeDrums(!includeDrums)}
                                    className={`h-8 text-xs font-semibold cursor-pointer shrink-0 ${
                                        includeDrums
                                            ? "bg-orange-600 hover:bg-orange-700 text-white"
                                            : "border-orange-300 text-orange-700 hover:bg-orange-100"
                                    }`}
                                >
                                    {includeDrums ? "✓ Drums Added (Click to remove)" : "+ Add Returnable Drums"}
                                </Button>
                            </div>

                            {includeDrums && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-orange-200/70">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">Drum Quantity *</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={drumData.quantity}
                                            onChange={(e) => setDrumData({ ...drumData, quantity: e.target.value })}
                                            className="h-8 text-xs bg-white font-mono font-bold"
                                            placeholder="5"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">Drum Size *</Label>
                                        <Input
                                            value={drumData.drumSize}
                                            onChange={(e) => setDrumData({ ...drumData, drumSize: e.target.value })}
                                            className="h-8 text-xs bg-white font-mono"
                                            placeholder="44X16X24"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">Ref RGP / Challan No</Label>
                                        <Input
                                            value={drumData.refRgpNumber}
                                            onChange={(e) => setDrumData({ ...drumData, refRgpNumber: e.target.value })}
                                            className="h-8 text-xs bg-white font-mono text-indigo-700 font-semibold"
                                            placeholder={formData.customerChallanNumber || "262740872"}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">Drum Prefix</Label>
                                        <Input
                                            value={drumData.prefix}
                                            onChange={(e) => setDrumData({ ...drumData, prefix: e.target.value })}
                                            className="h-8 text-xs bg-white font-mono"
                                            placeholder="MF/"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">Drum Type</Label>
                                        <Select
                                            value={drumData.drumType}
                                            onValueChange={(val) => setDrumData({ ...drumData, drumType: val })}
                                        >
                                            <SelectTrigger className="h-8 text-xs bg-white">
                                                <SelectValue placeholder="Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="WOODEN" className="text-xs">WOODEN</SelectItem>
                                                <SelectItem value="STEEL" className="text-xs">STEEL</SelectItem>
                                                <SelectItem value="PLASTIC" className="text-xs">PLASTIC</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-slate-700">Tare Weight (kg)</Label>
                                        <Input
                                            type="number"
                                            value={drumData.tareWeightKg}
                                            onChange={(e) => setDrumData({ ...drumData, tareWeightKg: e.target.value })}
                                            className="h-8 text-xs bg-white font-mono"
                                            placeholder="85"
                                        />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-[11px] font-semibold text-slate-700">Remarks</Label>
                                        <Input
                                            value={drumData.remarks}
                                            onChange={(e) => setDrumData({ ...drumData, remarks: e.target.value })}
                                            className="h-8 text-xs bg-white"
                                            placeholder="STD.LENGTH"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Raw Material Lines */}
                        <div className="space-y-3 pt-3 border-t border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-foreground text-sm">Challan Line Items ({formData.lines.length})</h4>
                                    <p className="text-xs text-muted-foreground">
                                        List incoming raw materials and declared vs received quantities
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddLine}
                                    className="h-8 gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Material Line
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {formData.lines.map((line, index) => {
                                    const selectedMat = materials.find((m) => m._id === line.materialId);
                                    return (
                                        <div key={index} className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-3">
                                            <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-muted text-foreground text-xs font-semibold flex items-center justify-center border">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {selectedMat ? `${selectedMat.name} (${selectedMat.code})` : `Item #${index + 1}`}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                    onClick={() => handleRemoveLine(index)}
                                                    disabled={formData.lines.length === 1}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>

                                            <div className="space-y-2.5">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                        Raw Material <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <SearchableSelect
                                                        options={materialOptions}
                                                        value={line.materialId}
                                                        onChange={(val) => handleLineChange(index, "materialId", val)}
                                                        placeholder="Search and choose material..."
                                                        searchPlaceholder="Search material by name or code..."
                                                    />
                                                </div>

                                                <div className="grid grid-cols-3 gap-2.5">
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate block">
                                                            Declared Qty *
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            min="0.001"
                                                            placeholder="0"
                                                            value={line.declaredQuantity}
                                                            onChange={(e) => handleLineChange(index, "declaredQuantity", e.target.value)}
                                                            className="h-8 text-xs bg-background"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate block">
                                                            Received Qty
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            min="0"
                                                            placeholder={line.declaredQuantity || "Same as declared"}
                                                            value={line.receivedQuantity}
                                                            onChange={(e) => handleLineChange(index, "receivedQuantity", e.target.value)}
                                                            className="h-8 text-xs bg-background"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate block">
                                                            Supplier Lot #
                                                        </Label>
                                                        <Input
                                                            placeholder="Lot / Coil #"
                                                            value={line.supplierLotNumber}
                                                            onChange={(e) => handleLineChange(index, "supplierLotNumber", e.target.value)}
                                                            className="h-8 text-xs bg-background font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
                            {loading ? "Recording Challan..." : "Save Draft Challan"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
