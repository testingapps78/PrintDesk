import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { SectionTitle, Ok, Err } from './shared'
import { primaryBtn, ghostBtn } from './formStyles'

// Pure JS Excel export - no external library needed
function exportToCSV(filename, rows, headers) {
  const escape = v => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const csv = [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ExcelExport() {
  const [exporting, setExporting] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  const date = new Date().toISOString().slice(0, 10)

  async function exportPrintRecords() {
    setErr(''); setExporting('records')
    const { data, error } = await supabase
      .from('print_records')
      .select('id,entry_date,description,copies,amount,amount_paid,remaining,status,payment_date,remarks,is_archived,person:staff!print_records_person_id_fkey(full_name,designation),other_person_name,created_at')
      .order('entry_date', { ascending: false })
    if (error) { setErr('Export failed: ' + error.message); setExporting(''); return }
    const headers = ['Date','Person','Designation','Description','Copies','Amount','Paid','Remaining','Status','Payment Date','Remarks','Archived','Created At']
    const rows = (data || []).map(r => [
      r.entry_date,
      r.person?.full_name || r.other_person_name || '',
      r.person?.designation || 'Other',
      r.description || '',
      r.copies,
      r.amount,
      r.amount_paid || 0,
      r.remaining || 0,
      r.status,
      r.payment_date || '',
      r.remarks || '',
      r.is_archived ? 'Yes' : 'No',
      new Date(r.created_at).toLocaleDateString('en-PK'),
    ])
    exportToCSV(`PrintDesk_Records_${date}.csv`, rows, headers)
    setOk(`✓ Exported ${rows.length} print records.`)
    setExporting('')
    setTimeout(() => setOk(''), 5000)
  }

  async function exportCashTransactions() {
    setErr(''); setExporting('cash')
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('id,entry_date,description,amount,type,remarks,is_archived,created_at,custom_type:custom_transaction_types(type_name,cash_effect,manager_balance_effect)')
      .order('entry_date', { ascending: false })
    if (error) { setErr('Export failed: ' + error.message); setExporting(''); return }
    const headers = ['Date','Type','Cash Effect','Manager Balance Effect','Description','Amount (Rs.)','Remarks','Archived','Created At']
    const rows = (data || []).map(t => [
      t.entry_date,
      t.custom_type?.type_name || t.type || '',
      t.custom_type?.cash_effect === 'cash_in' ? 'Cash In (+)' : t.custom_type?.cash_effect === 'cash_out' ? 'Cash Out (-)' : 'None',
      t.custom_type?.manager_balance_effect || 'none',
      t.description || '',
      t.amount,
      t.remarks || '',
      t.is_archived ? 'Yes' : 'No',
      new Date(t.created_at).toLocaleDateString('en-PK'),
    ])
    exportToCSV(`PrintDesk_Cash_${date}.csv`, rows, headers)
    setOk(`✓ Exported ${rows.length} cash transactions.`)
    setExporting('')
    setTimeout(() => setOk(''), 5000)
  }

  async function exportStaff() {
    setErr(''); setExporting('staff')
    const { data, error } = await supabase
      .from('staff')
      .select('id,full_name,role,designation,ssm_code,is_active,created_at')
      .order('role').order('full_name')
    if (error) { setErr('Export failed: ' + error.message); setExporting(''); return }
    const headers = ['Full Name','Role','Designation','SSM Code','Active','Created At']
    const rows = (data || []).map(s => [
      s.full_name,
      s.role,
      s.designation || '',
      s.ssm_code || '',
      s.is_active ? 'Yes' : 'No',
      new Date(s.created_at).toLocaleDateString('en-PK'),
    ])
    exportToCSV(`PrintDesk_Staff_${date}.csv`, rows, headers)
    setOk(`✓ Exported ${rows.length} staff records.`)
    setExporting('')
    setTimeout(() => setOk(''), 5000)
  }

  async function exportInventory() {
    setErr(''); setExporting('inventory')
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('id,txn_type,quantity,description,source,created_at,item:inventory_items(item_name,unit)')
      .order('created_at', { ascending: false })
    if (error) { setErr('Export failed: ' + error.message); setExporting(''); return }
    const headers = ['Date','Item','Unit','Type','Quantity','Source','Note']
    const rows = (data || []).map(t => [
      new Date(t.created_at).toLocaleDateString('en-PK'),
      t.item?.item_name || '',
      t.item?.unit || '',
      t.txn_type === 'stock_in' ? 'Stock In' : 'Stock Out',
      t.quantity,
      t.source,
      t.description || '',
    ])
    exportToCSV(`PrintDesk_Inventory_${date}.csv`, rows, headers)
    setOk(`✓ Exported ${rows.length} inventory movements.`)
    setExporting('')
    setTimeout(() => setOk(''), 5000)
  }

  async function exportFullBackup() {
    setErr(''); setExporting('full')
    try {
      await exportPrintRecordsRaw()
      await exportCashRaw()
      setOk('✓ Full backup exported (2 CSV files downloaded).')
    } catch (e) {
      setErr('Backup failed: ' + e.message)
    }
    setExporting('')
    setTimeout(() => setOk(''), 5000)
  }

  async function exportPrintRecordsRaw() {
    const { data } = await supabase
      .from('print_records')
      .select('*,person:staff!print_records_person_id_fkey(full_name,designation)')
      .order('entry_date', { ascending: false })
    const headers = ['Date','Person','Description','Copies','Amount','Paid','Remaining','Status','Remarks']
    const rows = (data || []).map(r => [r.entry_date, r.person?.full_name || r.other_person_name || '', r.description || '', r.copies, r.amount, r.amount_paid || 0, r.remaining || 0, r.status, r.remarks || ''])
    exportToCSV(`Backup_Records_${date}.csv`, rows, headers)
  }

  async function exportCashRaw() {
    const { data } = await supabase.from('cash_transactions').select('*,custom_type:custom_transaction_types(type_name)').order('entry_date', { ascending: false })
    const headers = ['Date','Type','Description','Amount','Remarks']
    const rows = (data || []).map(t => [t.entry_date, t.custom_type?.type_name || t.type || '', t.description || '', t.amount, t.remarks || ''])
    exportToCSV(`Backup_Cash_${date}.csv`, rows, headers)
  }

  return (
    <div>
      <SectionTitle>Excel / CSV Data Export</SectionTitle>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Download your data as CSV files. Open in Microsoft Excel or Google Sheets. Clerk and Admin only.
      </p>

      <Err msg={err} />
      <Ok msg={ok} />

      {/* Full backup */}
      <div style={{ background: 'var(--bg-surface)', border: '2px solid var(--gold-border)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)', marginBottom: 6 }}>📦 Full Backup</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
          Downloads all records and cash transactions in one click. Recommended for periodic backups.
        </div>
        <button style={{ ...primaryBtn, width: 'auto', padding: '11px 24px' }} onClick={exportFullBackup} disabled={!!exporting}>
          {exporting === 'full' ? 'Exporting…' : '⬇ Download Full Backup'}
        </button>
      </div>

      {/* Individual exports */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        {[
          { key: 'records', label: '📄 Print Records', desc: 'All print records with status, amounts and payments', fn: exportPrintRecords },
          { key: 'cash', label: '💰 Cash Transactions', desc: 'All cash in/out entries with types and effects', fn: exportCashTransactions },
          { key: 'staff', label: '👤 Staff List', desc: 'All staff members with roles and designations', fn: exportStaff },
          { key: 'inventory', label: '📦 Inventory History', desc: 'All stock movements (in/out) with dates', fn: exportInventory },
        ].map(item => (
          <div key={item.key} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px 18px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>{item.desc}</div>
            <button
              style={{ ...ghostBtn, width: '100%', textAlign: 'center', padding: '9px' }}
              onClick={item.fn}
              disabled={!!exporting}
            >
              {exporting === item.key ? 'Exporting…' : '⬇ Export CSV'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        💡 <strong style={{ color: 'var(--text-secondary)' }}>Tip:</strong> CSV files open directly in Excel. To open: right-click the file → Open with → Microsoft Excel. For Google Sheets: go to sheets.google.com → File → Import → Upload the CSV file.
      </div>
    </div>
  )
}
