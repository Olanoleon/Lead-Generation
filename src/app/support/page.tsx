'use client';

import { HelpCircle, MessageCircle, Book, Mail } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Support</h1>
      </header>

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How can we help?</h2>
            <p className="text-gray-600">Find answers to common questions or get in touch with our support team.</p>
          </div>

          {/* Support Options */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Book className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Documentation</h3>
              <p className="text-sm text-gray-500">Browse our guides and tutorials</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
              <p className="text-sm text-gray-500">Chat with our support team</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-sm text-gray-500">Get help via email</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-6">Frequently Asked Questions</h3>
            
            <div className="space-y-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <span className="font-medium text-gray-900">How do I export my leads?</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="p-4 text-gray-600">
                  After generating leads, click the "Export CSV" button in the lead results view to download all leads as a CSV file.
                </p>
              </details>
              
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <span className="font-medium text-gray-900">How accurate is the contact information?</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="p-4 text-gray-600">
                  Our lead data is regularly verified and updated. Email addresses are validated for deliverability.
                </p>
              </details>
              
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <span className="font-medium text-gray-900">Can I save my search criteria?</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="p-4 text-gray-600">
                  Yes! Use the "Saved Criteria" feature to save frequently used industry and location combinations for quick access.
                </p>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
