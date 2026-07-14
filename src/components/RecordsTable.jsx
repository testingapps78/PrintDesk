import { useState, useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { useStaff, usePrintRecords, usePriceList, daysOverdue, rs } from '../lib/data'
import { supabase } from '../lib/supabase'
import { StatusChip, Err, Ok, SectionTitle } from './shared'
import Modal from './Modal'
import { field, label, input, select, primaryBtn, ghostBtn, actionBtn } from './formStyles'

const PAGE_SIZES = [10, 20, 50, 100]

export default function RecordsTable() {
  const { profile, isClerk, canViewAll } = useAuth()
  const { staff } = useStaff()
  const { items: priceItems } = usePriceList()

  const [statusFilter, setStatusFilter] = useState('All')
  const [personFilter, setPersonFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [editRec, setEditRec] = useState(null)
  const [statusRec, setStatusRec] = useState(null)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [bulkPaying, setBulkPaying] = useState(false)

  const filters = useMemo(() => ({
    status: statusFilter !== 'All' ? statusFilter : undefined,
    personId: (canViewAll && personFilter !== 'all') ? personFilter : (!canViewAll ? profile?.id : undefined),
    month: monthFilter || undefined,
  }), [statusFilter, personFilter, monthFilter, canViewAll, profile?.id])

  const { records, loading, refresh } = usePrintRecords(filters)

  // Month options from records
  const months = useMemo(() => {
    const m = new Set(records.map(r => r.entry_date?.slice(0, 7)).filter(Boolean))
    return Array.from(m).sort().reverse()
  }, [records])

  const totalPages = Math.ceil(records.length / pageSize)
  const pageRecs = records.slice((page - 1) * pageSize, page * pageSize)

  const setStatus = (s) => { setStatusFilter(s); setPage(1) }
  const setPerson = (p) => { setPersonFilter(p); setPage(1) }
  const setMonth = (m) => { setMonthFilter(m); setPage(1) }

  const toggleSel = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(selected.size === pageRecs.length ? new Set() : new Set(pageRecs.map(r => r.id)))

  async function bulkPay() {
    if (!selected.size) return
    setBulkPaying(true)
    const toUpdate = records.filter(r => selected.has(r.id))
    await Promise.all(toUpdate.map(r =>
      supabase.from('print_records').update({ status: 'Paid', amount_paid: r.amount, payment_date: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }).eq('id', r.id)
    ))
    setSelected(new Set())
    setOk(`${toUpdate.length} records marked as Paid.`)
    setBulkPaying(false)
    refresh()
  }

  async function archiveRec(id) {
    await supabase.from('print_records').update({ is_archived: true }).eq('id', id)
    setOk('Archived.'); refresh()
  }
  async function deleteRec(id) {
    if (!window.confirm('Delete this record permanently?')) return
    await supabase.from('print_records').delete().eq('id', id)
    setOk('Deleted.'); refresh()
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {['All', 'Pending', 'Partially Paid', 'Paid'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            style={{ background: statusFilter === s ? 'var(--gold-soft)' : 'var(--bg-surface)', border: statusFilter === s ? '1px solid var(--gold-border)' : '1px solid var(--border-subtle)', color: statusFilter === s ? 'var(--gold)' : 'var(--text-secondary)', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {s}
          </button>
        ))}

        {canViewAll && (
          <select value={personFilter} onChange={e => setPerson(e.target.value)}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 12.5, fontFamily: 'var(--font-ui)' }}>
            <option value="all">All persons</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        )}

        <select value={monthFilter} onChange={e => setMonth(e.target.value)}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 12.5, fontFamily: 'var(--font-ui)' }}>
          <option value="">All months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', fontSize: 12.5, fontFamily: 'var(--font-ui)' }}>
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
          {isClerk && (
            <button style={{ background: 'var(--gold)', color: 'var(--text-on-accent)', border: 'none', padding: '7px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }} onClick={() => setShowAdd(true)}>
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions bar */}
      {isClerk && selected.size > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: 'var(--gold-soft)', border: '1px solid var(--gold-border)', borderRadius: 'var(--radius-sm)', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>{selected.size} selected</span>
          <button onClick={bulkPay} disabled={bulkPaying}
            style={{ background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '5px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            {bulkPaying ? '…' : '✓ Mark Paid'}
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ background: 'transparent', border: '1px solid var(--gold-border)', color: 'var(--gold)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      )}

      {/* Table — hidden on mobile, cards shown instead */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'auto', marginBottom: 12 }}>
        {loading ? (
          <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--text-muted)' }}>No records found.</div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="records-desktop-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {isClerk && <th style={th}><input type="checkbox" onChange={toggleAll} checked={selected.size > 0 && selected.size === pageRecs.length} /></th>}
                  <th style={th}>Date</th>
                  <th style={th}>Person</th>
                  <th style={th}>Description</th>
                  <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...th, textAlign: 'right' }}>Paid</th>
                  <th style={{ ...th, textAlign: 'right' }}>Due</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'center' }}>Days</th>
                  {isClerk && <th style={th}></th>}
                </tr>
              </thead>
              <tbody>
                {pageRecs.map(r => {
                  const overdue = r.status !== 'Paid' ? daysOverdue(r.entry_date) : 0
                  return (
                    <tr key={r.id} style={{ background: selected.has(r.id) ? 'var(--gold-soft)' : undefined }}>
                      {isClerk && <td style={td}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} /></td>}
                      <td className="tabular" style={{ ...td, whiteSpace: 'nowrap', fontSize: 12 }}>{r.entry_date}</td>
                      <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.person?.full_name || r.other_person_name}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description}>{r.description}</td>
                      <td className="tabular" style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{rs(r.amount)}</td>
                      <td className="tabular" style={{ ...td, textAlign: 'right', color: 'var(--success)', whiteSpace: 'nowrap' }}>{rs(r.amount_paid || 0)}</td>
                      <td className="tabular" style={{ ...td, textAlign: 'right', color: (r.remaining || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: (r.remaining || 0) > 0 ? 700 : 400, whiteSpace: 'nowrap' }}>{rs(r.remaining || 0)}</td>
                      <td style={td}><StatusChip status={r.status} /></td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {overdue > 0
                          ? <span style={{ color: overdue > 30 ? 'var(--danger)' : overdue > 7 ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 12 }}>{overdue}d</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      {isClerk && (
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 4, whiteSpace: 'nowrap' }}>
                            <button style={{ ...actionBtn, fontSize: 11 }} onClick={() => setEditRec(r)}>Edit</button>
                            <button style={{ ...actionBtn, fontSize: 11 }} onClick={() => setStatusRec(r)}>Status</button>
                            <button style={{ ...actionBtn, fontSize: 11 }} onClick={() => archiveRec(r.id)}>Archive</button>
                            <button style={{ ...actionBtn, fontSize: 11, color: 'var(--danger)' }} onClick={() => deleteRec(r.id)}>Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="records-mobile-cards" style={{ display: 'none' }}>
              {pageRecs.map(r => {
                const overdue = r.status !== 'Paid' ? daysOverdue(r.entry_date) : 0
                return (
                  <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: selected.has(r.id) ? 'var(--gold-soft)' : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.person?.full_name || r.other_person_name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{r.entry_date} {overdue > 0 && <span style={{ color: overdue > 30 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700, marginLeft: 6 }}>{overdue}d overdue</span>}</div>
                      </div>
                      <StatusChip status={r.status} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>{r.description}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 10 }}>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Amount</span><div className="tabular" style={{ fontWeight: 700 }}>{rs(r.amount)}</div></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Paid</span><div className="tabular" style={{ color: 'var(--success)', fontWeight: 700 }}>{rs(r.amount_paid || 0)}</div></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Due</span><div className="tabular" style={{ color: (r.remaining || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>{rs(r.remaining || 0)}</div></div>
                    </div>
                    {isClerk && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={actionBtn} onClick={() => setEditRec(r)}>Edit</button>
                        <button style={actionBtn} onClick={() => setStatusRec(r)}>Status</button>
                        <button style={actionBtn} onClick={() => archiveRec(r.id)}>Archive</button>
                        <button style={{ ...actionBtn, color: 'var(--danger)' }} onClick={() => deleteRec(r.id)}>Del</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={pgBtn} onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button style={pgBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '0 8px' }}>
            {page}/{totalPages} ({records.length} records)
          </span>
          <button style={pgBtn} onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
          <button style={pgBtn} onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}

      {showAdd && <AddModal staff={staff} priceItems={priceItems} profile={profile} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refresh(); setOk('Record added.') }} />}
      {editRec && <EditModal record={editRec} onClose={() => setEditRec(null)} onSaved={() => { setEditRec(null); refresh(); setOk('Record updated.') }} />}
      {statusRec && <StatusModal record={statusRec} onClose={() => setStatusRec(null)} onSaved={() => { setStatusRec(null); refresh(); setOk('Status updated.') }} />}
    </div>
  )
}

const th = { textAlign: 'left', padding: '9px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }
const td = { padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)' }
const pgBtn = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer' }

// ── Add Record Modal ───────────────────────────────────────────────────
function AddModal({ staff, priceItems, profile, onClose, onSaved }) {
  const [personId, setPersonId] = useState('')
  const [otherName, setOtherName] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')
  const [lineItems, setLineItems] = useState([])
  const [pickItem, setPickItem] = useState(priceItems[0]?.id || '')
  const [pickQty, setPickQty] = useState(1)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totals = useMemo(() => ({
    copies: lineItems.reduce((s, i) => s + i.qty, 0),
    amount: lineItems.reduce((s, i) => s + i.qty * i.price, 0),
    pages: lineItems.reduce((s, i) => s + i.qty * (i.pagesPerUnit || 1), 0),
  }), [lineItems])

  function addLine() {
    if (pickItem === 'custom') {
      if (!customName.trim() || !customPrice) { setError('Enter name and price.'); return }
      setLineItems(a => [...a, { name: customName.trim(), price: Number(customPrice), qty: Number(pickQty) || 1, pagesPerUnit: 1, inventoryItemId: null }])
      setCustomName(''); setCustomPrice('')
    } else {
      const it = priceItems.find(p => p.id === pickItem)
      if (!it) return
      setLineItems(a => [...a, { name: it.item_name, price: Number(it.price_per_copy), qty: Number(pickQty) || 1, pagesPerUnit: it.pages_per_unit || 1, inventoryItemId: it.inventory_item_id }])
    }
    setPickQty(1); setError('')
  }

  async function save() {
    setError('')
    if (!personId && !otherName.trim()) { setError('Select a person or enter a name.'); return }
    if (lineItems.length === 0) { setError('Add at least one item.'); return }
    setSaving(true)
    const description = lineItems.map(i => `${i.name} x${i.qty}`).join(' + ')
    const { data: newRec, error: e } = await supabase.from('print_records').insert({
      person_id: personId || null,
      other_person_name: personId ? null : otherName.trim(),
      entry_date: entryDate,
      description,
      copies: totals.copies,
      amount: totals.amount,
      amount_paid: 0,
      status: 'Pending',
      remarks: remarks.trim() || null,
      created_by: profile?.id || null,
    }).select('id').single()

    if (e) { setError('Could not save: ' + e.message); setSaving(false); return }

    // Auto-deduct from inventory per item
    const deductions = {}
    for (const li of lineItems) {
      if (li.inventoryItemId && li.pagesPerUnit > 0) {
        const pages = li.qty * li.pagesPerUnit
        deductions[li.inventoryItemId] = (deductions[li.inventoryItemId] || 0) + pages
      }
    }
    if (Object.keys(deductions).length > 0 && newRec?.id) {
      await Promise.all(Object.entries(deductions).map(([itemId, qty]) =>
        supabase.from('inventory_transactions').insert({
          item_id: itemId,
          txn_type: 'stock_out',
          quantity: qty,
          description: `Auto-deduct for print record: ${description}`,
          source: 'auto',
          print_record_id: newRec.id,
          created_by: profile?.id || null,
        })
      ))
    }
    setSaving(false)
    onSaved()
  }

  return (
    <Modal title="Add Print Record" onClose={onClose} width={520}>
      <div style={field}>
        <label style={label}>Person</label>
        <select style={select} value={personId} onChange={e => setPersonId(e.target.value)}>
          <option value="">— Select person —</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.designation || s.role})</option>)}
        </select>
      </div>
      {!personId && <div style={field}><label style={label}>Or type a name</label><input style={input} value={otherName} onChange={e => setOtherName(e.target.value)} placeholder="e.g. Muhammad Bilal" /></div>}
      <div style={field}><label style={label}>Date</label><input style={input} type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} /></div>

      <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 14 }}>
        <label style={{ ...label, display: 'block', marginBottom: 8 }}>Add Item</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={{ ...select, flex: 2 }} value={pickItem} onChange={e => setPickItem(e.target.value)}>
            {priceItems.map(p => <option key={p.id} value={p.id}>{p.item_name} — {rs(p.price_per_copy)}/copy ({p.pages_per_unit || 1}pg)</option>)}
            <option value="custom">Custom item…</option>
          </select>
          <input style={{ ...input, width: 70 }} type="number" min={1} value={pickQty} onChange={e => setPickQty(e.target.value)} placeholder="Qty" />
        </div>
        {pickItem === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input style={{ ...input, flex: 2 }} value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Item name" />
            <input style={{ ...input, flex: 1 }} type="number" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="Rs./copy" />
          </div>
        )}
        <button type="button" style={{ ...ghostBtn, marginTop: 10, width: '100%' }} onClick={addLine}>+ Add to entry</button>
      </div>

      {lineItems.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {lineItems.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
              <span style={{ flex: 1 }}>{it.name} <span style={{ color: 'var(--text-muted)' }}>×{it.qty}</span> <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({it.qty * (it.pagesPerUnit || 1)} pages)</span></span>
              <span className="tabular" style={{ color: 'var(--text-secondary)' }}>{rs(it.price * it.qty)}</span>
              <button onClick={() => setLineItems(a => a.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 4px 0', fontWeight: 700, fontSize: 13.5 }}>
            <span>{totals.copies} copies · {totals.pages} pages</span>
            <span className="tabular" style={{ color: 'var(--gold)' }}>{rs(totals.amount)}</span>
          </div>
        </div>
      )}

      <div style={field}><label style={label}>Remarks (optional)</label><input style={input} value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      <button style={primaryBtn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Record'}</button>
    </Modal>
  )
}

// ── Edit Record Modal ─────────────────────────────────────────────────
function EditModal({ record, onClose, onSaved }) {
  const [date, setDate] = useState(record.entry_date)
  const [desc, setDesc] = useState(record.description || '')
  const [copies, setCopies] = useState(record.copies)
  const [amount, setAmount] = useState(record.amount)
  const [remarks, setRemarks] = useState(record.remarks || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const newAmount = Number(amount)
    const newRemaining = Math.max(0, newAmount - Number(record.amount_paid || 0))
    await supabase.from('print_records').update({
      entry_date: date, description: desc, copies: Number(copies),
      amount: newAmount,
      remarks: remarks || null, updated_at: new Date().toISOString(),
    }).eq('id', record.id)
    setSaving(false); onSaved()
  }

  return (
    <Modal title="Edit Record" onClose={onClose} width={420}>
      <div style={field}><label style={label}>Date</label><input style={input} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <div style={field}><label style={label}>Description</label><input style={input} value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ ...field, flex: 1 }}><label style={label}>Copies</label><input style={input} type="number" value={copies} onChange={e => setCopies(e.target.value)} /></div>
        <div style={{ ...field, flex: 1 }}><label style={label}>Amount (Rs.)</label><input style={input} type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
      </div>
      <div style={field}><label style={label}>Remarks</label><input style={input} value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
      <button style={primaryBtn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
    </Modal>
  )
}

// ── Status Modal ──────────────────────────────────────────────────────
function StatusModal({ record, onClose, onSaved }) {
  const [status, setStatus] = useState(record.status)
  const [amountPaid, setAmountPaid] = useState(record.amount_paid || 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    let finalStatus = status
    let finalPaid = Number(amountPaid) || 0
    if (status === 'Paid') { finalPaid = Number(record.amount) }
    else if (status === 'Partially Paid') {
      if (finalPaid <= 0) { setError('Enter amount paid.'); return }
      if (finalPaid >= Number(record.amount)) { finalStatus = 'Paid'; finalPaid = Number(record.amount) }
    } else { finalPaid = 0 }
    setSaving(true)
    await supabase.from('print_records').update({
      status: finalStatus,
      amount_paid: finalPaid,
      payment_date: finalStatus === 'Paid' ? new Date().toISOString().slice(0, 10) : record.payment_date,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id)
    setSaving(false); onSaved()
  }

  return (
    <Modal title="Update Payment Status" onClose={onClose} width={400}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        <strong>{record.person?.full_name || record.other_person_name}</strong> · {record.description}
        <div className="tabular" style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>Total: {rs(record.amount)}</div>
      </div>
      <div style={field}><label style={label}>Status</label>
        <select style={select} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="Pending">Pending</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Paid (full amount)</option>
        </select>
      </div>
      {status === 'Partially Paid' && (
        <div style={field}><label style={label}>Amount paid (Rs.)</label>
          <input style={input} type="number" min={0} max={record.amount} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Remaining: {rs(Number(record.amount) - Number(amountPaid || 0))}</div>
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      <button style={primaryBtn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </Modal>
  )
}
