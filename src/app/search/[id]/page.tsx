'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Filter, Search, Mail, Phone, Linkedin, Globe, Building2, MapPin, Users, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

interface Lead {
  id: number;
  company_name: string | null;
  contact_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  company_size: string | null;
  created_at: string;
}

interface SearchIteration {
  id: number;
  industry: string;
  location: string;
  status: string;
  total_leads: number;
  created_at: string;
}

export default function SearchDetailPage() {
  const params = useParams();
  const searchId = parseInt(params.id as string);
  
  const [search, setSearch] = useState<SearchIteration | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSearchDetails();
  }, [searchId]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredLeads(leads.filter(lead => 
        lead.company_name?.toLowerCase().includes(query) ||
        lead.contact_name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query)
      ));
    } else {
      setFilteredLeads(leads);
    }
  }, [searchQuery, leads]);

  const fetchSearchDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch search iteration details
      const searchRes = await fetch(`/api/searches/${searchId}`);
      
      if (!searchRes.ok) {
        const errorData = await searchRes.json();
        throw new Error(errorData.error || `Failed to fetch search (${searchRes.status})`);
      }
      
      const searchData = await searchRes.json();
      
      // Validate that we got proper search data
      if (!searchData || !searchData.industry || !searchData.location) {
        console.error('Invalid search data received:', searchData);
        throw new Error('Invalid search data - missing industry or location');
      }
      
      setSearch(searchData);

      // Fetch leads for this search
      const leadsRes = await fetch(`/api/leads?searchId=${searchId}`);
      const leadsData = await leadsRes.json();
      
      if (leadsData.data && leadsData.data.length > 0) {
        setLeads(leadsData.data);
        setFilteredLeads(leadsData.data);
      } else if (searchData.status === 'processing') {
        // Auto-generate leads using Serper API if none exist
        await generateLeads(searchData);
      }
    } catch (error) {
      console.error('Failed to fetch search details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load search details');
    } finally {
      setIsLoading(false);
    }
  };

  const generateLeads = async (searchData: SearchIteration) => {
    setIsGenerating(true);
    setError(null);
    try {
      // Call Serper API to search Google for leads
      const searchRes = await fetch('/api/search-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: searchData.industry,
          location: searchData.location,
        }),
      });

      if (!searchRes.ok) {
        const errorData = await searchRes.json();
        throw new Error(errorData.error || 'Failed to search for leads');
      }

      const searchResultData = await searchRes.json();
      
      if (!searchResultData.leads || searchResultData.leads.length === 0) {
        setError('No leads found for this search criteria. Try broader terms.');
        // Update search status to completed even with no results
        await fetch(`/api/searches/${searchId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        });
        return;
      }

      // Save leads to database
      const saveRes = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId: searchId,
          leads: searchResultData.leads,
        }),
      });
      
      if (saveRes.ok) {
        // Refresh data to show saved leads
        const leadsRes = await fetch(`/api/leads?searchId=${searchId}`);
        const leadsData = await leadsRes.json();
        setLeads(leadsData.data || []);
        setFilteredLeads(leadsData.data || []);
        
        // Update search record
        const searchRes = await fetch(`/api/searches/${searchId}`);
        const updatedSearch = await searchRes.json();
        setSearch(updatedSearch);
      }
    } catch (error) {
      console.error('Failed to generate leads:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate leads');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToCSV = () => {
    if (leads.length === 0) return;
    
    const headers = ['Company', 'Contact', 'Title', 'Email', 'Phone', 'LinkedIn', 'Website', 'Industry', 'Location', 'Company Size'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        `"${lead.company_name || ''}"`,
        `"${lead.contact_name || ''}"`,
        `"${lead.job_title || ''}"`,
        `"${lead.email || ''}"`,
        `"${lead.phone || ''}"`,
        `"${lead.linkedin_url || ''}"`,
        `"${lead.website || ''}"`,
        `"${lead.industry || ''}"`,
        `"${lead.location || ''}"`,
        `"${lead.company_size || ''}"`,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads-${search?.industry}-${search?.location}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Lead Results</h1>
              <p className="text-sm text-gray-500">
                {search?.industry} • {search?.location}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(search?.status === 'processing' || leads.length === 0) && (
              <button
                onClick={() => search && generateLeads(search)}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Finding Contacts...' : 'Find Contacts'}
              </button>
            )}
            <button
              onClick={exportToCSV}
              disabled={leads.length === 0}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
                <p className="text-sm text-gray-500">Total Leads</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {leads.filter(l => l.email).length}
                </p>
                <p className="text-sm text-gray-500">With Email</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Linkedin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {leads.filter(l => l.linkedin_url).length}
                </p>
                <p className="text-sm text-gray-500">With LinkedIn</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {leads.filter(l => l.phone).length}
                </p>
                <p className="text-sm text-gray-500">With Phone</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="p-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads by company, name, or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filteredLeads.length === 0 && !isGenerating ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">
                {error ? 'No leads found for this criteria' : 'Ready to fetch leads'}
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Search for "{search?.industry}" contacts in "{search?.location}" with LinkedIn profiles, emails, or phone numbers
              </p>
              <button
                onClick={() => search && generateLeads(search)}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Finding Contacts...' : 'Find Contacts'}
              </button>
            </div>
          ) : isGenerating ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Searching for leads...</p>
              <p className="text-sm text-gray-400 mt-2">Finding companies and discovering contacts with LinkedIn, email, and phone</p>
              <p className="text-xs text-gray-300 mt-1">This may take 15-30 seconds</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LinkedIn</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white font-semibold">
                            {lead.company_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{lead.company_name}</p>
                            {lead.website && (
                              <a 
                                href={lead.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                              >
                                <Globe className="w-3 h-3" />
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{lead.contact_name}</p>
                        <p className="text-sm text-gray-500">{lead.job_title}</p>
                      </td>
                      <td className="px-6 py-4">
                        {lead.email ? (
                          <a 
                            href={`mailto:${lead.email}`}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
                          >
                            <Mail className="w-4 h-4 text-gray-400" />
                            {lead.email}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {lead.phone ? (
                          <a 
                            href={`tel:${lead.phone}`}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
                          >
                            <Phone className="w-4 h-4 text-gray-400" />
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {lead.linkedin_url ? (
                          <a 
                            href={lead.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100"
                          >
                            <Linkedin className="w-4 h-4" />
                            Profile
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {lead.location}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          <Building2 className="w-3 h-3" />
                          {lead.company_size || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
