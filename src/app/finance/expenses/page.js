'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Plus, Check, X, Edit, Trash2, MoreVertical, Eye } from 'lucide-react';
import { financeApi } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function FinanceExpenses() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [approvingExpenseId, setApprovingExpenseId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('subscription'); // 'subscription' or 'additional'
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    custom_category: '',
    description: '',
    amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
    expense_type: 'subscription'
  });
  const [showCustomCategory, setShowCustomCategory] = useState(false);

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
      
      loadExpenses();
      loadCategories();
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await financeApi.getExpenses({ expenseType: activeTab });
      
      if (response.success) {
        setExpenses(response.data.expenses || []);
      } else {
        setError(response.message || 'Failed to load expenses');
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
      setError('Failed to load expenses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (isAuthenticated() && (hasRole('finance') || hasRole('admin') || hasRole('superadmin')))) {
      loadExpenses();
    }
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      const response = await financeApi.getExpenseCategories();
      if (response.success) {
        setCategories(response.data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data - use custom_category if "Other" is selected
      const submitData = {
        ...formData,
        category: showCustomCategory ? '' : formData.category,
        custom_category: showCustomCategory ? formData.custom_category : ''
      };
      const response = await financeApi.createExpense(submitData);
      if (response.success) {
        setShowAddModal(false);
        setShowCustomCategory(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: '',
          custom_category: '',
          description: '',
          amount: '',
          payment_method: 'bank_transfer',
          reference_number: '',
          notes: '',
          expense_type: activeTab
        });
        loadExpenses();
      } else {
        alert(response.message || 'Failed to create expense');
      }
    } catch (err) {
      console.error('Failed to create expense:', err);
      alert('Failed to create expense. Please try again.');
    }
  };

  const handleApprove = async (expenseId) => {
    try {
      setApprovingExpenseId(expenseId);
      const response = await financeApi.approveExpense(expenseId);
      if (response.success) {
        // Optimistically update the expense in the list without full reload
        setExpenses(prevExpenses => 
          prevExpenses.map(exp => 
            exp.id === expenseId 
              ? { ...exp, status: 'approved', approval_status: 'approved' }
              : exp
          )
        );
      } else {
        alert(response.message || 'Failed to approve expense');
      }
    } catch (err) {
      console.error('Failed to approve expense:', err);
      alert('Failed to approve expense. Please try again.');
    } finally {
      setApprovingExpenseId(null);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    const hasCustomCategory = expense.custom_category && expense.custom_category.trim();
    setShowCustomCategory(hasCustomCategory);
    setFormData({
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      category: hasCustomCategory ? 'other' : (expense.category || ''),
      custom_category: expense.custom_category || '',
      description: expense.description || '',
      amount: expense.amount || '',
      payment_method: expense.payment_method || 'bank_transfer',
      reference_number: expense.reference_number || '',
      notes: expense.notes || '',
      expense_type: expense.expense_type || 'additional'
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Prepare data - use custom_category if "Other" is selected
      const submitData = {
        ...formData,
        category: showCustomCategory ? '' : formData.category,
        custom_category: showCustomCategory ? formData.custom_category : ''
      };
      const response = await financeApi.updateExpense(editingExpense.id, submitData);
      if (response.success) {
        setShowEditModal(false);
        setEditingExpense(null);
        setShowCustomCategory(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: '',
          custom_category: '',
          description: '',
          amount: '',
          payment_method: 'bank_transfer',
          reference_number: '',
          notes: '',
          expense_type: activeTab
        });
        loadExpenses();
      } else {
        alert(response.message || 'Failed to update expense');
      }
    } catch (err) {
      console.error('Failed to update expense:', err);
      alert('Failed to update expense. Please try again.');
    }
  };

  const handleDeleteClick = (expenseId) => {
    setDeletingExpenseId(expenseId);
    setShowDeleteConfirm(true);
  };

  const handleView = (expense) => {
    setViewingExpense(expense);
    setShowViewModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await financeApi.deleteExpense(deletingExpenseId);
      if (response.success) {
        setShowDeleteConfirm(false);
        setDeletingExpenseId(null);
        loadExpenses();
      } else {
        alert(response.message || 'Failed to delete expense');
      }
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense. Please try again.');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#3f2e73' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 lg:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div role="heading" aria-level="2" className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-1">Expense Management</div>
            <p className="text-xs sm:text-sm text-gray-600">Track and manage company expenses</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#3f2e73] text-white rounded-lg hover:bg-[#2d1f52] transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Add Expense
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('subscription')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'subscription'
                      ? 'text-[#3f2e73] border-b-2 border-[#3f2e73] bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Subscription
                </button>
                <button
                  onClick={() => setActiveTab('additional')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'additional'
                      ? 'text-[#3f2e73] border-b-2 border-[#3f2e73] bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Additional
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Description</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenses.length > 0 ? (
                    expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString('en-IN')}
                        </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {expense.display_category || expense.custom_category || expense.category}
                          {expense.expense_type === 'subscription' && expense.history && expense.history.length > 1 && (
                            <span className="ml-2 text-xs text-gray-500" title={`History: ${expense.history.length} months`}>
                              ({expense.history.length} months)
                            </span>
                          )}
                        </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {expense.description}
                        </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">
                          ₹{(expense.amount || 0).toLocaleString('en-IN')}
                        </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {approvingExpenseId === expense.id ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              <div className="h-3 w-3 mr-1 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              Approving...
                            </span>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              (expense.status === 'approved' || expense.approval_status === 'approved') ? 'bg-green-100 text-green-800' :
                              (expense.status === 'pending' || expense.approval_status === 'pending') ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {expense.status || expense.approval_status || 'Pending'}
                            </span>
                          )}
                        </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                                  <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleView(expense)} className="cursor-pointer">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEdit(expense)} className="cursor-pointer">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {(expense.status === 'pending' || expense.approval_status === 'pending') && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleApprove(expense.id)} 
                                      className="cursor-pointer text-green-600"
                                      disabled={approvingExpenseId === expense.id}
                                    >
                                      {approvingExpenseId === expense.id ? (
                                        <>
                                          <div className="h-4 w-4 mr-2 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                          Approving...
                                        </>
                                      ) : (
                                        <>
                                          <Check className="h-4 w-4 mr-2" />
                                          Approve
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(expense.id)} 
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
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No expenses found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
          </>
        )}

        {/* Add Expense Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900" style={{ fontSize: '14px', lineHeight: '1.25rem', letterSpacing: 'normal' }}>Add New Expense</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#3f2e73] text-white rounded-lg hover:bg-[#2d1f52] transition-colors"
                  >
                    Add Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Expense Modal */}
        {showEditModal && editingExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900" style={{ fontSize: '14px', lineHeight: '1.25rem', letterSpacing: 'normal' }}>Edit Expense</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingExpense(null);
                      setFormData({
                        date: new Date().toISOString().split('T')[0],
                        category: '',
                        description: '',
                        amount: '',
                        payment_method: 'bank_transfer',
                        reference_number: '',
                        notes: ''
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expense Type</label>
                  <select
                    value={formData.expense_type}
                    onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  >
                    <option value="subscription">Subscription (Monthly Recurring)</option>
                    <option value="additional">Additional (One-time Investment)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const isOther = e.target.value === 'other';
                      setShowCustomCategory(isOther);
                      setFormData({ 
                        ...formData, 
                        category: isOther ? '' : e.target.value,
                        custom_category: isOther ? formData.custom_category : ''
                      });
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                  {showCustomCategory && (
                    <input
                      type="text"
                      value={formData.custom_category}
                      onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                      placeholder="Enter custom category name"
                      required
                      className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#3f2e73] text-white rounded-lg hover:bg-[#2d1f52] transition-colors"
                  >
                    Update Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingExpense(null);
                      setFormData({
                        date: new Date().toISOString().split('T')[0],
                        category: '',
                        description: '',
                        amount: '',
                        payment_method: 'bank_transfer',
                        reference_number: '',
                        notes: ''
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontSize: '14px', lineHeight: '1.25rem', letterSpacing: 'normal' }}>Delete Expense</h2>
                <p className="text-gray-600 mb-6">Are you sure you want to delete this expense? This action cannot be undone.</p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletingExpenseId(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Expense Details Modal */}
        {showViewModal && viewingExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900" style={{ fontSize: '14px', lineHeight: '1.25rem', letterSpacing: 'normal' }}>Expense Details</h2>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingExpense(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                    <p className="text-sm text-gray-900">
                      {new Date(viewingExpense.date).toLocaleDateString('en-IN', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Expense Type</label>
                    <p className="text-sm text-gray-900 capitalize">
                      {viewingExpense.expense_type === 'subscription' ? 'Subscription (Monthly Recurring)' : 'Additional (One-time Investment)'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                    <p className="text-sm text-gray-900">
                      {viewingExpense.display_category || viewingExpense.custom_category || viewingExpense.category}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      (viewingExpense.status === 'approved' || viewingExpense.approval_status === 'approved') ? 'bg-green-100 text-green-800' :
                      (viewingExpense.status === 'pending' || viewingExpense.approval_status === 'pending') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingExpense.status || viewingExpense.approval_status || 'Pending'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Amount</label>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{(viewingExpense.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Total Amount</label>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{(viewingExpense.total_amount || viewingExpense.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Payment Method</label>
                    <p className="text-sm text-gray-900 capitalize">
                      {viewingExpense.payment_method ? viewingExpense.payment_method.replace('_', ' ') : 'N/A'}
                    </p>
                  </div>
                  {viewingExpense.vendor_supplier && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Vendor/Supplier</label>
                      <p className="text-sm text-gray-900">{viewingExpense.vendor_supplier}</p>
                    </div>
                  )}
                  {viewingExpense.reference_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Reference Number</label>
                      <p className="text-sm text-gray-900">{viewingExpense.reference_number}</p>
                    </div>
                  )}
                </div>
                {viewingExpense.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-sm text-gray-900">{viewingExpense.description}</p>
                  </div>
                )}
                {viewingExpense.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingExpense.notes}</p>
                  </div>
                )}
                {viewingExpense.expense_type === 'subscription' && viewingExpense.history && viewingExpense.history.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Subscription History</label>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <div className="space-y-2">
                        {viewingExpense.history.map((hist, idx) => (
                          <div key={hist.id || idx} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(hist.date).toLocaleDateString('en-IN', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                              {hist.description && (
                                <p className="text-xs text-gray-600 mt-1">{hist.description}</p>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              ₹{(hist.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingExpense(null);
                    }}
                    className="px-4 py-2 bg-[#3f2e73] text-white rounded-lg hover:bg-[#2d1f52] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

