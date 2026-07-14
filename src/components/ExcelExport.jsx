import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { SectionTitle, Ok, Err } from './shared'
import { primaryBtn, ghostBtn } from './formStyles'
import * as XLSX from 'xlsx'

function buildSheet(headers, rows) {
  const data = [headers, ...rows.map(r => r.map(v => v === null || v === undefined ? '' : v))]
  return XLSX.utils.aoa_to_sheet(data)
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}

export default function ExcelExport() {
  const [exporting, setExporting] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  const date = new Date().toISOString().slice(0, 10)

  async function fetchAllData() {
    const [records, cash, staff, inventory] = await Promise.all([
      supabase.from('print_records')
        .select('id,entry_date,description,copies,amount,amount_paid,remaining,status,payment_date,remarks,is_archived,person:staff!print_records_person_id_fkey(full_name,designation),other_person_name,created_at')
        .order('entry_date', { ascending: false }),
      supabase.from('cash_transactions')
        .select('id,entry_date,description,amount,type,remarks,is_archived,created_at,custom_type:custom_transaction_types(type_name,cash_effect,manager_balance_effect)')
        .order('entry_date', { ascending: false }),
      supabase.from('staff')
        .select('id,full_name,role,designation,ssm_code,is_active,created_at')
        .order('role').order('full_name'),
      supabase.from('inventory_transactions')
        .select('id,txn_type,quantity,description,source,created_at,item:inventory_items(item_name,unit)')
        .order('created_at', { ascending: false }),
    ])
    return {
      records: records.data || [],
      cash: cash.data || [],
      staff: staff.data || [],
      inventory: inventory.data || [],
    }
  }

  function makeRecordsSheet(records) {
    const headers = ['Date','Person','Designation','Description','Copies','Amount (Rs.)','Paid (Rs.)','Remaining (Rs.)','Status','Payment Date','Remarks','Archived']
    const rows = records.map(r => [
      r.entry_date,
      r.person?.full_name || r.other_person_name || '',
      r.person?.designation || 'Other',
      r.description || '',
      r.copies,
      Number(r.amount),
      Number(r.amount_paid || 0),
      Number(r.remaining || 0),
      r.status,
      r.payment_date || '',
      r.remarks || '',
      r.is_archived ? 'Yes' : 'No',
    ])
    return buildSheet(headers, rows)
  }

  function makeCashSheet(cash) {
    const headers = ['Date','Type','Cash Effect','Manager Balance Effect','Description','Amount (Rs.)','Remarks','Archived']
    const rows = cash.map(t => [
      t.entry_date,
      t.custom_type?.type_name || t.type || '',
      t.custom_type?.cash_effect === 'cash_in' ? 'Cash In (+)' : t.custom_type?.cash_effect === 'cash_out' ? 'Cash Out (-)' : 'None',
      t.custom_type?.manager_balance_effect || 'none',
      t.description || '',
      Number(t.amount),
      t.remarks || '',
      t.is_archived ? 'Yes' : 'No',
    ])
    return buildSheet(headers, rows)
  }

  function makeStaffSheet(staff) {
    const headers = ['Full Name','Role','Designation','SSM Code','Active','Created At']
    const rows = staff.map(s => [
      s.full_name,
      s.role,
      s.designation || '',
      s.ssm_code || '',
      s.is_active ? 'Yes' : 'No',
      new Date(s.created_at).toLocaleDateString('en-PK'),
    ])
    return buildSheet(headers, rows)
  }

  function makeInventorySheet(inventory) {
    const headers = ['Date','Item','Unit','Type','Quantity','Source','Note']
    const rows = inventory.map(t => [
      new Date(t.created_at).toLocaleDateString('en-PK'),
      t.item?.item_name || '',
      t.item?.unit || '',
      t.txn_type === 'stock_in' ? 'Stock In' : 'Stock Out',
      t.quantity,
      t.source,
      t.description || '',
    ])
    return buildSheet(headers, rows)
  }

  function makeSummarySheet(records, cash) {
    // Person summary
    const personMap = {}
    for (const r of records) {
      const name = r.person?.full_name || r.other_person_name || 'Unknown'
      if (!personMap[name]) personMap[name] = { billed: 0, paid: 0, pending: 0, copies: 0 }
      personMap[name].billed += Number(r.amount)
      personMap[name].paid += Number(r.amount_paid || 0)
      personMap[name].pending += Number(r.remaining || 0)
      personMap[name].copies += Number(r.copies)
    }
    const headers = ['Person','Total Copies','Total Billed (Rs.)','Total Paid (Rs.)','Pending (Rs.)']
    const rows = Object.entries(personMap).map(([name, d]) => [name, d.copies, d.billed, d.paid, d.pending])
    rows.push(['', '', '', '', ''])
    rows.push(['TOTAL', rows.reduce((s, r) => s + (Number(r[1]) || 0), 0), rows.reduce((s, r) => s + (Number(r[2]) || 0), 0), rows.reduce((s, r) => s + (Number(r[3]) || 0), 0), rows.reduce((s, r) => s + (Number(r[4]) || 0), 0)])
    return buildSheet(headers, rows)
  }

  async function exportFullBackup() {
    setErr(''); setExporting('full')
    try {
      const { records, cash, staff, inventory } = await fetchAllData()
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, makeSummarySheet(records, cash), 'Summary')
      XLSX.utils.book_append_sheet(wb, makeRecordsSheet(records), 'Print Records')
      XLSX.utils.book_append_sheet(wb, makeCashSheet(cash), 'Cash Transactions')
      XLSX.utils.book_append_sheet(wb, makeStaffSheet(staff), 'Staff')
      XLSX.utils.book_append_sheet(wb, makeInventorySheet(inventory), 'Inventory')
      downloadWorkbook(wb, `PrintDesk_Backup_${date}.xlsx`)
      setOk(`✓ Full backup downloaded! File: PrintDesk_Backup_${date}.xlsx (5 sheets inside)`)
    } catch (e) {
      setErr('Export failed: ' + e.message)
    }
    setExporting('')
    setTimeout(() => setOk(''), 6000)
  }

  async function exportRecords() {
    setErr(''); setExporting('records')
    try {
      const { data, error } = await supabase.from('print_records')
        .select('*,person:staff!print_records_person_id_fkey(full_name,designation)')
        .order('entry_date', { ascending: false })
      if (error) throw error
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, makeRecordsSheet(data || []), 'Print Records')
      downloadWorkbook(wb, `PrintDesk_Records_${date}.xlsx`)
      setOk(`✓ Exported ${(data || []).length} print records.`)
    } catch (e) { setErr('Export failed: ' + e.message) }
    setExporting('')
    setTimeout(() => setOk(''), 5000)
  }

  async function exportCash() {
    setErr(''); setExporting('cash')
    try {
      const { data, error } = await supabase.from('cash_transactions')
        .select('*,custom_type:custom_transaction_types(type_name,cash_effect,manager_balance_effect)')
        .order('entry_date', { ascending: false })
      if (error) throw error
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, makeCashSheet(data || []), 'Cash Transactions')
      downloadWorkbook(wb, `PrintDesk_Cash_${date}.xlsx`)
      setOk(`✓ Exported ${(data || []).length} cash transactions.`)
    } catch (e) { setErr('Export failed: ' + e.message) }
    setExporting('')
    setTimeout(() => setOk(''), 5000)
  }

  async function exportStaff() {
    setErr(''); setExporting('staff')
    try {
      const { data, error } = await supabase.from('staff')
        .select('*').order('role').order('full_name')
      if (error) throw error
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, makeStaffSheet(data || []), 'Staff')
      downloadWorkbook(wb, `PrintDesk_Staff_${date}.xlsx`)
      setOk(`✓ Exported ${(data || []).length} staff members.`)
    } catch (e) { setErr('Export failed: ' + e.message) }
    setExporting('')
    setTimeout(() => setOk(''), 5000)
  }

  async function exportInventory() {
    setErr(''); setExporting('inventory')
    try {
      const { data, error } = await supabase.from('inventory_transactions')
        .select('*,item:inventory_items(item_name,unit)')
        .order('created_at', { ascending: false })
      if (error) throw error
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, makeInventorySheet(data || []), 'Inventory History')
      downloadWorkbook(wb, `PrintDesk_Inventory_${date}.xlsx`)
      setOk(`✓ Exported ${(data || []).length} inventory movements.`)
    } catch (e) { setErr('Export failed: ' + e.message) }
    setExporting('')
    setTimeout(() => setOk(''), 5000)
  }

  return (
    <div>
      <SectionTitle>Excel Data Export</SectionTitle>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Download your data as Excel (.xlsx) files. Full backup contains all data in one workbook with 5 sheets. Clerk only.
      </p>

      <Err msg={err} />
      <Ok msg={ok} />

      {/* Full backup */}
      <div style={{ background: 'var(--bg-surface)', border: '2px solid var(--gold-border)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', marginBottom: 6 }}>📦 Full Backup — One Excel File</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.6 }}>
          Downloads <strong style={{ color: 'var(--text-secondary)' }}>one .xlsx file</strong> with <strong style={{ color: 'var(--text-secondary)' }}>5 sheets inside</strong>: Summary, Print Records, Cash Transactions, Staff, Inventory.<br />
          Open in Microsoft Excel and switch between sheets using tabs at the bottom.
        </div>
        <button style={{ ...primaryBtn, width: 'auto', padding: '11px 28px', marginTop: 12 }} onClick={exportFullBackup} disabled={!!exporting}>
          {exporting === 'full' ? '⏳ Exporting all data…' : '⬇ Download Full Backup (.xlsx)'}
        </button>
      </div>

      {/* Individual exports */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { key: 'records', label: '📄 Print Records', desc: 'All print records with amounts and status', fn: exportRecords },
          { key: 'cash', label: '💰 Cash Transactions', desc: 'All cash entries with type effects', fn: exportCash },
          { key: 'staff', label: '👤 Staff List', desc: 'All staff with roles and designations', fn: exportStaff },
          { key: 'inventory', label: '📦 Inventory History', desc: 'All stock movements with dates', fn: exportInventory },
        ].map(item => (
          <div key={item.key} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px 18px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 5 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>{item.desc}</div>
            <button style={{ ...ghostBtn, width: '100%', textAlign: 'center', padding: '9px' }}
              onClick={item.fn} disabled={!!exporting}>
              {exporting === item.key ? '⏳ Exporting…' : '⬇ Export .xlsx'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        💡 Files download as <strong style={{ color: 'var(--text-secondary)' }}>.xlsx</strong> — open directly in Microsoft Excel. Full backup has multiple sheets — look for the sheet tabs at the bottom of Excel.
      </div>
    </div>
  )
}
