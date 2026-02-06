'use client';

import { Settings, User, Bell, Shield } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      </header>

      <div className="p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Profile</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  defaultValue="Alex Rivera"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  defaultValue="alex@company.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-yellow-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-gray-700">Email notifications for completed searches</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 text-primary-600 rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-gray-700">Weekly lead generation reports</span>
                <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" />
              </label>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Security</h2>
            </div>
            
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Change Password
            </button>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
