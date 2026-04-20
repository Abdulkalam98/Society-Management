// app/(auth)/layout.tsx — Auth pages layout (centered card)
import React from 'react';
import { Building } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-2xl mb-4">
            <Building className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Society Manager</h1>
          <p className="text-primary-300 text-sm mt-1">Residential Expense Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
