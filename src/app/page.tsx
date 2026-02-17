'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Building2, MapPin, Rocket, Stethoscope, Store, ChevronRight, Clock, Bookmark, Plus, Building, Users } from 'lucide-react';

interface RecentSearch {
  id: number;
  industry: string;
  location: string;
  company_name: string;
  search_type: string;
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

const popularIndustries = [
  'SaaS Companies',
  'Digital Agencies',
  'Real Estate Brokers',
  'Financial Services',
];

const popularCompanies = [
  'Salesforce',
  'HubSpot',
  'Stripe',
  'Shopify',
];

type SearchMode = 'industry' | 'company';

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchMode, setSearchMode] = useState<SearchMode>('industry');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    // Pre-fill from URL params (when coming from saved criteria)
    const paramIndustry = searchParams.get('industry');
    const paramLocation = searchParams.get('location');
    if (paramIndustry) setIndustry(paramIndustry);
    if (paramLocation) setLocation(paramLocation);

    // Initialize default user and fetch recent searches
    fetch('/api/users').then(() => {
      fetchRecentSearches();
    });
  }, []);

  const fetchRecentSearches = async () => {
    try {
      const res = await fetch('/api/searches?limit=5');
      const data = await res.json();
      setRecentSearches(data.data || []);
    } catch (error) {
      console.error('Failed to fetch recent searches:', error);
    }
  };

  const handleIndustrySearch = async () => {
    if (!industry.trim() || !location.trim()) {
      alert('Please enter both industry and location');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          industry, 
          location, 
          searchType: 'industry' 
        }),
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

  const handleCompanySearch = async () => {
    if (!companyName.trim()) {
      alert('Please enter a company name');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyName, 
          location: companyLocation || '',
          searchType: 'company' 
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create search');
      }
      
      const search = await res.json();
      
      if (!search.id) {
        throw new Error('No search ID returned');
      }
      
      router.push(`/search/${search.id}`);
    } catch (error) {
      console.error('Failed to create search:', error);
      alert('Failed to start search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSearch = (search: RecentSearch) => {
    if (search.search_type === 'company') {
      setSearchMode('company');
      setCompanyName(search.company_name || '');
      setCompanyLocation(search.location || '');
    } else {
      setSearchMode('industry');
      setIndustry(search.industry || '');
      setLocation(search.location || '');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
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
          <p className="text-gray-600">Search by industry or target a specific company to discover contacts.</p>
        </div>

        {/* Search Mode Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 rounded-xl p-1 inline-flex">
            <button
              onClick={() => setSearchMode('industry')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                searchMode === 'industry'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Industry & Location
            </button>
            <button
              onClick={() => setSearchMode('company')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                searchMode === 'company'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building className="w-4 h-4" />
              Company Search
            </button>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          {searchMode === 'industry' ? (
            /* Industry Search Mode */
            <>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleIndustrySearch()}
                      placeholder="e.g., Software, Manufacturing, Healthcare"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleIndustrySearch()}
                      placeholder="e.g., New York, CA, Austin"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleIndustrySearch}
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
                {popularIndustries.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setIndustry(tag)}
                    className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Company Search Mode */
            <>
              <div className="flex gap-4 mb-4">
                <div className="flex-[2]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCompanySearch()}
                      placeholder="e.g., Salesforce, HubSpot, Stripe"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location <span className="text-gray-400">(optional)</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={companyLocation}
                      onChange={(e) => setCompanyLocation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCompanySearch()}
                      placeholder="e.g., San Francisco"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleCompanySearch}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Users className="w-5 h-5" />
                    {isLoading ? 'Searching...' : 'Find Contacts'}
                  </button>
                </div>
              </div>

              {/* Popular Companies */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">TRY:</span>
                {popularCompanies.map((name) => (
                  <button
                    key={name}
                    onClick={() => setCompanyName(name)}
                    className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Mode Description */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            {searchMode === 'industry' ? (
              <>
                <MapPin className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Industry & Location Search</p>
                  <p className="text-sm text-blue-700">Finds multiple companies in a specific industry and location, then discovers contacts at each company with LinkedIn profiles, emails, or phone numbers.</p>
                </div>
              </>
            ) : (
              <>
                <Building className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Company Search</p>
                  <p className="text-sm text-blue-700">Targets a specific company to find all discoverable contacts — decision makers, leadership, and team members with LinkedIn profiles, emails, or phone numbers.</p>
                </div>
              </>
            )}
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
            </div>

            {recentSearches.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No recent searches yet</p>
            ) : (
              <div className="space-y-2">
                {recentSearches.map((search) => (
                  <button
                    key={search.id}
                    onClick={() => handleQuickSearch(search)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        search.search_type === 'company' 
                          ? 'bg-purple-50' 
                          : 'bg-primary-50'
                      }`}>
                        {search.search_type === 'company' ? (
                          <Building className={`w-5 h-5 text-purple-600`} />
                        ) : (
                          <MapPin className={`w-5 h-5 text-primary-600`} />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">
                          {search.search_type === 'company' 
                            ? search.company_name 
                            : search.industry}
                        </p>
                        <p className="text-sm text-gray-500">
                          {search.search_type === 'company' ? 'Company' : search.location} 
                          {' '} • {search.total_leads} contacts
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
                  </button>
                ))}
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
              <a href="/saved" className="text-sm text-primary-600 hover:text-primary-700">Manage pins</a>
            </div>

            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                Save your current search filters to access them instantly later.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="flex justify-center gap-16 mt-12 pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">2</p>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Search Modes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">Google</p>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Search Powered</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">LinkedIn</p>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Profiles Discovered</p>
          </div>
        </div>
      </div>
    </div>
  );
}
