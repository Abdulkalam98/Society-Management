// components/layout/Sidebar.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Bell,
  TrendingUp,
  Tag,
  Building2,
  FileText,
  GitMerge,
  Megaphone,
  X,
  Building,
} from 'lucide-react';

// ─── Nav Items ────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const HOMEOWNER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/dashboard/bills', label: 'My Bills', icon: <Receipt className="w-5 h-5" /> },
  { href: '/dashboard/payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
  { href: '/dashboard/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/admin/expenses', label: 'Expenses', icon: <TrendingUp className="w-5 h-5" /> },
  { href: '/admin/categories', label: 'Categories', icon: <Tag className="w-5 h-5" /> },
  { href: '/admin/flats', label: 'Flats', icon: <Building2 className="w-5 h-5" /> },
  { href: '/admin/reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
  { href: '/admin/reconciliation', label: 'Reconciliation', icon: <GitMerge className="w-5 h-5" /> },
  { href: '/admin/announcements', label: 'Announcements', icon: <Megaphone className="w-5 h-5" /> },
  { href: '/admin/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const navItems = user?.role === 'ADMIN' ? ADMIN_NAV : HOMEOWNER_NAV;

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30',
          'flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navigation sidebar"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Society Manager</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Main navigation">
          <ul className="space-y-1" role="list">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      isActive(item.href) ? 'text-primary-600' : 'text-gray-400'
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info at bottom */}
        {user && (
          <div className="px-4 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}
      </aside>
    </>
  );
}
