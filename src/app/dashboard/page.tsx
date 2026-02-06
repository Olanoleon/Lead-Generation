'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, TrendingUp, Globe, History, Filter, Plus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface SearchIteration {
  id: number;
  industry: string;
  location: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_leads: number;
  created_at: string;
}

interface Stats {
  totalLeads: number;
  totalSearches: number;
  topIndustry: string;
  growthPercent: number;
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-600',
  processing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const industryColors: Record<string, string> = {
  'Real Estate': 'bg-blue-100 text-blue-700',
  'SaaS': 'bg-purple-100 text-purple-700',
  'Healthcare': 'bg-green-100 text-green-700',
  'Finance': 'bg-yellow-100 text-yellow-700',
  'Logistics': 'bg-orange-100 text-orange-700',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [searches, setSearches] = useState<SearchIteration[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const itemsPerPage = 5;

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, searchesRes] = await Promise.all([
        fetch('/api/stats'),
        fetch(`/api/searches?limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`)
      ]);
      
      const statsData = await statsRes.json();
      const searchesData = await searchesRes.json();
      
      setStats(statsData);
      setSearches(searchesData.data || []);
      setTotalResults(searchesData.total || 0);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getIndustryColor = (industry: string) => {
    const key = Object.keys(industryColors).find(k => 
      industry.toLowerCase().includes(k.toLowerCase())
    );
    return key ? industryColors[key] : 'bg-gray-100 text-gray-700';
  };

  const totalPages = Math.ceil(totalResults / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard Overview</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search iterations..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-64"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                A
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Alex Rivera</p>
                <p className="text-xs text-gray-500">Pro Plan</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              {stats && stats.growthPercent > 0 && (
                <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  +{stats.growthPercent}%
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-4">Total Leads Generated</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.totalLeads?.toLocaleString() || '0'}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-pink-600" />
            </div>
            <p className="text-sm text-gray-500 mt-4">Successful Industry</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.topIndustry || 'N/A'}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Global
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-4">Credits Remaining</p>
            <p className="text-3xl font-bold text-gray-900">12,400</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 mt-4">Total Search Runs</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.totalSearches || '0'}
            </p>
          </div>
        </div>

        {/* Search History Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Search History</h2>
                <p className="text-sm text-gray-500">Manage and preview your previous lead generation runs</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading...</p>
            </div>
          ) : searches.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">No search history yet</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Search
              </Link>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Industry</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Leads</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {searches.map((search) => (
                    <tr key={search.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(search.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getIndustryColor(search.industry)}`}>
                          {search.industry}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {search.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {search.total_leads.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusColors[search.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            search.status === 'completed' ? 'bg-green-500' :
                            search.status === 'processing' ? 'bg-yellow-500' :
                            search.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                          }`}></span>
                          {search.status.charAt(0).toUpperCase() + search.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/search/${search.id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            search.status === 'completed'
                              ? 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} results
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-primary-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* New Search Button */}
        <Link
          href="/"
          className="fixed bottom-8 left-72 flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Search
        </Link>
      </div>
    </div>
  );
}
