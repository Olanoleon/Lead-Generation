'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, Plus, Trash2, Edit2, Search, ChevronRight } from 'lucide-react';

interface SavedCriteria {
  id: number;
  name: string;
  industry: string | null;
  location: string | null;
  filters: Record<string, unknown>;
  created_at: string;
}

export default function SavedCriteriaPage() {
  const [criteria, setCriteria] = useState<SavedCriteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<SavedCriteria | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchCriteria();
  }, []);

  const fetchCriteria = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/criteria');
      if (res.ok) {
        const data = await res.json();
        setCriteria(data);
      }
    } catch (error) {
      console.error('Failed to fetch criteria:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }

    try {
      const method = editingCriteria ? 'PATCH' : 'POST';
      const url = editingCriteria ? `/api/criteria/${editingCriteria.id}` : '/api/criteria';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, industry, location }),
      });

      if (res.ok) {
        await fetchCriteria();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save criteria:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this saved criteria?')) return;

    try {
      const res = await fetch(`/api/criteria/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCriteria();
      }
    } catch (error) {
      console.error('Failed to delete criteria:', error);
    }
  };

  const handleEdit = (item: SavedCriteria) => {
    setEditingCriteria(item);
    setName(item.name);
    setIndustry(item.industry || '');
    setLocation(item.location || '');
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingCriteria(null);
    setName('');
    setIndustry('');
    setLocation('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Saved Criteria</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Criteria
          </button>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Description */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bookmark className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 mb-1">Save Your Search Criteria</h2>
                <p className="text-gray-600">
                  Create and manage saved search criteria for quick access. Pin your most used industry and location combinations to speed up your lead generation workflow.
                </p>
              </div>
            </div>
          </div>

          {/* Criteria List */}
          <div className="bg-white rounded-xl border border-gray-200">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading...</p>
              </div>
            ) : criteria.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No saved criteria yet</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Criteria
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {criteria.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                        <Bookmark className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">
                          {item.industry || 'Any industry'} • {item.location || 'Any location'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Created {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/?industry=${encodeURIComponent(item.industry || '')}&location=${encodeURIComponent(item.location || '')}`}
                        className="flex items-center gap-2 ml-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        <Search className="w-4 h-4" />
                        Use
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingCriteria ? 'Edit Criteria' : 'New Saved Criteria'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Tech Startups Austin"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Software, Healthcare"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., New York, CA"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingCriteria ? 'Save Changes' : 'Create Criteria'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
