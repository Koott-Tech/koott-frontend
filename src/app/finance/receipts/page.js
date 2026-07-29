'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Briefcase,
  Download,
  Plus,
  Trash2,
  ChevronLeft,
  User,
  Calendar,
  CheckCircle,
  Loader2,
  Printer,
  Save,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { financeApi } from '@/lib/backendApi';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtReceipt(n, { decimals = true } = {}) {
  const num = parseFloat(n) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
}

function payoutReceiptDateStr(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function generateReceiptNo(template) {
  const prefix = template === 'salaryCertificate' ? 'KSC' : 'KTP';
  const storageKey = 'koott_receipt_short_number_state';
  const fallback = () => `${prefix}${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`;

  if (typeof localStorage === 'undefined') return fallback();

  try {
    const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const counters = state.counters && typeof state.counters === 'object' ? state.counters : {};
    const used = Array.isArray(state.used) ? state.used : [];
    let nextNumber = Math.max(parseInt(counters[prefix] || '122', 10) + 1, 1);
    let receiptNo = `${prefix}${String(nextNumber).padStart(4, '0')}`;

    while (used.includes(receiptNo)) {
      nextNumber += 1;
      receiptNo = `${prefix}${String(nextNumber).padStart(4, '0')}`;
    }

    const nextState = {
      counters: { ...counters, [prefix]: nextNumber },
      used: [receiptNo, ...used].slice(0, 500),
    };
    localStorage.setItem(storageKey, JSON.stringify(nextState));
    return receiptNo;
  } catch (e) {
    console.error('Error generating receipt number', e);
    return fallback();
  }
}

function safeFilePart(value = 'receipt') {
  return String(value || 'receipt')
    .trim()
    .replace(/[^\w.\-() ]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'receipt';
}

function pdfBytesToBase64(pdfBytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < pdfBytes.length; i += chunkSize) {
    const chunk = pdfBytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function doctorDisplayName(doctor) {
  const name = [doctor?.first_name, doctor?.last_name].filter(Boolean).join(' ').trim();
  return name || doctor?.name || doctor?.email || 'Doctor';
}

function normalizeDoctorRecipient(doctor) {
  return {
    id: `doctor:${doctor.id || doctor.email}`,
    psychologistId: doctor.id || '',
    type: 'doctor',
    name: doctorDisplayName(doctor),
    email: doctor.email || '',
    designation: doctor.designation || doctor.title || 'Consultant Psychologist',
    location: doctor.location || doctor.city || 'Calicut, India',
  };
}

function monthRangeFromDateRaw(dateRaw) {
  const d = dateRaw ? new Date(dateRaw) : new Date();
  const safe = isNaN(d) ? new Date() : d;
  const start = new Date(safe.getFullYear(), safe.getMonth(), 1);
  const end = new Date(safe.getFullYear(), safe.getMonth() + 1, 0);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

function classifySessionForReceipt(row) {
  const raw = `${row?.session_type || ''} ${row?.package_label || ''}`.toLowerCase();
  const isPackage = !!row?.is_package || raw.includes('package');
  const isCouple = !!row?.is_couple || raw.includes('couple') || raw.includes('cpl');
  const isFollowText = raw.includes('follow') || raw.includes('follow-up') || raw.includes('followup');

  if (isPackage) {
    const isPackageFollowUp = row?.is_package_first_for_client === false ||
      (parseInt(row?.package_session_number, 10) || 1) > 1 ||
      isFollowText;
    return {
      payoutType: isPackageFollowUp ? 'Package Follow Up' : 'Package First Session',
      salaryType: isPackageFollowUp ? 'Package Follow Up' : 'Package First Session',
    };
  }

  if (isCouple) {
    const isFollowUp = row?.is_first_session === false || isFollowText;
    return {
      payoutType: isFollowUp ? 'Couple Follow Up' : 'Couple First Session',
      salaryType: isFollowUp ? 'Couple Follow Up' : 'Couple First Session',
    };
  }

  const isFollowUp = row?.is_first_session === false || isFollowText;
  return {
    payoutType: isFollowUp ? 'Individual Follow Up' : 'Individual First Session',
    salaryType: isFollowUp ? 'Individual Follow Up' : 'Individual First Session',
  };
}

function buildReceiptRowsFromProfile(profile, template) {
  const completed = (profile?.sessions || []).filter(row => {
    const status = String(row?.status || '').toLowerCase();
    const payoutStatus = String(row?.payout_status || '').toLowerCase();
    const doctorAmount = parseFloat(row?.doctor_amount || 0) || 0;
    return status === 'completed' && payoutStatus !== 'paid' && doctorAmount > 0;
  });

  const grouped = new Map();
  completed.forEach(row => {
    const type = classifySessionForReceipt(row);
    const unitPrice = Math.round(parseFloat(row?.doctor_amount || 0) || 0);
    const label = template === 'payoutReceipt' ? type.payoutType : type.salaryType;
    const key = `${label}:${unitPrice}`;
    const current = grouped.get(key) || { label, count: 0, unitPrice, amount: 0 };
    current.count += 1;
    current.amount += unitPrice;
    grouped.set(key, current);
  });

  const rows = [...grouped.values()]
    .sort((a, b) => {
      const order = [
        'Individual First Session',
        'Individual Follow Up',
        'Couple First Session',
        'Couple Follow Up',
        'Package First Session',
        'Package Follow Up',
      ];
      return order.indexOf(a.label) - order.indexOf(b.label) || b.unitPrice - a.unitPrice;
    });

  if (template === 'payoutReceipt') {
    return rows.slice(0, 6).map(row => ({
      type: row.label,
      number: String(row.count),
      unitPrice: String(row.unitPrice),
      amount: String(row.amount),
    }));
  }

  return rows.slice(0, 4).map(row => ({
    type: row.label,
    sessions: String(row.count),
    ratePerSession: String(row.unitPrice),
    amount: String(row.amount),
  }));
}



const DEFAULT_PAYOUT_RECEIPT_ROWS = [
  { type: 'Individual First Session', number: '1', unitPrice: '1250', amount: '1250' },
  { type: 'Individual Follow Up', number: '2', unitPrice: '900', amount: '1800' },
  { type: '', number: '', unitPrice: '', amount: '' },
  { type: '', number: '', unitPrice: '', amount: '' },
];

const DEFAULT_PAYOUT_RECEIPT_TYPES = [
  'Individual First Session',
  'Individual Follow Up',
  'Couple First Session',
  'Couple Follow Up',
  'Package First Session',
  'Package Follow Up',
];

const createDefaultPayoutReceiptData = () => ({
  receiptNo: '',
  dateRaw: new Date().toISOString().split('T')[0],
  date: payoutReceiptDateStr(),
  name: '',
  designation: 'Consultant Psychologist',
  location: 'Calicut, India',
  email: '',
  recipientEmail: '',
  tdsPercent: '10',
  rows: DEFAULT_PAYOUT_RECEIPT_ROWS.map(r => ({ ...r })),
});

const SALARY_EARNING_LABELS = [
  'Basic Pay',
  'House Rent Allowance',
  'Special Allowance',
  'Travel Allowance',
  'Performance Incentive',
  'Overtime Pay',
  'Variable Pay',
  'Statutory Bonus',
];

const SALARY_DEDUCTION_LABELS = [
  'PF Contribution',
  'Voluntary Provident Fund',
  'Employees State Insurance',
  'Tax Deducted at Source',
  'Salary Advance Recovery',
  'Unpaid Leave Deduction',
  'Others',
];

const createDefaultSalaryCertificateData = () => ({
  payslipId: '',
  salaryDateRaw: new Date().toISOString().split('T')[0],
  salaryDate: payoutReceiptDateStr(),
  salaryPeriod: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
  employeeName: 'Demo Developer',
  employeeLocation: 'Calicut, India',
  employeeId: 'OPS01',
  employeeContact: 'developer@koott.in',
  designation: 'Developer',
  workingDays: '26',
  paymentMode: 'Bank Transfer',
  recipientEmail: 'developer@koott.in',
  earnings: SALARY_EARNING_LABELS.map((label, idx) => ({
    label,
    amount: idx === 0 ? '30000' : '0',
  })),
  deductions: SALARY_DEDUCTION_LABELS.map(label => ({ label, amount: '0' })),
});

// ─── PDF Generation using the actual template ────────────────────────────────
// Page height: 842.25 pts. pdf-lib uses y from BOTTOM.
// Coordinates below are y_bottom = page_height - yMax_from_top

async function generatePayoutReceiptPDF(data) {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const templateBytes = await fetch('/Koott Letterhead - 2026 .pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_H = 842.25;
  const DARK = rgb(0.01, 0.22, 0.16);
  const WHITE = rgb(1, 1, 1);
  const HEADER_HEADING_COLOR = rgb(0.89, 1, 0.89);

  const put = (text, x, yFromTop, opts = {}) => {
    const { size = 12, color = DARK, f = font, align = 'left', maxWidth = null } = opts;
    let str = String(text || '').trim();
    if (!str) return;
    if (maxWidth) {
      while (str.length > 3 && f.widthOfTextAtSize(str, size) > maxWidth) {
        str = str.slice(0, -1);
      }
      if (str !== String(text || '').trim()) str = `${str.slice(0, -3)}...`;
    }
    let drawX = x;
    if (align === 'right') {
      drawX = x - f.widthOfTextAtSize(str, size);
    } else if (align === 'center') {
      drawX = x - (f.widthOfTextAtSize(str, size) / 2);
    }
    page.drawText(str, {
      x: drawX,
      y: PAGE_H - yFromTop,
      size,
      font: f,
      color,
    });
  };

  const rows = (data.rows || []).filter(row =>
    String(row.type || '').trim() ||
    String(row.number || '').trim() ||
    String(row.unitPrice || '').trim() ||
    String(row.amount || '').trim()
  );

  const subtotal = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const tdsPercent = parseFloat(data.tdsPercent);
  const safeTdsPercent = Number.isFinite(tdsPercent) ? tdsPercent : 10;
  const tds = subtotal * (safeTdsPercent / 100);
  const grandTotal = subtotal - tds;

  // Therapist details block
  put(data.name, 78, 268, { size: 13.5, color: HEADER_HEADING_COLOR, maxWidth: 275 });
  put(data.designation, 78, 289, { size: 13, color: HEADER_HEADING_COLOR, maxWidth: 275 });
  put(data.location, 78, 310, { size: 13, color: HEADER_HEADING_COLOR, maxWidth: 275 });
  put(data.email, 78, 337, { size: 12, color: WHITE, maxWidth: 285 });
  put(data.receiptNo, 435, 261, { size: 10.5, color: HEADER_HEADING_COLOR, maxWidth: 135 });
  put(data.date || payoutReceiptDateStr(), 435, 282, { size: 12.5, color: HEADER_HEADING_COLOR, maxWidth: 100 });

  // Session table
  const denseRows = rows.length > 4;
  const rowYs = denseRows ? [428, 449, 470, 491, 512, 533] : [428, 454, 481, 508, 535, 562];
  rows.slice(0, rowYs.length).forEach((row, idx) => {
    const y = rowYs[idx];
    const number = parseFloat(row.number) || 0;
    const unitPrice = parseFloat(row.unitPrice) || 0;
    const amount = parseFloat(row.amount) || 0;
    put(row.type, 72, y, { size: denseRows ? 10.8 : 12.5, maxWidth: 190 });
    put(number ? fmtReceipt(number, { decimals: false }) : '', 295, y, { size: denseRows ? 10.8 : 12.5, align: 'center' });
    put(unitPrice ? fmtReceipt(unitPrice, { decimals: false }) : '', 416, y, { size: denseRows ? 10.8 : 12.5, align: 'right' });
    put(amount ? fmtReceipt(amount, { decimals: false }) : '', 522, y, { size: denseRows ? 10.8 : 12.5, align: 'right' });
  });

  // Totals block
  put(fmtReceipt(subtotal), 522, 545, { size: 12.5, align: 'right' });
  put(fmtReceipt(tds), 522, 572, { size: 12.5, align: 'right' });
  put(fmtReceipt(grandTotal), 522, 616, { size: 13.5, f: boldFont, align: 'right' });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function generateSalaryCertificatePDF(data) {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const templateBytes = await fetch('/Salary Certificate.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_H = 842.25;
  const DARK = rgb(0.01, 0.18, 0.12);
  const HEADER_TEXT = rgb(0.89, 1, 0.89);

  const put = (text, x, yFromTop, opts = {}) => {
    const { size = 10.5, color = DARK, f = font, align = 'left', maxWidth = null } = opts;
    let str = String(text ?? '').trim();
    if (!str) return;
    if (maxWidth) {
      while (str.length > 3 && f.widthOfTextAtSize(str, size) > maxWidth) {
        str = str.slice(0, -1);
      }
      if (str !== String(text ?? '').trim()) str = `${str.slice(0, -3)}...`;
    }
    let drawX = x;
    if (align === 'right') drawX = x - f.widthOfTextAtSize(str, size);
    if (align === 'center') drawX = x - (f.widthOfTextAtSize(str, size) / 2);
    page.drawText(str, { x: drawX, y: PAGE_H - yFromTop, size, font: f, color });
  };

  const fmtSalary = (value) => fmtReceipt(value, { decimals: false });
  const earnings = data.earnings || [];
  const deductions = data.deductions || [];
  const totalEarnings = earnings.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const totalDeductions = deductions.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const netPayable = totalEarnings - totalDeductions;

  put(data.payslipId, 428.7, 250, { size: 9.4, color: HEADER_TEXT, maxWidth: 96 });
  put(data.salaryDate || payoutReceiptDateStr(), 428.7, 271, { size: 9.4, color: HEADER_TEXT, maxWidth: 88 });

  put(data.employeeName, 130, 323, { size: 9.2, maxWidth: 157 });
  put(data.employeeLocation, 142, 341, { size: 9.2, maxWidth: 145 });
  put(data.employeeId, 112, 359, { size: 9.2, maxWidth: 100 });
  put(data.employeeContact, 138, 377, { size: 9.2, maxWidth: 149 });

  put(data.salaryPeriod, 369, 323, { size: 9.2, maxWidth: 137 });
  put(data.designation, 391, 341, { size: 9.2, maxWidth: 115 });
  put(data.workingDays, 373, 359, { size: 9.2, maxWidth: 45 });
  put(data.paymentMode, 391, 377, { size: 9.2, maxWidth: 115 });

  const rowYs = [451, 468, 485, 502, 519, 536, 553, 570];
  earnings.slice(0, 8).forEach((row, idx) => {
    put(row.amount === '' ? '' : fmtSalary(row.amount), 260, rowYs[idx], { size: 9.5, align: 'right' });
  });
  deductions.slice(0, 7).forEach((row, idx) => {
    put(row.amount === '' ? '' : fmtSalary(row.amount), 491, rowYs[idx], { size: 9.5, align: 'right' });
  });

  put(fmtSalary(totalEarnings), 260, 603, { size: 10, f: boldFont, align: 'right' });
  put(fmtSalary(totalDeductions), 491, 603, { size: 10, f: boldFont, align: 'right' });
  put(fmtSalary(totalEarnings), 491, 637, { size: 10, align: 'right' });
  put(fmtSalary(totalDeductions), 491, 654, { size: 10, align: 'right' });
  put(fmtSalary(netPayable), 491, 672, { size: 10.5, f: boldFont, align: 'right' });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function RecipientPicker({
  doctors,
  savedRecipients,
  selectedEmail,
  onSelectRecipient,
  onAddRecipient,
  loadingDoctors,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#025545]/30 focus:border-[#025545] transition-all bg-white';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';
  const doctorRecipients = (doctors || []).map(normalizeDoctorRecipient).filter(r => r.email);
  const operationalRecipients = (savedRecipients || []).map(r => ({
    id: `saved:${r.email}`,
    type: 'saved',
    name: r.name || r.email,
    email: r.email,
    designation: r.designation || '',
    location: r.location || '',
  })).filter(r => r.email);

  const handleSelect = (value) => {
    const selected = [...doctorRecipients, ...operationalRecipients].find(r => r.email === value);
    if (selected) onSelectRecipient(selected);
  };

  const saveRecipient = () => {
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      alert('Please enter a valid email to save.');
      return;
    }
    const recipient = { name: name.trim() || cleanEmail, email: cleanEmail };
    onAddRecipient(recipient);
    onSelectRecipient({ ...recipient, type: 'saved' });
    setName('');
    setEmail('');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Mail className="h-4 w-4 text-[#025545]" /> Send Receipt To
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Doctor / saved email</label>
          <select
            className={inputClass}
            value={selectedEmail || ''}
            onChange={e => handleSelect(e.target.value)}
          >
            <option value="">{loadingDoctors ? 'Loading doctors…' : 'Select recipient email'}</option>
            {doctorRecipients.length > 0 && (
              <optgroup label="Current doctors">
                {doctorRecipients.map(r => (
                  <option key={r.id} value={r.email}>
                    {r.name} — {r.email}
                  </option>
                ))}
              </optgroup>
            )}
            {operationalRecipients.length > 0 && (
              <optgroup label="Saved operational emails">
                {operationalRecipients.map(r => (
                  <option key={r.id} value={r.email}>
                    {r.name} — {r.email}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg border border-gray-100 p-3 flex items-center">
          Select a doctor to fill the therapist name/email, or save an operations email for repeated use.
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className={labelClass}>Save new name</label>
          <input
            className={inputClass}
            placeholder="Operations / accounts name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Save new email</label>
          <input
            className={inputClass}
            type="email"
            placeholder="accounts@koott.in"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={saveRecipient}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-[#025545]/20 bg-[#025545]/5 px-3 py-2 text-sm font-semibold text-[#025545] hover:bg-[#025545]/10 transition-colors"
        >
          <Plus className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
}

function PayoutReceiptForm({
  data,
  onChange,
  onSaveDraft,
  saved,
  doctors,
  savedRecipients,
  onSelectRecipient,
  onAddRecipient,
  onGenerateReceiptNo,
  loadingDoctors,
}) {
  const [customTypes, setCustomTypes] = useState([]);

  useEffect(() => {
    try {
      const savedTypes = JSON.parse(localStorage.getItem('koott_payout_receipt_session_types') || '[]');
      if (Array.isArray(savedTypes)) setCustomTypes(savedTypes);
    } catch (e) {
      console.error('Error loading payout receipt custom types', e);
    }
  }, []);

  const handleSaveCustomType = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const allTypes = [...DEFAULT_PAYOUT_RECEIPT_TYPES, ...customTypes];
    if (!allTypes.includes(trimmed)) {
      const updated = [...customTypes, trimmed];
      setCustomTypes(updated);
      localStorage.setItem('koott_payout_receipt_session_types', JSON.stringify(updated));
    }
  };

  const updateField = (key, value) => onChange({ ...data, [key]: value });

  const updateRow = (idx, key, value) => {
    const rows = data.rows.map((row, i) => {
      if (i !== idx) return row;
      const next = { ...row, [key]: value };
      if (key === 'number' || key === 'unitPrice') {
        const count = parseFloat(key === 'number' ? value : next.number) || 0;
        const rate = parseFloat(key === 'unitPrice' ? value : next.unitPrice) || 0;
        next.amount = count > 0 && rate > 0 ? String(count * rate) : '';
      }
      return next;
    });
    onChange({ ...data, rows });
  };

  const addRow = () => {
    if ((data.rows || []).length >= 6) return;
    onChange({
      ...data,
      rows: [...data.rows, { type: '', number: '', unitPrice: '', amount: '' }],
    });
  };

  const removeRow = (idx) => {
    onChange({ ...data, rows: data.rows.filter((_, i) => i !== idx) });
  };

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#025545]/30 focus:border-[#025545] transition-all bg-white';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';
  const subtotal = data.rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const tdsPercent = parseFloat(data.tdsPercent);
  const safeTdsPercent = Number.isFinite(tdsPercent) ? tdsPercent : 10;
  const tds = subtotal * (safeTdsPercent / 100);
  const grandTotal = subtotal - tds;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#025545]" /> Receipt Details
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Receipt No</label>
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Auto-generated"
                value={data.receiptNo}
                onChange={e => updateField('receiptNo', e.target.value)}
              />
              <button
                type="button"
                onClick={onGenerateReceiptNo}
                className="px-3 py-2 rounded-lg border border-[#025545]/20 text-[#025545] hover:bg-[#025545]/5 transition-colors"
                title="Generate receipt number"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              className={inputClass}
              value={data.dateRaw}
              onChange={e => {
                const d = new Date(e.target.value);
                onChange({
                  ...data,
                  dateRaw: e.target.value,
                  date: isNaN(d) ? '' : payoutReceiptDateStr(d),
                });
              }}
            />
          </div>
          <div>
            <label className={labelClass}>TDS %</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={data.tdsPercent}
              onChange={e => updateField('tdsPercent', e.target.value)}
            />
          </div>
        </div>
      </div>

      <RecipientPicker
        doctors={doctors}
        savedRecipients={savedRecipients}
        selectedEmail={data.recipientEmail || data.email}
        onSelectRecipient={onSelectRecipient}
        onAddRecipient={onAddRecipient}
        loadingDoctors={loadingDoctors}
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-[#025545]" /> Therapist Details
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              placeholder="Dr. Thaniya K Leela"
              value={data.name}
              onChange={e => updateField('name', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Designation</label>
            <input
              className={inputClass}
              placeholder="Consultant Psychologist"
              value={data.designation}
              onChange={e => updateField('designation', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input
              className={inputClass}
              placeholder="Calicut, India"
              value={data.location}
              onChange={e => updateField('location', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              className={inputClass}
              placeholder="name.koott@gmail.com"
              value={data.email}
              onChange={e => onChange({ ...data, email: e.target.value, recipientEmail: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#025545]" /> Session Rows
        </div>
        <div className="space-y-3">
          {data.rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-5">
                <label className={labelClass}>Type of Sessions</label>
                <input
                  className={inputClass}
                  placeholder="Select or type new..."
                  list="payoutReceiptTypes"
                  value={row.type}
                  onChange={e => updateRow(idx, 'type', e.target.value)}
                  onBlur={e => handleSaveCustomType(e.target.value)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className={labelClass}>Number</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={row.number}
                  onChange={e => updateRow(idx, 'number', e.target.value)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className={labelClass}>Unit Price</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={row.unitPrice}
                  onChange={e => updateRow(idx, 'unitPrice', e.target.value)}
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <label className={labelClass}>Amount</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={row.amount}
                  onChange={e => updateRow(idx, 'amount', e.target.value)}
                />
              </div>
              <div className="col-span-1 flex justify-center pb-1">
                {data.rows.length > 1 && (
                  <button
                    onClick={() => removeRow(idx)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <datalist id="payoutReceiptTypes">
            {[...DEFAULT_PAYOUT_RECEIPT_TYPES, ...customTypes].map(t => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={addRow}
            disabled={(data.rows || []).length >= 6}
            className="flex items-center gap-1.5 text-xs font-medium text-[#025545] hover:bg-[#025545]/5 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" /> Add Session Row
          </button>
          <span className="text-xs text-gray-400">Template supports up to 6 printed rows.</span>
        </div>
      </div>

      <div className="bg-[#025545]/5 rounded-xl border border-[#025545]/20 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm font-semibold text-[#025545]">Calculated Summary</div>
          <button
            onClick={onSaveDraft}
            className="flex items-center gap-1.5 text-xs font-medium text-[#025545] bg-white border border-[#025545]/20 hover:bg-[#025545]/5 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Save className="h-3.5 w-3.5" /> {saved ? 'Saved' : 'Save Draft'}
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">₹{fmtReceipt(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">TDS @ {safeTdsPercent}%</span>
            <span className="font-semibold text-red-600">- ₹{fmtReceipt(tds)}</span>
          </div>
          <div className="flex justify-between border-t border-[#025545]/20 pt-2 mt-2">
            <span className="font-semibold text-[#025545]">Grand Total</span>
            <span className="font-bold text-[#025545]">₹{fmtReceipt(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalaryCertificateForm({
  data,
  onChange,
  savedEmployees,
  onSelectEmployee,
  onSaveEmployee,
  onGenerateReceiptNo,
}) {
  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#025545]/30 focus:border-[#025545] transition-all bg-white';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';

  const updateField = (key, value) => onChange({ ...data, [key]: value });
  const updateAmount = (group, idx, value) => {
    const rows = (data[group] || []).map((row, i) => i === idx ? { ...row, amount: value } : row);
    onChange({ ...data, [group]: rows });
  };

  const totalEarnings = (data.earnings || []).reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const totalDeductions = (data.deductions || []).reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const netPayable = totalEarnings - totalDeductions;
  const selectedEmployeeEmail = data.employeeContact || data.recipientEmail || '';
  const selectedEmployeeIsSaved = (savedEmployees || []).some(employee => employee.email === selectedEmployeeEmail);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-[#025545]" /> Certificate Details
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Payslip ID</label>
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Auto-generated"
                value={data.payslipId}
                onChange={e => updateField('payslipId', e.target.value)}
              />
              <button
                type="button"
                onClick={onGenerateReceiptNo}
                className="px-3 py-2 rounded-lg border border-[#025545]/20 text-[#025545] hover:bg-[#025545]/5 transition-colors"
                title="Generate payslip ID"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Salary Date</label>
            <input
              type="date"
              className={inputClass}
              value={data.salaryDateRaw}
              onChange={e => {
                const d = new Date(e.target.value);
                onChange({
                  ...data,
                  salaryDateRaw: e.target.value,
                  salaryDate: isNaN(d) ? '' : payoutReceiptDateStr(d),
                });
              }}
            />
          </div>
          <div>
            <label className={labelClass}>Salary Period</label>
            <input
              className={inputClass}
              placeholder="Jul 2026"
              value={data.salaryPeriod}
              onChange={e => updateField('salaryPeriod', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-[#025545]" /> Employee Details
        </div>
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className={labelClass}>Saved Employee</label>
            <select
              className={inputClass}
              value={selectedEmployeeEmail}
              onChange={e => onSelectEmployee(e.target.value)}
            >
              <option value="">Select saved employee email</option>
              {selectedEmployeeEmail && !selectedEmployeeIsSaved && (
                <option value={selectedEmployeeEmail}>{selectedEmployeeEmail}</option>
              )}
              {(savedEmployees || []).map(employee => (
                <option key={employee.email} value={employee.email}>
                  {employee.name || employee.email} — {employee.email}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => onSaveEmployee(data)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-[#025545]/20 bg-[#025545]/5 px-3 py-2 text-sm font-semibold text-[#025545] hover:bg-[#025545]/10 transition-colors"
          >
            <Save className="h-4 w-4" /> Save Employee
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Employee Name</label>
            <input className={inputClass} value={data.employeeName} onChange={e => updateField('employeeName', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Designation</label>
            <input className={inputClass} value={data.designation} onChange={e => updateField('designation', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Employee Location</label>
            <input className={inputClass} value={data.employeeLocation} onChange={e => updateField('employeeLocation', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Employee ID</label>
            <input className={inputClass} value={data.employeeId} onChange={e => updateField('employeeId', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Employee Contact</label>
            <input className={inputClass} value={data.employeeContact} onChange={e => updateField('employeeContact', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Working Days</label>
            <input className={inputClass} type="number" min="0" value={data.workingDays} onChange={e => updateField('workingDays', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Mode of Payment</label>
            <input className={inputClass} value={data.paymentMode} onChange={e => updateField('paymentMode', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Email for sending</label>
            <input className={inputClass} type="email" value={data.recipientEmail} onChange={e => updateField('recipientEmail', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-700 mb-4">Earnings</div>
          <div className="space-y-3">
            {(data.earnings || []).map((row, idx) => (
              <div key={row.label} className="grid grid-cols-5 gap-3 items-center">
                <div className="col-span-3 text-sm text-gray-700">{row.label}</div>
                <input
                  className={`${inputClass} col-span-2`}
                  type="number"
                  min="0"
                  value={row.amount}
                  onChange={e => updateAmount('earnings', idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-700 mb-4">Deductions</div>
          <div className="space-y-3">
            {(data.deductions || []).map((row, idx) => (
              <div key={row.label} className="grid grid-cols-5 gap-3 items-center">
                <div className="col-span-3 text-sm text-gray-700">{row.label}</div>
                <input
                  className={`${inputClass} col-span-2`}
                  type="number"
                  min="0"
                  value={row.amount}
                  onChange={e => updateAmount('deductions', idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#025545]/5 rounded-xl border border-[#025545]/20 p-4">
        <div className="text-sm font-semibold text-[#025545] mb-3">Calculated Summary</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Gross Earnings</span>
            <span className="font-semibold">₹{fmtReceipt(totalEarnings)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Deductions</span>
            <span className="font-semibold text-red-600">- ₹{fmtReceipt(totalDeductions)}</span>
          </div>
          <div className="flex justify-between border-t border-[#025545]/20 pt-2 mt-2">
            <span className="font-semibold text-[#025545]">Net Payable Amount</span>
            <span className="font-bold text-[#025545]">₹{fmtReceipt(netPayable)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ReceiptsPage() {
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState('select');
  const [template, setTemplate] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [savedRecipients, setSavedRecipients] = useState([]);
  const [savedEmployees, setSavedEmployees] = useState([]);
  const [autofillingSessions, setAutofillingSessions] = useState(false);

  const [payoutReceiptData, setPayoutReceiptData] = useState(createDefaultPayoutReceiptData);
  const [salaryCertificateData, setSalaryCertificateData] = useState(createDefaultSalaryCertificateData);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) { router.push('/'); return; }
      if (!hasRole('finance') && !hasRole('admin') && !hasRole('superadmin')) { router.push('/'); return; }
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  useEffect(() => {
    try {
      const savedOpsEmails = JSON.parse(localStorage.getItem('koott_receipt_saved_recipients') || '[]');
      if (Array.isArray(savedOpsEmails)) setSavedRecipients(savedOpsEmails);

      const savedSalaryEmployees = JSON.parse(localStorage.getItem('koott_salary_certificate_employees') || '[]');
      if (Array.isArray(savedSalaryEmployees)) setSavedEmployees(savedSalaryEmployees);

      const savedPayoutDraft = JSON.parse(localStorage.getItem('koott_payout_receipt_draft') || 'null');
      if (savedPayoutDraft && typeof savedPayoutDraft === 'object') {
        setPayoutReceiptData({
          ...createDefaultPayoutReceiptData(),
          ...savedPayoutDraft,
          rows: Array.isArray(savedPayoutDraft.rows) && savedPayoutDraft.rows.length
            ? savedPayoutDraft.rows
            : createDefaultPayoutReceiptData().rows,
        });
      }

      const savedSalaryDraft = JSON.parse(localStorage.getItem('koott_salary_certificate_draft') || 'null');
      if (savedSalaryDraft && typeof savedSalaryDraft === 'object') {
        setSalaryCertificateData({
          ...createDefaultSalaryCertificateData(),
          ...savedSalaryDraft,
          earnings: Array.isArray(savedSalaryDraft.earnings) && savedSalaryDraft.earnings.length
            ? savedSalaryDraft.earnings
            : createDefaultSalaryCertificateData().earnings,
          deductions: Array.isArray(savedSalaryDraft.deductions) && savedSalaryDraft.deductions.length
            ? savedSalaryDraft.deductions
            : createDefaultSalaryCertificateData().deductions,
        });
      }
    } catch (e) {
      console.error('Error loading payout receipt draft', e);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated() || (!hasRole('finance') && !hasRole('admin') && !hasRole('superadmin'))) return;
    let cancelled = false;
    const loadDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const response = await financeApi.getPsychologists();
        const list = response?.data?.psychologists || response?.psychologists || [];
        if (!cancelled) setDoctors(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('Error loading doctor emails for receipts', e);
      } finally {
        if (!cancelled) setLoadingDoctors(false);
      }
    };
    loadDoctors();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, hasRole]);

  const isSalaryCertificate = template === 'salaryCertificate';
  const selectedData = isSalaryCertificate ? salaryCertificateData : payoutReceiptData;
  const selectedName = selectedData?.name || 'receipt';
  const selectedDisplayName = isSalaryCertificate ? salaryCertificateData.employeeName : selectedName;
  const selectedReceiptNo = isSalaryCertificate
    ? (salaryCertificateData.payslipId || 'draft')
    : (payoutReceiptData.receiptNo || 'draft');
  const selectedEmail = isSalaryCertificate
    ? salaryCertificateData.recipientEmail
    : (payoutReceiptData.recipientEmail || payoutReceiptData.email);
  const selectedFileName = isSalaryCertificate
    ? `koott-salary-certificate-${safeFilePart(selectedDisplayName)}-${safeFilePart(selectedReceiptNo)}.pdf`
    : `koott-payout-receipt-${safeFilePart(selectedDisplayName)}-${safeFilePart(selectedReceiptNo)}.pdf`;

  const createPdfBytes = useCallback(async () => {
    if (template === 'salaryCertificate') {
      return generateSalaryCertificatePDF(salaryCertificateData);
    }
    return generatePayoutReceiptPDF(payoutReceiptData);
  }, [template, payoutReceiptData, salaryCertificateData]);

  const savePayoutReceiptDraft = useCallback(() => {
    const storageKey = template === 'salaryCertificate'
      ? 'koott_salary_certificate_draft'
      : 'koott_payout_receipt_draft';
    const dataToSave = template === 'salaryCertificate' ? salaryCertificateData : payoutReceiptData;
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 1800);
  }, [template, payoutReceiptData, salaryCertificateData]);

  const addSavedRecipient = useCallback((recipient) => {
    setSavedRecipients(prev => {
      const clean = {
        name: recipient.name || recipient.email,
        email: recipient.email,
      };
      const withoutDuplicate = prev.filter(r => r.email.toLowerCase() !== clean.email.toLowerCase());
      const next = [clean, ...withoutDuplicate].slice(0, 30);
      localStorage.setItem('koott_receipt_saved_recipients', JSON.stringify(next));
      return next;
    });
  }, []);

  const saveSalaryEmployee = useCallback((employeeData) => {
    const cleanEmail = String(employeeData.employeeContact || employeeData.recipientEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      alert('Enter a valid employee email/contact before saving.');
      return;
    }

    const employee = {
      name: String(employeeData.employeeName || cleanEmail).trim(),
      email: cleanEmail,
      employeeId: String(employeeData.employeeId || '').trim(),
      location: String(employeeData.employeeLocation || '').trim(),
      designation: String(employeeData.designation || '').trim(),
    };

    setSavedEmployees(prev => {
      const withoutDuplicate = prev.filter(item => String(item.email || '').toLowerCase() !== cleanEmail.toLowerCase());
      const next = [employee, ...withoutDuplicate].slice(0, 50);
      localStorage.setItem('koott_salary_certificate_employees', JSON.stringify(next));
      return next;
    });

    setSalaryCertificateData(prev => ({
      ...prev,
      employeeName: employee.name,
      employeeContact: employee.email,
      recipientEmail: employee.email,
      employeeId: employee.employeeId,
      employeeLocation: employee.location,
      designation: employee.designation,
    }));
  }, []);

  const applySalaryEmployee = useCallback((email) => {
    const selected = savedEmployees.find(item => String(item.email || '').toLowerCase() === String(email || '').toLowerCase());
    if (!selected) return;

    setEmailSent(false);
    setSalaryCertificateData(prev => ({
      ...prev,
      employeeName: selected.name || prev.employeeName,
      employeeContact: selected.email || prev.employeeContact,
      recipientEmail: selected.email || prev.recipientEmail,
      employeeId: selected.employeeId || '',
      employeeLocation: selected.location || '',
      designation: selected.designation || '',
    }));
  }, [savedEmployees]);

  const applyRecipientToCurrentTemplate = useCallback(async (recipient) => {
    setEmailSent(false);
    const currentDateRaw = payoutReceiptData.dateRaw;
    let autoRows = null;

    if (recipient.type === 'doctor' && recipient.psychologistId) {
      setAutofillingSessions(true);
      try {
        const range = monthRangeFromDateRaw(currentDateRaw);
        const response = await financeApi.getDoctorFinanceProfile(recipient.psychologistId, {
          ...range,
          dateBasis: 'completed',
        });
        const profile = response?.data || response;
        autoRows = buildReceiptRowsFromProfile(profile, 'payoutReceipt');
      } catch (e) {
        console.error('Error auto-filling receipt sessions', e);
        alert('Doctor selected, but session auto-fill failed. You can still enter/edit the rows manually.');
      } finally {
        setAutofillingSessions(false);
      }
    }

    setPayoutReceiptData(prev => {
      const next = {
        ...prev,
        name: recipient.name || prev.name,
        email: recipient.email || prev.email,
        recipientEmail: recipient.email || prev.recipientEmail,
        designation: recipient.designation || prev.designation,
        location: recipient.location || prev.location,
        ...(autoRows?.length ? { rows: autoRows } : {}),
      };
      if (!next.receiptNo) next.receiptNo = generateReceiptNo('payoutReceipt', next);
      return next;
    });
  }, [payoutReceiptData.dateRaw]);

  const generateReceiptNoForCurrentTemplate = useCallback(() => {
    setEmailSent(false);
    if (template === 'salaryCertificate') {
      setSalaryCertificateData(prev => ({ ...prev, payslipId: generateReceiptNo('salaryCertificate', {
        dateRaw: prev.salaryDateRaw,
        name: prev.employeeName,
        email: prev.employeeContact || prev.recipientEmail,
      }) }));
      return;
    }
    setPayoutReceiptData(prev => ({ ...prev, receiptNo: generateReceiptNo('payoutReceipt', prev) }));
  }, [template]);

  const openTemplate = useCallback((nextTemplate) => {
    if (!['payoutReceipt', 'salaryCertificate'].includes(nextTemplate)) return;
    setTemplate(nextTemplate);
    setStep('form');
    setDownloaded(false);
    setPrinted(false);
    setEmailSent(false);
    if (nextTemplate === 'salaryCertificate') {
      setSalaryCertificateData(prev => prev.payslipId ? prev : ({ ...prev, payslipId: generateReceiptNo('salaryCertificate', {
        dateRaw: prev.salaryDateRaw,
        name: prev.employeeName,
        email: prev.employeeContact || prev.recipientEmail,
      }) }));
      return;
    }
    setPayoutReceiptData(prev => prev.receiptNo ? prev : ({ ...prev, receiptNo: generateReceiptNo('payoutReceipt', prev) }));
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setShowConfirm(false);

    try {
      const pdfBytes = await createPdfBytes();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFileName;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [createPdfBytes, downloading, selectedFileName]);

  const handlePrintPDF = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setShowConfirm(false);

    try {
      const pdfBytes = await createPdfBytes();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        alert('Popup blocked. Please allow popups to print the receipt.');
        URL.revokeObjectURL(url);
        return;
      }
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 700);
      setPrinted(true);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('PDF print failed:', err);
      alert('Failed to generate PDF for printing. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [createPdfBytes, downloading]);

  const handleEmailPDF = useCallback(async () => {
    if (emailSending || downloading) return;
    const cleanEmail = String(selectedEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      alert('Select or enter a valid recipient email first.');
      return;
    }
    if (!selectedReceiptNo || selectedReceiptNo === 'draft') {
      alert('Generate a receipt number before emailing.');
      return;
    }

    setEmailSending(true);
    setEmailSent(false);
    try {
      const pdfBytes = await createPdfBytes();
      await financeApi.sendReceiptEmail({
        to: cleanEmail,
        recipientName: selectedDisplayName,
        template,
        receiptNo: selectedReceiptNo,
        fileName: selectedFileName,
        pdfBase64: pdfBytesToBase64(pdfBytes),
      });
      setEmailSent(true);
    } catch (err) {
      console.error('Receipt email failed:', err);
      alert(err?.message || 'Failed to email receipt. Please try again.');
    } finally {
      setEmailSending(false);
    }
  }, [createPdfBytes, downloading, emailSending, selectedEmail, selectedFileName, selectedDisplayName, selectedReceiptNo, template]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#025545]" />
      </div>
    );
  }

  // ── Step 1: Template Selector ──────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="px-3 sm:px-4 py-6 max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-4xl">
          {/* Payout Receipt Template */}
          <button
            onClick={() => openTemplate('payoutReceipt')}
            className="group text-left bg-white border border-gray-100 hover:border-[#025545] rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#025545]/30 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-[#025545]/10 flex items-center justify-center shrink-0 group-hover:bg-[#025545] transition-colors">
              <FileText className="h-4 w-4 text-[#025545] group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">Payout Receipt - 2026</div>
              <div className="text-xs text-gray-400 mt-0.5">New Koott letterhead</div>
            </div>
            <ChevronLeft className="h-4 w-4 text-gray-300 rotate-180 group-hover:text-[#025545] transition-colors" />
          </button>
          <button
            onClick={() => openTemplate('salaryCertificate')}
            className="group text-left bg-white border border-gray-100 hover:border-[#025545] rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#025545]/30 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-[#025545]/10 flex items-center justify-center shrink-0 group-hover:bg-[#025545] transition-colors">
              <Briefcase className="h-4 w-4 text-[#025545] group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">Salary Certificate</div>
              <div className="text-xs text-gray-400 mt-0.5">Operational staff certificate</div>
            </div>
            <ChevronLeft className="h-4 w-4 text-gray-300 rotate-180 group-hover:text-[#025545] transition-colors" />
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Form ──────────────────────────────────────────────────────────
  const formTitle = isSalaryCertificate ? 'Salary Certificate' : 'Payout Receipt - 2026';

  return (
    <div className="px-3 sm:px-4 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setStep('select'); setDownloaded(false); }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-base font-semibold text-gray-900">{formTitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {downloaded && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <CheckCircle className="h-3.5 w-3.5" /> Downloaded!
            </span>
          )}
          {printed && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <CheckCircle className="h-3.5 w-3.5" /> Print opened
            </span>
          )}
          {emailSent && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <CheckCircle className="h-3.5 w-3.5" /> Email sent
            </span>
          )}
          {autofillingSessions && (
            <span className="flex items-center gap-1 text-xs text-[#025545] font-medium bg-[#025545]/5 px-3 py-1.5 rounded-full border border-[#025545]/20">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Filling sessions
            </span>
          )}
          <button
            onClick={savePayoutReceiptDraft}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#025545] border border-[#025545]/20 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Save className="h-4 w-4" /> {draftSaved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handlePrintPDF}
            disabled={downloading}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#025545] border border-[#025545]/20 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {downloading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><Printer className="h-4 w-4" /> Print</>
            }
          </button>
          <button
            onClick={handleEmailPDF}
            disabled={downloading || emailSending}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#025545] border border-[#025545]/20 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            title={selectedEmail ? `Email to ${selectedEmail}` : 'Select a recipient email first'}
          >
            {emailSending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
              : <><Send className="h-4 w-4" /> Email</>
            }
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={downloading}
            className="flex items-center gap-2 bg-[#025545] hover:bg-[#013d33] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {downloading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><Download className="h-4 w-4" /> Download PDF</>
            }
          </button>
        </div>
      </div>

      {isSalaryCertificate ? (
        <SalaryCertificateForm
          data={salaryCertificateData}
          onChange={setSalaryCertificateData}
          savedEmployees={savedEmployees}
          onSelectEmployee={applySalaryEmployee}
          onSaveEmployee={saveSalaryEmployee}
          onGenerateReceiptNo={generateReceiptNoForCurrentTemplate}
        />
      ) : (
        <PayoutReceiptForm
          data={payoutReceiptData}
          onChange={setPayoutReceiptData}
          onSaveDraft={savePayoutReceiptDraft}
          saved={draftSaved}
          doctors={doctors}
          savedRecipients={savedRecipients}
          onSelectRecipient={applyRecipientToCurrentTemplate}
          onAddRecipient={addSavedRecipient}
          onGenerateReceiptNo={generateReceiptNoForCurrentTemplate}
          loadingDoctors={loadingDoctors}
        />
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#025545]/10 rounded-full flex items-center justify-center">
                <Download className="h-5 w-5 text-[#025545]" />
              </div>
              <div className="font-semibold text-gray-900">Confirm Download</div>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Generating {isSalaryCertificate ? 'salary certificate' : 'payout receipt'} for:
            </p>
            <p className="font-semibold text-[#025545] mb-4">
              {selectedDisplayName || '(No name entered)'}
            </p>
            <p className="text-xs text-gray-400 mb-5">
              Please verify all details are correct. The PDF will be saved directly to your device using the official template.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Review Again
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex-1 px-4 py-2 rounded-lg bg-[#025545] text-white text-sm font-semibold hover:bg-[#013d33] transition-colors"
              >
                Confirm &amp; Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
