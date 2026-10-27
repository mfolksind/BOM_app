'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';

export function Header({ onRefresh, isRefreshing = false }) {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Mobile Sidebar Trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger
            render={(props) => (
              <Button
                {...props}
                variant="outline"
                size="icon"
                className="md:hidden h-9 w-9 text-slate-600 cursor-pointer"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          />
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">System</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-800">
            Control Console
          </span>
        </div>
      </div>

      {/* Right Action Icons & Status */}
      <div className="flex items-center gap-3">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 text-xs font-medium border-slate-200 hover:bg-slate-100 text-slate-700 gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh Data</span>
          </Button>
        )}

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="hidden sm:inline-flex items-center gap-1.5 bg-slate-50 border-slate-200 text-slate-700 py-1 text-xs"
          >
            <Shield className="h-3 w-3 text-slate-500" />
            <span className="font-semibold">{user?.role || 'SUPER_ADMIN'}</span>
          </Badge>

          <Badge
            variant="secondary"
            className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
            Connected
          </Badge>
        </div>
      </div>
    </header>
  );
}
