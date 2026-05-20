"use client";

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, User, Mail, Phone, Lock } from 'lucide-react';

const COUNTRY_CODES = [
  { value: '+91', label: '🇮🇳 +91' },
  { value: '+1', label: '🇺🇸 +1' },
  { value: '+44', label: '🇬🇧 +44' },
  { value: '+971', label: '🇦🇪 +971' },
  { value: '+966', label: '🇸🇦 +966' },
  { value: '+65', label: '🇸🇬 +65' },
  { value: '+60', label: '🇲🇾 +60' },
  { value: '+61', label: '🇦🇺 +61' },
  { value: '+64', label: '🇳🇿 +64' },
  { value: '+27', label: '🇿🇦 +27' },
  { value: '+33', label: '🇫🇷 +33' },
  { value: '+49', label: '🇩🇪 +49' },
  { value: '+39', label: '🇮🇹 +39' },
  { value: '+34', label: '🇪🇸 +34' },
  { value: '+31', label: '🇳🇱 +31' },
  { value: '+32', label: '🇧🇪 +32' },
  { value: '+41', label: '🇨🇭 +41' },
  { value: '+46', label: '🇸🇪 +46' },
  { value: '+47', label: '🇳🇴 +47' },
  { value: '+45', label: '🇩🇰 +45' },
  { value: '+358', label: '🇫🇮 +358' },
  { value: '+351', label: '🇵🇹 +351' },
  { value: '+353', label: '🇮🇪 +353' },
  { value: '+48', label: '🇵🇱 +48' },
  { value: '+420', label: '🇨🇿 +420' },
  { value: '+36', label: '🇭🇺 +36' },
  { value: '+40', label: '🇷🇴 +40' },
  { value: '+7', label: '🇷🇺 +7' },
  { value: '+81', label: '🇯🇵 +81' },
  { value: '+82', label: '🇰🇷 +82' },
  { value: '+86', label: '🇨🇳 +86' },
  { value: '+852', label: '🇭🇰 +852' },
  { value: '+886', label: '🇹🇼 +886' },
  { value: '+66', label: '🇹🇭 +66' },
  { value: '+62', label: '🇮🇩 +62' },
  { value: '+63', label: '🇵🇭 +63' },
  { value: '+84', label: '🇻🇳 +84' },
  { value: '+880', label: '🇧🇩 +880' },
  { value: '+94', label: '🇱🇰 +94' },
  { value: '+92', label: '🇵🇰 +92' },
  { value: '+977', label: '🇳🇵 +977' },
  { value: '+95', label: '🇲🇲 +95' },
  { value: '+855', label: '🇰🇭 +855' },
  { value: '+856', label: '🇱🇦 +856' },
  { value: '+673', label: '🇧🇳 +673' },
  { value: '+670', label: '🇹🇱 +670' },
];

function parsePhoneForEdit(fullPhone) {
  const str = (fullPhone || '').trim();
  if (!str) return { country_code: '+91', phone: '' };
  if (!str.startsWith('+')) return { country_code: '+91', phone: str.replace(/\D/g, '') };
  const codes = COUNTRY_CODES.map((c) => c.value).sort((a, b) => b.length - a.length);
  for (const code of codes) {
    if (str.startsWith(code)) {
      const rest = str.slice(code.length).replace(/\D/g, '');
      return { country_code: code, phone: rest };
    }
  }
  return { country_code: '+91', phone: str.replace(/\D/g, '') };
}

export default function UserModal({ isOpen, onClose, onSave, user = null, mode = 'add' }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    country_code: '+91',
    phone: '',
    child_name: '',
    child_age: '',
    password: '',
    role: 'client',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && user) {
        const fullPhone = user.phone || user.phone_number || user.profile?.phone_number || '';
        const { country_code, phone } = parsePhoneForEdit(fullPhone);
        let firstName = '';
        let lastName = '';
        if (user.name) {
          const nameParts = user.name.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        } else {
          firstName = user.firstName || user.first_name || '';
          lastName = user.lastName || user.last_name || '';
        }
        const profile = user.profile || user;
        setFormData({
          firstName,
          lastName,
          email: user.email || '',
          country_code,
          phone,
          child_name: profile.child_name || '',
          child_age: profile.child_age != null ? String(profile.child_age) : '',
          password: '',
          role: user.role || 'client',
          is_active: user.is_active !== false
        });
      } else {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          country_code: '+91',
          phone: '',
          child_name: '',
          child_age: '',
          password: '',
          role: 'client',
          is_active: true
        });
      }
      setError('');
      setShowPassword(false);
    }
  }, [isOpen, user, mode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.email) {
        setError('Please fill in all required fields (First Name, Email)');
        setLoading(false);
        return;
      }

      // For add mode, password is required
      if (mode === 'add' && !formData.password) {
        setError('Password is required for new users');
        setLoading(false);
        return;
      }

      // Transform form data to match API expectations
      const resolvedRole =
        mode === 'edit' && user && user.role ? user.role : 'client';

      const fullPhone = (formData.country_code || '') + (formData.phone || '').replace(/\D/g, '');
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName || '',
        email: formData.email.trim().toLowerCase(),
        phone: fullPhone,
        child_name: formData.child_name?.trim() || undefined,
        child_age: formData.child_age !== '' ? formData.child_age : undefined,
        role: resolvedRole,
        is_active: formData.is_active,
        ...(mode === 'add' && { password: formData.password }),
        ...(mode === 'edit' && formData.password?.trim() && { password: formData.password.trim() }),
        ...(mode === 'edit' && user && { id: user.id })
      };

      await onSave(userData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save user');
      console.error('Error saving user:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-end px-6 py-3 border-b border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="John"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              Phone
            </label>
            <div className="flex">
              <select
                value={formData.country_code}
                onChange={(e) => setFormData((prev) => ({ ...prev, country_code: e.target.value }))}
                className="px-3 py-2.5 border border-slate-200 rounded-l-lg text-sm bg-slate-50 focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545] min-w-[7rem]"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                placeholder="9876543210"
                className="flex-1 px-3 py-2.5 border border-slate-200 border-l-0 rounded-r-lg text-sm focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Child Name <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="child_name"
                value={formData.child_name}
                onChange={handleChange}
                placeholder="Child's name"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Child Age <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                name="child_age"
                value={formData.child_age}
                onChange={handleChange}
                min={1}
                max={18}
                placeholder="1–18"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545]"
              />
            </div>
          </div>

          {mode === 'add' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                <Lock className="w-3.5 h-3.5 inline mr-1" />
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
            </div>
          )}

          {mode === 'edit' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                <Lock className="w-3.5 h-3.5 inline mr-1" />
                New Password (leave blank to keep current)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Minimum 6 characters (optional)</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 rounded border-slate-300 text-[#025545] focus:ring-[#025545]/20"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Active account
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-700 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#025545] text-white rounded-lg text-sm font-medium hover:bg-[#012f23] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : mode === 'add' ? 'Add User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



































