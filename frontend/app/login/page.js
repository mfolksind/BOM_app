'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      toast.error('Required fields missing', {
        description: 'Please enter both your work email and password.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(cleanEmail, cleanPassword);
      toast.success(`Welcome back, ${user.firstName}!`, {
        description: `Authenticated as ${user.role} (${user.employeeCode})`,
      });
      if (user.role === 'SUPER_ADMIN') {
        router.push('/dashboard/admins');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error('Authentication Failed', {
        description: err.message || 'Invalid email or password. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative p-4 md:p-8">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f015_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f015_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-sm shadow-slate-200 mb-4 text-slate-900 transition-transform duration-200 hover:scale-105">
            <ShieldCheck className="w-8 h-8 text-slate-900" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mfolks ERP Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manufacturing Operations &amp; Admin Control
          </p>
        </div>

        {/* Secure Login Card */}
        <Card className="border border-slate-200/90 shadow-xl shadow-slate-200/50 bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Sign in to your account
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter your enterprise credentials to access system management
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} autoComplete="off">
            <CardContent className="pt-6 pb-6 space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@mfolks.com"
                    autoComplete="username"
                    required
                    className="pl-10 h-10 text-sm bg-white border-slate-200 focus-visible:ring-slate-900 focus-visible:border-slate-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    className="pl-10 pr-10 h-10 text-sm bg-white border-slate-200 focus-visible:ring-slate-900 focus-visible:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm transition-all duration-150 mt-4 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Console
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Security badge footer */}
        <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <span>Protected with RBAC &amp; JWT Token Rotation</span>
        </div>
      </div>
    </div>
  );
}
