'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit, Trash2, MoreVertical, X, Loader2, AlertTriangle } from 'lucide-react';
import { financeApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function FinanceIncome() {
  const { showError, showSuccess } = useNotification();
  const [income, setIncome] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingIncome, setDeletingIncome] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sources, setSources] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    income_source: '',
    description: '',
    amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const defaultFormData = {
    date: new Date().toISOString().split('T')[0],
    income_source: '',
    description: '',
    amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  };

  useEffect(() => {
    loadIncome();
    loadSources();
  }, []);

  const loadIncome = async () => {
    try {
      setIsLoading(true);
      const response = await financeApi.getIncome();
      if (response.success) {
        setIncome(response.data.income || []);
      } else {
        showError(response.message || 'Failed to load income', 'Load Error');
      }
    } catch (err) {
      console.error('Failed to load income:', err);
      showError('Failed to load income', 'Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSources = async () => {
    try {
      const response = await financeApi.getIncomeSources();
      if (response.success) {
        setSources(response.data.sources || []);
      }
    } catch (err) {
      console.error('Failed to load sources:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await financeApi.createIncome(formData);
      if (response.success) {
        setShowAddModal(false);
        setFormData(defaultFormData);
        loadIncome();
        showSuccess('Income entry added successfully', 'Success');
      } else {
        showError(response.message || 'Failed to create income entry', 'Error');
      }
    } catch (err) {
      console.error('Failed to create income:', err);
      showError('Failed to create income entry', 'Error');
    }
  };

  const handleEdit = (item) => {
    setEditingIncome(item);
    setFormData({
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      income_source: item.income_source || '',
      description: item.description || '',
      amount: item.amount || '',
      payment_method: item.payment_method || 'bank_transfer',
      reference_number: item.reference_number || '',
      notes: item.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await financeApi.updateIncome(editingIncome.id, formData);
      if (response.success) {
        setShowEditModal(false);
        setEditingIncome(null);
        setFormData(defaultFormData);
        loadIncome();
        showSuccess('Income entry updated successfully', 'Success');
      } else {
        showError(response.message || 'Failed to update income entry', 'Error');
      }
    } catch (err) {
      console.error('Failed to update income:', err);
      showError('Failed to update income entry', 'Error');
    }
  };

  const handleDeleteClick = (item) => {
    setDeletingIncome(item);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingIncome) return;
    setIsDeleting(true);
    try {
      const response = await financeApi.deleteIncome(deletingIncome.id);
      if (response.success) {
        setShowDeleteConfirm(false);
        setDeletingIncome(null);
        loadIncome();
        showSuccess('Income entry deleted successfully', 'Success');
      } else {
        showError(response.message || 'Failed to delete income entry', 'Error');
      }
    } catch (err) {
      console.error('Failed to delete income:', err);
      showError('Failed to delete income entry', 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && income.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  const totalIncome = income.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-semibold text-gray-900">Income</div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-[#025545] text-white text-sm font-medium rounded-lg hover:bg-[#012f23] transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </button>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Income</p>
          </div>
          <div className="text-xl font-semibold text-gray-900">
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center">
                      <div className="inline-flex flex-col items-center gap-3 text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin text-[#025545]" />
                        <span className="text-sm font-medium">Processing...</span>
                      </div>
                    </td>
                  </tr>
                ) : income.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2 text-sm font-semibold text-gray-900">No income entries found</div>
                      <p className="mt-1 text-sm text-gray-500">Add your first income entry to get started.</p>
                    </td>
                  </tr>
                ) : (
                  income.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.income_source}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₹{(item.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {item.payment_method?.replace('_', ' ') || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleEdit(item)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(item)} 
                              className="cursor-pointer text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Income Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-200/80">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900 tracking-tight">Add New Income</div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Income Source</label>
                  <select value={formData.income_source} onChange={(e) => setFormData({ ...formData, income_source: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent">
                    <option value="">Select source</option>
                    {sources.map((source) => (<option key={source.id} value={source.name}>{source.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Amount</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required min="0" step="0.01" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Payment Method</label>
                  <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Reference Number</label>
                  <input type="text" value={formData.reference_number} onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#025545] rounded-lg hover:bg-[#012f23] transition-colors">Add Income</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Income Modal */}
        {showEditModal && editingIncome && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-200/80">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Edit className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900 tracking-tight">Edit Income Entry</div>
                </div>
                <button onClick={() => { setShowEditModal(false); setEditingIncome(null); setFormData(defaultFormData); }} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Income Source</label>
                  <select value={formData.income_source} onChange={(e) => setFormData({ ...formData, income_source: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent">
                    <option value="">Select source</option>
                    {sources.map((source) => (<option key={source.id} value={source.name}>{source.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Amount</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required min="0" step="0.01" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Payment Method</label>
                  <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Reference Number</label>
                  <input type="text" value={formData.reference_number} onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent" />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowEditModal(false); setEditingIncome(null); setFormData(defaultFormData); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#025545] rounded-lg hover:bg-[#012f23] transition-colors">Update Income</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && deletingIncome && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/80">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900 tracking-tight">Delete Income Entry</div>
                </div>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletingIncome(null); }}
                  disabled={isDeleting}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this income entry? This action cannot be undone.
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Source</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {deletingIncome.income_source || '—'}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Amount</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900">
                        ₹{(deletingIncome.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    {deletingIncome.description && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Description</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                          {deletingIncome.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/30">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletingIncome(null); }}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
