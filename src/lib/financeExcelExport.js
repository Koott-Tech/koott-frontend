import * as XLSX from 'xlsx';

const safeSheetName = (name) => String(name || 'Sheet')
  .replace(/[:\\/?*[\]]/g, ' ')
  .trim()
  .slice(0, 31) || 'Sheet';

const safeFilePart = (value) => String(value || 'export')
  .trim()
  .replace(/[^a-z0-9]+/gi, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase() || 'export';

const labelFromMap = (map, key, fallback = '—') => {
  const normalized = String(key || '').toLowerCase();
  return map?.[normalized]?.label || String(key || fallback).replace(/_/g, ' ');
};

const autosizeColumns = (rows) => {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  return headers.map((header) => {
    const maxLength = rows.reduce((max, row) => {
      const value = row?.[header] == null ? '' : String(row[header]);
      return Math.max(max, value.length);
    }, header.length);
    return { wch: Math.min(Math.max(maxLength + 2, 10), 42) };
  });
};

const addSheet = (workbook, name, rows) => {
  const sheetRows = rows.length ? rows : [{ Note: 'No rows for this export' }];
  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  worksheet['!cols'] = autosizeColumns(sheetRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(name));
};

export function exportFinanceRowsToExcel({
  rows,
  doctorName,
  filePrefix,
  dateFrom,
  dateTo,
  sourceStyleFor,
  payoutStyles,
  summary,
  totals,
}) {
  const workbook = XLSX.utils.book_new();
  const normalizedRows = (rows || []).map((row) => {
    const isProfileRow = Object.prototype.hasOwnProperty.call(row, 'doctor_amount');
    const source = sourceStyleFor?.(row.source);
    const payoutStatus = row.payout_status || row.payoutStatus || 'not_due';
    return {
      Date: row.session_date || '',
      Time: row.session_time || '',
      Client: row.client_name || '',
      Type: row.package_label || row.session_type_label || String(row.session_type || '').replace(/_/g, ' '),
      Source: source?.label || row.source || '',
      'Payment Proof': row.payment_proof_url || '',
      'Session Status': String(row.status || '').replace(/_/g, ' '),
      'Session Amount': Number(row.session_amount || 0),
      'Doctor Commission': Number((isProfileRow ? row.doctor_amount : row.doctor_wallet) || 0),
      'Company Commission': Number((isProfileRow ? row.company_amount : row.company_commission) || 0),
      'Payout Status': labelFromMap(payoutStyles, payoutStatus, payoutStatus),
      'Order ID': row.order_id || '',
      'Session ID': row.session_id || row.id || '',
    };
  });

  const summaryRows = [
    { Field: 'Doctor', Value: doctorName || 'Therapist' },
    { Field: 'Date From', Value: dateFrom || 'All' },
    { Field: 'Date To', Value: dateTo || 'All' },
    { Field: 'Rows Exported', Value: normalizedRows.length },
  ];
  Object.entries(summary || {}).forEach(([key, value]) => {
    summaryRows.push({
      Field: String(key).replace(/_/g, ' '),
      Value: typeof value === 'number' ? Number(value) : value,
    });
  });
  if (totals) {
    summaryRows.push(
      { Field: 'Total Session Amount', Value: Number(totals.amount || 0) },
      { Field: 'Total Doctor Commission', Value: Number(totals.doctor || 0) },
      { Field: 'Total Company Commission', Value: Number(totals.company || 0) },
    );
  }

  addSheet(workbook, 'Summary', summaryRows);
  addSheet(workbook, 'Sessions', normalizedRows);

  const rangePart = [dateFrom, dateTo].filter(Boolean).join('_to_') || 'all-dates';
  const filename = `${safeFilePart(filePrefix || doctorName || 'finance')}-${safeFilePart(rangePart)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
