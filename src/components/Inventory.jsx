import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useInventory } from '../lib/data'
import { SectionTitle, Ok, Err, tableWrap, th, td } from './shared'
import { field, label, input, select, primaryBtn, ghostBtn } from './formStyles'

export default function Inventory() {
  const { profile, isClerk } = useAuth()
  const { items, history, loading, refresh } = useInventory()
  const [showAddStock, setShowAddStock] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [txnItemId, setTxnItemId] = useState('')
  const [txnType, setTxnType] = useState('stock_in')
  const [txnQty, setTxnQty] = useState('')
  const [txnNote, setTxnNote] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('pages')
  const [newItemThreshold, setNewItemThreshold] = useState(100)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  async function addStock() {
    setErr('')
    if (!txnItemId) { setErr('Please select an item.'); return }
    if (!txnQty || Number(txnQty) <= 0) { setErr('Enter a valid quantity greater than 0.'); return }
    setSaving(true)
    const { error: e } = await supabase.from('inventory_transactions').insert({
      item_id: txnItemId,
      txn_type: txnType,
      quantity: Number(txnQty),
      description: txnNote.trim() || null,
      source: 'manual',
      created_by: profile?.id || null,
    })
    setSaving(false)
    if (e) { setErr('Could not save: ' + e.message); return }
    setTxnQty(''); setTxnNote('')
    setOk(txnType === 'stock_in' ? `Added ${txnQty} to stock.` : `Removed ${txnQty} from stock.`)
    refresh()
    setTimeout(() => setOk(''), 4000)
  }

  async function addItem() {
    setErr('')
    if (!newItemName.trim()) { setErr('Item name is required.'); return }
    setSaving(true)
    const { error: e } = await supabase.from('inventory_items').insert({
      item_name: newItemName.trim(),
      unit: newItemUnit,
      low_stock_threshold: Number(newItemThreshold) || 100,
      is_active: true,
      created_by: profile?.id || null,
    })
    setSaving(false)
    if (e) { setErr('Could not add item: ' + e.message); return }
    setNewItemName('')
    setOk('New item added successfully.')
    setShowAddItem(false)
    refresh()
    setTimeout(() => setOk(''), 4000)
  }

  async function removeItem(id, name) {
    if (!window.confirm(`Remove "${name}" from inventory?\n\nAll stock history will be kept. You can add it again later.`)) return
    setSaving(true)
    const { error: e } = await supabase.from('inventory_items')
      .update({ is_active: false })
      .eq('id', id)
    setSaving(false)
    if (e) { setErr('Could not remove: ' + e.message); return }
    setOk(`"${name}" removed.`)
    refresh()
    setTimeout(() => setOk(''), 4000)
  }

  return (
    <div>
      <Err msg={err} />
      <Ok msg={ok} />

      {/* Stock summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
        {items.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>
            No inventory items yet. Add one below.
          </div>
        ) : items.map(item => {
          const qty = item.current_stock || 0
          const isLow = qty <= (item.low_stock_threshold || 100)
          return (
            <div key={item.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderTop: `2px solid ${qty <= 0 ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)'}`, borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 }}>{item.item_name}</div>
              <div className="tabular" style={{ fontSize: 22, fontWeight: 800, color: qty <= 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                {qty} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>{item.unit}</span>
              </div>
              <div style={{ fontSize: 11.5, marginTop: 3, color: qty <= 0 ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)' }}>
                {qty <= 0 ? '🔴 Out of stock' : isLow ? '⚠ Low stock' : '✓ In stock'}
              </div>
              {isClerk && (
                <button
                  onClick={() => removeItem(item.id, item.item_name)}
                  style={{ marginTop: 8, background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Remove item
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      {isClerk && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <button style={ghostBtn} onClick={() => { setShowAddStock(v => !v); setShowAddItem(false) }}>
            {showAddStock ? '✕ Close' : '+ Add / Adjust Stock'}
          </button>
          <button style={ghostBtn} onClick={() => { setShowAddItem(v => !v); setShowAddStock(false) }}>
            {showAddItem ? '✕ Close' : '+ New Item Type'}
          </button>
        </div>
      )}

      {/* Add stock form */}
      {showAddStock && isClerk && (
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 18 }}>
          <SectionTitle>Add / Adjust Stock</SectionTitle>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ ...field, marginBottom: 0, flex: 2, minWidth: 160 }}>
              <label style={label}>Item *</label>
              <select style={select} value={txnItemId} onChange={e => setTxnItemId(e.target.value)}>
                <option value="">— Select item —</option>
                {items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.item_name} ({it.current_stock || 0} {it.unit} in stock)
                  </option>
                ))}
              </select>
            </div>
            <div style={{ ...field, marginBottom: 0, minWidth: 150 }}>
              <label style={label}>Type</label>
              <select style={select} value={txnType} onChange={e => setTxnType(e.target.value)}>
                <option value="stock_in">↑ Stock In (purchase/receive)</option>
                <option value="stock_out">↓ Stock Out (manual removal)</option>
              </select>
            </div>
            <div style={{ ...field, marginBottom: 0, minWidth: 100 }}>
              <label style={label}>Quantity *</label>
              <input style={input} type="number" min={1} value={txnQty}
                onChange={e => setTxnQty(e.target.value)} placeholder="0" />
            </div>
            <div style={{ ...field, marginBottom: 0, flex: 1, minWidth: 150 }}>
              <label style={label}>Note (optional)</label>
              <input style={input} value={txnNote}
                onChange={e => setTxnNote(e.target.value)} placeholder="e.g. Bought 1 ream 500 pages" />
            </div>
            <button
              style={{ ...primaryBtn, width: 'auto', padding: '11px 20px', alignSelf: 'flex-end' }}
              onClick={addStock} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* New item form */}
      {showAddItem && isClerk && (
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 18 }}>
          <SectionTitle>New Inventory Item</SectionTitle>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ ...field, marginBottom: 0, flex: 2, minWidth: 160 }}>
              <label style={label}>Item Name *</label>
              <input style={input} value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="e.g. A4 Paper, Toner Cartridge" />
            </div>
            <div style={{ ...field, marginBottom: 0, minWidth: 120 }}>
              <label style={label}>Unit</label>
              <select style={select} value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)}>
                <option value="pages">pages</option>
                <option value="reams">reams</option>
                <option value="units">units</option>
                <option value="bottles">bottles</option>
                <option value="cartridges">cartridges</option>
              </select>
            </div>
            <div style={{ ...field, marginBottom: 0, minWidth: 130 }}>
              <label style={label}>Low Stock Alert at</label>
              <input style={input} type="number" value={newItemThreshold}
                onChange={e => setNewItemThreshold(e.target.value)} placeholder="100" />
            </div>
            <button
              style={{ ...primaryBtn, width: 'auto', padding: '11px 20px', alignSelf: 'flex-end' }}
              onClick={addItem} disabled={saving}>
              {saving ? 'Adding…' : 'Add Item'}
            </button>
          </div>
        </div>
      )}

      {/* Stock History */}
      <SectionTitle>Stock History</SectionTitle>
      <div style={tableWrap}>
        {loading ? (
          <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading…</div>
        ) : history.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--text-muted)' }}>No stock movements yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Item</th>
                <th style={th}>Type</th>
                <th style={{ ...th, textAlign: 'right' }}>Quantity</th>
                <th style={th}>Source</th>
                <th style={th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {history.map(t => (
                <tr key={t.id}>
                  <td className="tabular" style={{ ...td, whiteSpace: 'nowrap', fontSize: 12 }}>
                    {new Date(t.created_at).toLocaleDateString('en-PK')}
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{t.item?.item_name || '—'}</td>
                  <td style={td}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: t.txn_type === 'stock_in' ? 'var(--success)' : 'var(--danger)', background: t.txn_type === 'stock_in' ? 'var(--success-soft)' : 'var(--danger-soft)' }}>
                      {t.txn_type === 'stock_in' ? '↑ Stock In' : '↓ Stock Out'}
                    </span>
                  </td>
                  <td className="tabular" style={{ ...td, textAlign: 'right', fontWeight: 700, color: t.txn_type === 'stock_in' ? 'var(--success)' : 'var(--danger)' }}>
                    {t.txn_type === 'stock_in' ? '+' : '-'}{t.quantity} {t.item?.unit}
                  </td>
                  <td style={{ ...td, fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {t.source === 'auto' ? '🤖 auto' : '✋ manual'}
                  </td>
                  <td style={{ ...td, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.description || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
