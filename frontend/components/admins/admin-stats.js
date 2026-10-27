'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ShieldCheck, UserX, Building2 } from 'lucide-react';

export function AdminStats({ stats, isLoading }) {
  const cards = [
    {
      title: 'Total Admins',
      value: stats?.total ?? 0,
      icon: Users,
      trend: 'Registered managers',
      color: 'text-slate-900',
      bgColor: 'bg-slate-100',
    },
    {
      title: 'Active Now',
      value: stats?.active ?? 0,
      icon: ShieldCheck,
      trend: 'Can log in & operate',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Deactivated',
      value: stats?.inactive ?? 0,
      icon: UserX,
      trend: 'Blocked access',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Departments',
      value: stats?.departments ?? 0,
      icon: Building2,
      trend: 'Active teams',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card
            key={i}
            className="border border-slate-200/90 shadow-sm bg-white hover:border-slate-300 transition-all duration-150"
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold tracking-tight ${card.color}`}>
                    {isLoading ? '...' : card.value}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {card.trend}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${card.bgColor} ${card.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
