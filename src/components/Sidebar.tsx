'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, LayoutDashboard, Bookmark, Settings, HelpCircle, Zap } from 'lucide-react';

const navItems = [
  { name: 'Search', href: '/', icon: Search },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Saved Criteria', href: '/saved', icon: Bookmark },
];

const accountItems = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Support', href: '/support', icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">LeadGen Pro</h1>
            <p className="text-xs text-gray-500">Discovery Engine</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Account Section */}
        <div className="mt-8">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Account
          </p>
          <ul className="space-y-1">
            {accountItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
            A
          </div>
          <div>
            <p className="font-medium text-gray-900">Alex Rivera</p>
            <p className="text-xs text-gray-500">Internal User</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
