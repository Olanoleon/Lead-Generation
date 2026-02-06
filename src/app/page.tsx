'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, MapPin, Rocket, Stethoscope, Store, ChevronRight, Clock, Bookmark, Plus } from 'lucide-react';

interface RecentSearch {
  id: number;
  industry: string;
  location: string;
  total_leads: number;
  created_at: string;
}

interface SavedCriteria {
  id: number;
  name: string;
  industry: string;
  location: string;
  filters: Record<string, unknown>;
}

const popularTags = [
  'SaaS Companies',
  'Digital Agencies',
  'Real Estate Brokers',
  'Financial Services',
];

const industryIcons: Record<string, typeof Rocket> = {
  'Tech': Rocket,
  'Healthcare': Stethoscope,
  'Retail': Store,
};

export default function SearchPage() {
  const router = useRouter();
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedCriteria, setSavedCriteria] = useState<SavedCriteria[]>([]);

  useEffect(() => {
    // Initialize default user and fetch recent searches
    fetch('/api/users').then(() => {
      fetchRecentSearches();
    });
  }, []);

  const fetchRecentSearches = async () => {
    try {
      const res = await fetch('/api/searches?limit=3');
      const data = await res.json();
      setRecentSearches(data.data || []);
    } catch (error) {
      console.error('Failed to fetch recent searches:', error);
    }
  };

  const handleSearch = async () => {
    if (!industry.trim() || !location.trim()) {
      alert('Please enter both industry and location');
      return;
    }

    setIsLoading(true);
    
    try {
      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, location }),
      });
      
      const search = await res.json();
      router.push(`/search/${search.id}`);
    } catch (error) {
      console.error('Failed to create search:', error);
      alert('Failed to start search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSearch = (search: RecentSearch) => {
    setIndustry(search.industry);
    setLocation(search.location);
  };

  const handleTagClick = (tag: string) => {
    setIndustry(tag);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getIndustryIcon = (industry: string) => {
    const key = Object.keys(industryIcons).find(k => 
      industry.toLowerCase().includes(k.toLowerCase())
    );
    return key ? industryIcons[key] : Building2;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Lead Discovery</h1>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" />
            Export Leads
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Find Your Next Lead</h2>
          <p className="text-gray-600">Search across millions of verified business profiles worldwide.</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex gap-4 mb-4">
            {/* Industry Input */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Software, Manufacturing, Healthcare"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Location Input */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., New York, CA, Austin"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-5 h-5" />
                {isLoading ? 'Searching...' : 'Search Leads'}
              </button>
            </div>
          </div>

          {/* Popular Tags */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">POPULAR:</span>
            {popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Searches & Saved Criteria */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Searches */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Recent Searches</h3>
              </div>
              <button className="text-sm text-primary-600 hover:text-primary-700">Clear all</button>
            </div>

            {recentSearches.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No recent searches yet</p>
            ) : (
              <div className="space-y-3">
                {recentSearches.map((search) => {
                  const IconComponent = getIndustryIcon(search.industry);
                  return (
                    <button
                      key={search.id}
                      onClick={() => handleQuickSearch(search)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{search.industry}</p>
                          <p className="text-sm text-gray-500">
                            {search.location} • {search.total_leads.toLocaleString()} results
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pinned Criteria */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Pinned Criteria</h3>
              </div>
              <button className="text-sm text-primary-600 hover:text-primary-700">Manage pins</button>
            </div>

            {savedCriteria.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  Save your current search filters to access them instantly later.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedCriteria.map((criteria) => (
                  <button
                    key={criteria.id}
                    onClick={() => {
                      setIndustry(criteria.industry || '');
                      setLocation(criteria.location || '');
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{criteria.name}</p>
                      <p className="text-sm text-gray-500">
                        {criteria.industry} • {criteria.location}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="flex justify-center gap-16 mt-12 pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">45M+</p>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Global Companies</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">120M+</p>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Verified Emails</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">200+</p>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Countries Covered</p>
          </div>
        </div>
      </div>
    </div>
  );
}
