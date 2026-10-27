'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Layers,
  Cpu,
  FileSpreadsheet,
  Boxes,
  Building2,
  Package,
  ArrowRight,
  ClipboardList,
  Truck,
  Scale,
  Cable,
  Contact2,
} from 'lucide-react';

export default function DashboardHome() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const operationalCards = [
    {
      title: 'Customer Directory',
      description: 'Client accounts, GSTIN, billing addresses, and credit terms.',
      icon: Contact2,
      href: '/dashboard/customers',
      badge: 'Master Setup',
    },
    {
      title: 'Raw Materials & Warehouses',
      description: 'Physical warehouse storage, copper/aluminum lots, PVC/XLPE catalogs.',
      icon: Boxes,
      href: '/dashboard/materials',
      badge: 'Master Setup',
    },
    {
      title: 'Finished Cable Catalog',
      description: 'Cable specs, voltage grades (1.1KV - 33KV), core counts, and dimensions.',
      icon: Cable,
      href: '/dashboard/products',
      badge: 'Master Setup',
    },
    {
      title: 'Bill of Materials (BOM)',
      description: 'Engineering formulas, consumption norms, and scrap allowances.',
      icon: Layers,
      href: '/dashboard/bom',
      badge: 'Recipe Engineering',
    },
    {
      title: 'Inbound Delivery Challans',
      description: 'Receive customer-supplied materials with supplier lot traceability.',
      icon: ClipboardList,
      href: '/dashboard/inbound-challans',
      badge: 'Phase 1: Receiving',
    },
    {
      title: 'Work Orders & BOM Freeze',
      description: 'Lock client contracts, check real-time stock shortage, reserve materials.',
      icon: FileSpreadsheet,
      href: '/dashboard/work-orders',
      badge: 'Phase 2: Planning',
    },
    {
      title: 'Shopfloor WIP & Batches',
      description: 'Shift production orders, material issues (MIN), and quality spark tests.',
      icon: Cpu,
      href: '/dashboard/production',
      badge: 'Phase 3: Execution',
    },
    {
      title: 'Cable Drums & Reels',
      description: 'Tare weights, wooden/steel drums, and customer returnable spool assets.',
      icon: Package,
      href: '/dashboard/packing',
      badge: 'Phase 4: Packaging',
    },
    {
      title: 'Outbound Dispatch',
      description: 'Gate pass delivery challans, truck consignments, and transport LR logging.',
      icon: Truck,
      href: '/dashboard/dispatch',
      badge: 'Phase 5: Dispatch',
    },
    {
      title: 'Job-Work Reconciliation',
      description: 'Complete material balance audit: Received vs Consumed vs Scrap vs Balance.',
      icon: Scale,
      href: '/dashboard/reconciliation',
      badge: 'Audit & Statements',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-sm">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {user?.department || 'OPERATIONS'} • {user?.role || 'ADMIN'}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Welcome, {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-sm md:text-base text-slate-500 leading-relaxed">
            Mfolks Job-Work Manufacturing ERP Portal. Complete end-to-end control from customer raw material receipt to finished cable dispatch and reconciliation.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Super Admin Access:</span>
            <Link
              href="/dashboard/admins"
              className="text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              Admins & Staff
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/dashboard/users"
              className="text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              Operator Profiles
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/dashboard/logs"
              className="text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              Activity &amp; Audit Logs
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Operational Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Manufacturing Operations & Flow
          </h2>
          <span className="text-xs text-slate-500">
            10 Functional Modules Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationalCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link key={i} href={card.href} className="group">
                <Card
                  className="h-full border border-slate-200/90 shadow-sm bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-150 flex flex-col justify-between cursor-pointer"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                        {card.badge}
                      </span>
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 leading-relaxed">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600 group-hover:text-indigo-600 font-medium">
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
