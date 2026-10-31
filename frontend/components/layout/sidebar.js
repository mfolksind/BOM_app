'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  Users,
  ShieldCheck,
  LogOut,
  Layers,
  Settings,
  Boxes,
  Cpu,
  Package,
  FileSpreadsheet,
  ChevronRight,
  Building2,
  KeyRound,
  UserCog,
  History,
  Contact2,
  Cable,
  Warehouse,
  Truck,
  ClipboardList,
  Cog,
  Workflow,
  UploadCloud,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '@/components/profile/change-password-dialog';
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog';

const navSections = [
  {
    title: 'Master Setup',
    items: [
      {
        title: 'Customers',
        href: '/dashboard/customers',
        icon: Contact2,
      },
      {
        title: 'Warehouses',
        href: '/dashboard/warehouses',
        icon: Warehouse,
      },
      {
        title: 'Raw Materials',
        href: '/dashboard/materials',
        icon: Boxes,
      },
      {
        title: 'Cable Products',
        href: '/dashboard/products',
        icon: Cable,
      },
      {
        title: 'Bill of Materials (BOM)',
        href: '/dashboard/bom',
        icon: Layers,
      },
      {
        title: 'Process Stages',
        href: '/dashboard/process-stages',
        icon: Workflow,
      },
      {
        title: 'Machines & Equipment',
        href: '/dashboard/machines',
        icon: Cog,
      },
    ],
  },
  {
    title: 'Inventory & Stock',
    items: [
      {
        title: 'Global Stock Dashboard',
        href: '/dashboard/stock',
        icon: Warehouse,
      },
      {
        title: 'Inbound Challans',
        href: '/dashboard/inbound-challans',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: 'Orders & Production',
    items: [
      {
        title: 'Work Orders',
        href: '/dashboard/work-orders',
        icon: FileSpreadsheet,
      },
      {
        title: 'Shopfloor WIP & Batches',
        href: '/dashboard/production',
        icon: Cpu,
      },
    ],
  },
  {
    title: 'Packing & Dispatch',
    items: [
      {
        title: 'Cable Drums & Packing',
        href: '/dashboard/packing',
        icon: Package,
      },
      {
        title: 'Outbound Dispatch',
        href: '/dashboard/dispatch',
        icon: Truck,
      },
      {
        title: 'Material Reconciliation',
        href: '/dashboard/reconciliation',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: 'System & Security',
    superAdminOnly: true,
    items: [
      {
        title: 'Admins & Staff',
        href: '/dashboard/admins',
        icon: ShieldCheck,
      },
      {
        title: 'Data Import Center',
        href: '/dashboard/import',
        icon: UploadCloud,
      },
      {
        title: 'Operator Profiles',
        href: '/dashboard/users',
        icon: Users,
      },
      {
        title: 'Activity & Audit Logs',
        href: '/dashboard/logs',
        icon: History,
      },
    ],
  },
];

export function Sidebar({ className }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const userInitials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}`.toUpperCase()
    : 'AD';

  return (
    <>
      <aside
        className={cn(
          'w-64 border-r border-slate-200 bg-white flex flex-col h-screen select-none shrink-0 transition-all duration-200',
          className
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
          <Link href="/dashboard/admins" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm shadow-slate-300">
              <span className="font-bold text-sm tracking-tighter">MF</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-slate-900">
                Mfolks ERP
              </span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Console Studio
              </span>
            </div>
          </Link>
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-1.5 py-0 border-slate-200 text-slate-600 bg-slate-50"
          >
            v1.0
          </Badge>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections
            .filter((section) => !section.superAdminOnly || user?.role === 'SUPER_ADMIN')
            .map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  if (item.disabled) {
                    return (
                      <div
                        key={item.title}
                        className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 rounded-lg cursor-not-allowed opacity-60 hover:bg-slate-50/50"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span>{item.title}</span>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 relative',
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            'w-4 h-4 transition-colors',
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                          )}
                        />
                        <span>{item.title}</span>
                      </div>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Footer Profile & Action */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70">
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={false}
              render={(triggerProps) => (
                <div
                  {...triggerProps}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-200/60 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8 rounded-md border border-slate-200 bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                      <AvatarFallback className="bg-slate-900 text-white rounded-md">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {user?.role || 'ADMIN'} • {user?.employeeCode || 'SA-01'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              )}
            />

            <DropdownMenuContent align="end" className="w-56 mb-2">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-medium text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <div className="pt-1">
                    <Badge variant="outline" className="text-[10px] text-slate-700 font-mono">
                      {user?.department || 'MANAGEMENT'}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setEditProfileOpen(true)}
                className="text-xs cursor-pointer text-slate-700"
              >
                <UserCog className="mr-2 h-3.5 w-3.5 text-slate-500" />
                <span>Edit Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setChangePasswordOpen(true)}
                className="text-xs cursor-pointer text-slate-700"
              >
                <KeyRound className="mr-2 h-3.5 w-3.5 text-amber-500" />
                <span>Change Password</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Profile and Password Modals */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />

      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
      />
    </>
  );
}
