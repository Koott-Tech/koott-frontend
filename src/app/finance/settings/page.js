'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { financeApi } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';

export default function FinanceSettings() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [sourceName, setSourceName] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }
      
      if (!hasRole('finance') && !hasRole('admin') && !hasRole('superadmin')) {
        router.push('/');
        return;
      }
      
      loadData();
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [categoriesRes, sourcesRes] = await Promise.all([
        financeApi.getExpenseCategories(),
        financeApi.getIncomeSources()
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data.categories || []);
      }
      if (sourcesRes.success) {
        setSources(sourcesRes.data.sources || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await financeApi.createExpenseCategory({ name: categoryName });
      if (response.success) {
        setShowCategoryModal(false);
        setCategoryName('');
        loadData();
      } else {
        alert(response.message || 'Failed to create category');
      }
    } catch (err) {
      console.error('Failed to create category:', err);
      alert('Failed to create category. Please try again.');
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    try {
      const response = await financeApi.createIncomeSource({ name: sourceName });
      if (response.success) {
        setShowSourceModal(false);
        setSourceName('');
        loadData();
      } else {
        alert(response.message || 'Failed to create source');
      }
    } catch (err) {
      console.error('Failed to create source:', err);
      alert('Failed to create source. Please try again.');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#025545' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 lg:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-2 sm:mb-3">
          <div role="heading" aria-level="2" className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-1">Settings & Configuration</div>
          <p className="text-xs sm:text-sm text-gray-600">Manage expense categories and income sources</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Expense Categories */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Expense Categories</h3>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </div>
            <div className="p-6">
              {categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{category.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No categories found</p>
              )}
            </div>
          </div>

          {/* Income Sources */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>Income Sources</h3>
              <button
                onClick={() => setShowSourceModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Source
              </button>
            </div>
            <div className="p-6">
              {sources.length > 0 ? (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{source.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No sources found</p>
              )}
            </div>
          </div>
        </div>

        {/* Add Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Add Expense Category</h2>
                  <button
                    onClick={() => setShowCategoryModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddCategory} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors"
                  >
                    Add Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Source Modal */}
        {showSourceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Add Income Source</h2>
                  <button
                    onClick={() => setShowSourceModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddSource} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Source Name</label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors"
                  >
                    Add Source
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSourceModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

