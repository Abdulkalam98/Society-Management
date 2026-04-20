// components/layout/Topbar.tsx
'use client';
import React from 'react';
import { Menu, LogOut, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 hidden sm:block">
          {user?.role === 'ADMIN' ? 'Admin Portal' : 'My Account'}
        </h1>
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="flex items-center gap-2 hidden sm:flex">
              <span className="text-sm font-medium text-gray-700 max-w-[160px] truncate">
                {user.email}
              </span>
              <RoleBadge role={user.role} />
            </div>
            <div className="w-px h-6 bg-gray-200 hidden sm:block" aria-hidden="true" />
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void logout()}
          leftIcon={<LogOut className="w-4 h-4" />}
          aria-label="Log out"
        >
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
