import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useCashTransactions, useTransactionTypes, buildCashSummary, rs } from '../lib/data'
import { StatCard, Ok, Err, tableWrap, th, td } from './shared'
import { field, label, input, select, primaryBtn, actionBtn } from './formStyles'

export default function CashRegister() {
  const { profile, isClerk } = useAuth()
  const { transactions, loading, refresh } = useCashTransactions()
  const { types } = useTransactionTypes()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [typeId, setTypeId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [editId, setEditId] = useState(null)
  const [editDraft, setEditDraft] = useState({})

  const summary = useMemo(() => buildCashSummary(transactions), [transactions])

  // Dynamic totals per type — for dashboard cards
  const typeTotals = useMemo(() => {
    const m = {}
    for (const t of transactions) {
      const ct = t.custom_type
      if (!ct) continue
      const key = ct.id
      if (!m[key]) m[key] = { name: ct.type_name, effect: ct.cash_effect, total: 0, show: true }
      m[key].total += Number(t.amount) || 0
    }
    return m
  }, [transactions])

  // Cards to show: Cash in Hand + Manager Balance + each type that has transactions
  const dashCards = useMemo(() => {
    const cards = [
      { key: 'hand', label: 'Cash in Hand', value: rs(Math.abs(summary.cashInHand)), accent: summary.cashInHand >= 0 ? 'success' : 'danger', sub: summary.cashInHand < 0 ? '⚠ Deficit' : 'Available' },
      { key: 'mgr', label: 'Manager Balance', value: rs(Math.abs(summary.managerBalance)), accent: summary.managerBalance > 0 ? 'warning' : summary.managerBalance < 0 ? 'state-blue' : 'success', sub: summary.managerBalance > 0 ? 'You owe manager' : summary.managerBalance < 0 ? 'Manager owes you' : 'Settled' },
    ]
    // Add a card for each active type that has transactions and is marked show_on_dashboard
    for (const type of types) {
      const tot = typeTotals[type.id]
      if (tot && type.show_on_dashboard !== false) {
        cards.push({
          key: type.id,
          label: type.type_name.length > 18 ? type.type_name.slice(0, 18) + '…' : type.type_name,
          value: rs(tot.total),
          accent: type.cash_effect === 'cash_in' ? 'success' : 'warning',
          sub: type.cash_effect === 'cash_in' ? 'Total received' : 'Total paid out',
        })
      }
    }
    return cards
  }, [summary, typeTotals, types])

  const selectedType = types.find(t => t.id === typeId)
  const isIn = selectedType?.cash_effect === 'cash_in'

  async function addTransaction() {
    setErr('')
    if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount greater than 0.'); return }
    if (!typeId) { setErr('Select a transaction type.'); return }
    setSaving(true)
    const { error: e } = await supabase.from('cash_transactions').insert({
      entry_date: date,
      description: desc.trim() || null,
      amount: Number(amount),
      type: selectedType?.type_name || 'Other',
      custom_type_id: typeId,
      remarks: remarks.trim() || null,
      created_by: profile?.id || null,
      is_archived: false,
    })
    setSaving(false)
    if (e) { setErr('Could not save: ' + e.message); return }
    setDesc(''); setAmount(''); setRemarks(''); setTypeId('')
    setOk('Transaction added.'); refresh()
    setTimeout(() => setOk(''), 3000)
  }

  async function saveEdit(id) {
    const { error: e } = await supabase.from('cash_transactions').update({
      entry_date: editDraft.entry_date,
      description: editDraft.description || null,
      amount: Number(editDraft.amount),
      remarks: editDraft.remarks || null,
    }).eq('id', id)
    if (!e) { setEditId(null); setOk('Updated.'); refresh(); setTimeout(() => setOk(''), 3000) }
    else setErr(e.message)
  }

  async function archiveTxn(id) {
    await supabase.from('cash_transactions').update({ is_archived: true }).eq('id', id)
    setOk('Archived.'); refresh(); setTimeout(() => setOk(''), 3000)
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />

      {/* Dynamic summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 18 }}>
        {dashCards.map(card => (
          <StatCard key={card.key} label={card.label} value={card.value} accent={card.accent} sub={card.sub} />
        ))}
      </div>

      {summary.cashInHand < 0 && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid rgba(226,101,75,0.3)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠ Cash deficit of {rs(Math.abs(summary.cashInHand))} — outflows exceed inflows.
        </div>
      )}

      {/* Add transaction form */}
      {isClerk && (
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Log Cash Transaction
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ ...field, marginBottom: 0, minWidth: 120 }}>
              <label style={label}>Date</label>
              <input style={input} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ ...field, marginBottom: 0, flex: 2, minWidth: 150 }}>
              <label style={label}>Type *</label>
              <select style={select} value={typeId} onChange={e => setTypeId(e.target.value)}>
                <option value="">— Select type —</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
              </select>
            </div>
            <div style={{ ...field, marginBottom: 0, flex: 2, minWidth: 140 }}>
              <label style={label}>Description</label>
              <input style={input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Details…" />
            </div>
            <div style={{ ...field, marginBottom: 0, minWidth: 100 }}>
              <label style={label}>Amount (Rs.) *</label>
              <input style={input} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div style={{ ...field, marginBottom: 0, minWidth: 110 }}>
              <label style={label}>Remarks</label>
              <input style={input} value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
            <button style={{ ...primaryBtn, width: 'auto', padding: '11px 20px', alignSelf: 'flex-end' }} onClick={addTransaction} disabled={saving}>
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
          {selectedType && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Effect: <span style={{ color: isIn ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                {isIn ? '↑ Cash in hand increases' : '↓ Cash in hand decreases'}
              </span>
              {selectedType.manager_balance_effect !== 'none' && (
                <span style={{ marginLeft: 8 }}>
                  · Manager balance: {selectedType.manager_balance_effect === 'increase' ? '↑ increases (you owe more)' : '↓ decreases'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transactions table */}
      <div style={tableWrap}>
        {loading ? (
          <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading…</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--text-muted)' }}>No transactions yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Type</th>
                <th style={th}>Description</th>
                <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                <th style={th}>Remarks</th>
                {isClerk && <th style={th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const ct = t.custom_type
                const cashIn = ct?.cash_effect === 'cash_in'
                return editId === t.id ? (
                  <tr key={t.id} style={{ background: 'var(--bg-elevated)' }}>
                    <td style={td}><input style={{ ...input, width: 125 }} type="date" value={editDraft.entry_date} onChange={e => setEditDraft(d => ({ ...d, entry_date: e.target.value }))} /></td>
                    <td style={{ ...td, color: 'var(--text-muted)', fontSize: 12 }}>{ct?.type_name || t.type}</td>
                    <td style={td}><input style={{ ...input, minWidth: 140 }} value={editDraft.description || ''} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} /></td>
                    <td style={td}><input style={{ ...input, width: 90 }} type="number" value={editDraft.amount} onChange={e => setEditDraft(d => ({ ...d, amount: e.target.value }))} /></td>
                    <td style={td}><input style={{ ...input, minWidth: 110 }} value={editDraft.remarks || ''} onChange={e => setEditDraft(d => ({ ...d, remarks: e.target.value }))} /></td>
                    <td style={td}>
                      <button style={{ ...actionBtn, color: 'var(--success)', marginRight: 4 }} onClick={() => saveEdit(t.id)}>✓</button>
                      <button style={actionBtn} onClick={() => setEditId(null)}>✕</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id}>
                    <td className="tabular" style={{ ...td, whiteSpace: 'nowrap', fontSize: 12 }}>{t.entry_date}</td>
                    <td style={td}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 999 }}>
                        {ct?.type_name || t.type}
                      </span>
                    </td>
                    <td style={{ ...td, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || '—'}</td>
                    <td className="tabular" style={{ ...td, textAlign: 'right', color: cashIn ? 'var(--success)' : 'var(--danger)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {cashIn ? '+' : '−'}{rs(t.amount)}
                    </td>
                    <td style={{ ...td, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.remarks || '—'}</td>
                    {isClerk && (
                      <td style={td}>
                        <button style={{ ...actionBtn, marginRight: 4, fontSize: 11 }} onClick={() => { setEditId(t.id); setEditDraft({ entry_date: t.entry_date, description: t.description, amount: t.amount, remarks: t.remarks }) }}>Edit</button>
                        <button style={{ ...actionBtn, fontSize: 11 }} onClick={() => archiveTxn(t.id)}>Archive</button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {isClerk && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)' }}>
          💡 Add or remove transaction types and control which cards appear on this page in <strong style={{ color: 'var(--text-secondary)' }}>Settings → Cash Transaction Types</strong>.
        </div>
      )}
    </div>
  )
}
