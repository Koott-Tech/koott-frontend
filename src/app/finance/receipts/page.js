'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Download,
  Plus,
  Trash2,
  ChevronLeft,
  User,
  Stethoscope,
  Briefcase,
  Calendar,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  const num = parseFloat(n) || 0;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}


const DEFAULT_SESSION_ROWS = [
  { type: 'Initial session', sessions: '', ratePerSession: '', amount: '' },
  { type: 'Follow Up Session', sessions: '', ratePerSession: '', amount: '' },
  { type: 'Couple Session', sessions: '', ratePerSession: '', amount: '' },
  { type: 'Couple Follow Up', sessions: '', ratePerSession: '', amount: '' },
];

const DEFAULT_SESSION_TYPES = [
  'Initial session',
  'Follow Up Session',
  'Couple Session',
  'Couple Follow Up'
];

// ─── PDF Generation using the actual template ────────────────────────────────
// Page height: 842.25 pts. pdf-lib uses y from BOTTOM.
// Coordinates below are y_bottom = page_height - yMax_from_top

async function generateTherapistPDF(data) {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  // Fetch the template PDF from public folder
  const templateUrl = '/therapit salary slip.pdf';
  const templateBytes = await fetch(templateUrl).then(r => r.arrayBuffer());

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_H = 842.25;
  const BLACK = rgb(0, 0, 0);
  const WHITE = rgb(1, 1, 1);
  const textSize = 9;
  const valueSize = 9;

  const Y_OFFSET = 9.6;

  // Helper: draw text at absolute (x, y_from_top)
  const put = (text, xLeft, yFromTop, opts = {}) => {
    const { size = textSize, color = BLACK, f = font, align = 'left' } = opts;
    const str = String(text || '');
    if (!str) return;
    let x = xLeft;
    if (align === 'right') {
      const w = f.widthOfTextAtSize(str, size);
      x = xLeft - w;
    }
    
    // Apply baseline offset to align perfectly with the bounding boxes
    const adjustedY = yFromTop - Y_OFFSET;
    
    page.drawText(str, {
      x,
      y: PAGE_H - adjustedY,
      size,
      font: f,
      color,
    });
  };

  const { receiptNo, date, name, designation, sessions } = data;

  const gross = sessions.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const tds = gross * 0.1;
  const totalEarning = gross;
  const totalDeductions = tds;
  const netPayout = gross - tds;

  // ── Receipt No (after "No:" label which ends at x≈118, yMax≈184)
  put(receiptNo, 125, 184, { size: valueSize });

  // ── Date (after "Date:" label which ends at x≈90, yMax≈197)
  put(date || todayStr(), 95, 197, { size: valueSize });

  // ── Name (after "Name:" label at yMax≈222)
  put(name, 100, 222, { size: valueSize });

  // ── Designation (after "Designation:" label at yMax≈235)
  put(designation, 130, 235, { size: valueSize });

  // ── Session rows
  // Row yMax positions: row1≈284, row2≈299, row3≈313
  const sessionYTops = [284, 299, 313];

  sessions.forEach((row, idx) => {
    const y = sessionYTops[idx];
    if (y === undefined) return;
    // No. of sessions value (right-aligned in No.of Session column ~x:135)
    put(row.sessions || '', 135, y, { size: valueSize, align: 'right' });
    // Amount value (right-aligned, in amount column right edge ~x:448)
    put(row.amount ? fmt(row.amount) : '', 448, y, { size: valueSize, align: 'right' });
  });

  // ── Total Gross Amount (right-aligned at x≈448, yMax≈396)
  put(fmt(gross), 448, 396, { size: valueSize, f: boldFont, align: 'right', color: WHITE });

  // ── TDS deduction value (right-aligned, yMax≈421)
  put(fmt(tds), 448, 421, { size: valueSize, align: 'right' });

  // ── Total Earning value (right-aligned, yMax≈445)
  put(fmt(totalEarning), 448, 445, { size: valueSize, align: 'right' });

  // ── Total Deductions value (right-aligned, yMax≈464)
  put(fmt(totalDeductions), 448, 464, { size: valueSize, align: 'right' });

  // ── Net Payout value (right-aligned, yMax≈480)
  put(fmt(netPayout), 448, 480, { size: valueSize, f: boldFont, align: 'right', color: WHITE });

  // ── Employee name on signature line (yMax≈537, above Employee Signature)
  put(name || '', 80, 537, { size: valueSize });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ─── Therapist Form ──────────────────────────────────────────────────────────

function TherapistForm({ data, onChange }) {
  const [customTypes, setCustomTypes] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('koott_receipt_session_types') || '[]');
      if (Array.isArray(saved)) setCustomTypes(saved);
    } catch (e) {
      console.error('Error loading custom types', e);
    }
  }, []);

  const handleSaveCustomType = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const allTypes = [...DEFAULT_SESSION_TYPES, ...customTypes];
    if (!allTypes.includes(trimmed)) {
      const updated = [...customTypes, trimmed];
      setCustomTypes(updated);
      localStorage.setItem('koott_receipt_session_types', JSON.stringify(updated));
    }
  };

  const updateField = (key, value) => onChange({ ...data, [key]: value });

  const updateSession = (idx, key, value) => {
    const updated = data.sessions.map((row, i) => {
      if (i !== idx) return row;
      const next = { ...row, [key]: value };
      if (key === 'sessions' || key === 'ratePerSession') {
        const s = parseFloat(key === 'sessions' ? value : next.sessions) || 0;
        const r = parseFloat(key === 'ratePerSession' ? value : next.ratePerSession) || 0;
        next.amount = s > 0 && r > 0 ? String(s * r) : '';
      }
      return next;
    });
    onChange({ ...data, sessions: updated });
  };

  const addSession = () => {
    onChange({
      ...data,
      sessions: [...data.sessions, { type: '', sessions: '', ratePerSession: '', amount: '' }],
    });
  };

  const removeSession = (idx) => {
    onChange({ ...data, sessions: data.sessions.filter((_, i) => i !== idx) });
  };

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#025545]/30 focus:border-[#025545] transition-all bg-white';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';

  const gross = data.sessions.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const tds = gross * 0.1;
  const net = gross - tds;

  return (
    <div className="space-y-5">
      {/* Receipt Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#025545]" /> Receipt Details
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Receipt No</label>
            <input
              className={inputClass}
              placeholder="e.g. RCP-2025-001"
              value={data.receiptNo}
              onChange={e => updateField('receiptNo', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              className={inputClass}
              value={data.dateRaw}
              onChange={e => {
                const d = new Date(e.target.value);
                updateField('dateRaw', e.target.value);
                updateField(
                  'date',
                  isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                );
              }}
            />
          </div>
        </div>
      </div>

      {/* Therapist Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-[#025545]" /> Therapist Details
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              placeholder="Full name"
              value={data.name}
              onChange={e => updateField('name', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Designation</label>
            <input
              className={inputClass}
              placeholder="e.g. Therapist"
              value={data.designation}
              onChange={e => updateField('designation', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#025545]" /> Sessions
        </div>
        <div className="space-y-3">
          {data.sessions.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <label className={labelClass}>Session Details</label>
                <input
                  className={inputClass}
                  placeholder="Select or type new..."
                  list="sessionTypes"
                  value={row.type}
                  onChange={e => updateSession(idx, 'type', e.target.value)}
                  onBlur={e => handleSaveCustomType(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Sessions</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  placeholder="0"
                  value={row.sessions}
                  onChange={e => updateSession(idx, 'sessions', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Rate (₹)</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  placeholder="0"
                  value={row.ratePerSession}
                  onChange={e => updateSession(idx, 'ratePerSession', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  placeholder="Auto"
                  value={row.amount}
                  onChange={e => updateSession(idx, 'amount', e.target.value)}
                />
              </div>
              <div className="col-span-1 flex justify-center pb-1">
                {data.sessions.length > 1 && (
                  <button
                    onClick={() => removeSession(idx)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <datalist id="sessionTypes">
            {[...DEFAULT_SESSION_TYPES, ...customTypes].map(t => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <button
          onClick={addSession}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#025545] hover:bg-[#025545]/5 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Session Row
        </button>
      </div>

      {/* Live Calculated Summary */}
      {gross > 0 && (
        <div className="bg-[#025545]/5 rounded-xl border border-[#025545]/20 p-5">
          <div className="text-sm font-semibold text-[#025545] mb-3">Calculated Summary</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Gross Amount</span>
              <span className="font-semibold">₹{fmt(gross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TDS @ 10%</span>
              <span className="font-semibold text-red-600">- ₹{fmt(tds)}</span>
            </div>
            <div className="flex justify-between border-t border-[#025545]/20 pt-2 mt-2">
              <span className="font-semibold text-[#025545]">Net Payout</span>
              <span className="font-bold text-[#025545]">₹{fmt(net)}</span>
            </div>
          </div>
        </div>
      )}
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

  const [therapistData, setTherapistData] = useState({
    receiptNo: '',
    dateRaw: new Date().toISOString().split('T')[0],
    date: todayStr(),
    name: '',
    designation: 'Therapist',
    sessions: DEFAULT_SESSION_ROWS.map(r => ({ ...r })),
  });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) { router.push('/'); return; }
      if (!hasRole('finance') && !hasRole('admin') && !hasRole('superadmin')) { router.push('/'); return; }
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  const handleDownloadPDF = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setShowConfirm(false);

    try {
      const pdfBytes = await generateTherapistPDF(therapistData);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `therapist-salary-slip-${therapistData.name || 'receipt'}-${therapistData.receiptNo || 'draft'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [downloading, therapistData]);

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
      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-3xl">
          {/* Therapist Template */}
          <button
            onClick={() => { setTemplate('therapist'); setStep('form'); setDownloaded(false); }}
            className="group text-left bg-white border border-gray-100 hover:border-[#025545] rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#025545]/30 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-[#025545]/10 flex items-center justify-center shrink-0 group-hover:bg-[#025545] transition-colors">
              <Stethoscope className="h-4 w-4 text-[#025545] group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800">Therapist Salary Slip</div>
            </div>
            <ChevronLeft className="h-4 w-4 text-gray-300 rotate-180 group-hover:text-[#025545] transition-colors" />
          </button>

          {/* Operations Template — Coming Soon */}
          <div className="relative text-left bg-white border border-dashed border-gray-200 rounded-xl p-4 opacity-60 cursor-not-allowed flex items-center gap-3">
            <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200 shadow-sm z-10">
              Soon
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">Operations Team Slip</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Form ──────────────────────────────────────────────────────────
  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
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
            <div className="text-base font-semibold text-gray-900">Therapist Salary Slip</div>
            <p className="text-xs text-gray-500">Fill in the details — your values will be placed into the official PDF template</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {downloaded && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <CheckCircle className="h-3.5 w-3.5" /> Downloaded!
            </span>
          )}
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

      <TherapistForm data={therapistData} onChange={setTherapistData} />

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
              Generating salary slip for:
            </p>
            <p className="font-semibold text-[#025545] mb-4">
              {therapistData.name || '(No name entered)'}
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
