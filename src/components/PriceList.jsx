import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePriceList, useInventoryItems } from '../lib/data'
import { SectionTitle, Ok, Err, tableWrap, th, td } from './shared'
import { rs } from '../lib/data'
import { field, label, input, select, primaryBtn, actionBtn } from './formStyles'

export default function PriceList() {
  const { items, refresh } = usePriceList()
  const { invItems } = useInventoryItems()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newPages, setNewPages] = useState(1)
  const [newInvItem, setNewInvItem] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(item) {
    setEditing(item.id)
    setDraft({
      price_per_copy: item.price_per_copy,
      pages_per_unit: item.pages_per_unit || 1,
      inventory_item_id: item.inventory_item_id || '',
    })
  }

  async function saveEdit(id) {
    setSaving(true)
    const { error: e } = await supabase.from('print_items').update({
      price_per_copy: Number(draft.price_per_copy),
      pages_per_unit: Number(draft.pages_per_unit) || 1,
      inventory_item_id: draft.inventory_item_id || null,
    }).eq('id', id)
    setSaving(false)
    if (e) { setErr(e.message); return }
    setEditing(null)
    setOk('Updated.')
    refresh()
  }

  async function addItem() {
    setErr('')
    if (!newName.trim() || !newPrice || Number(newPrice) < 0) { setErr('Name and valid price required.'); return }
    setSaving(true)
    const { error: e } = await supabase.from('print_items').insert({
      item_name: newName.trim(),
      price_per_copy: Number(newPrice),
      pages_per_unit: Number(newPages) || 1,
      inventory_item_id: newInvItem || null,
    })
    setSaving(false)
    if (e) { setErr(e.message); return }
    setNewName(''); setNewPrice(''); setNewPages(1); setNewInvItem('')
    setOk('Item added.')
    refresh()
  }

  async function removeItem(id) {
    await supabase.from('print_items').update({ is_active: false }).eq('id', id)
    setOk('Item removed.')
    refresh()
  }

  return (
    <div>
      <Err msg={err} />
      <Ok msg={ok} />
      <SectionTitle>Price List</SectionTitle>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
        Set pages per item so inventory auto-deducts when records are added. Link each item to an inventory stock item.
      </p>

      <div style={{ ...tableWrap, marginBottom: 22 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>Item Name</th>
              <th style={{ ...th, textAlign: 'right' }}>Price/Copy</th>
              <th style={{ ...th, textAlign: 'center' }}>Pages/Unit</th>
              <th style={th}>Linked Stock</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td style={{ ...td, fontWeight: 700 }}>{it.item_name}</td>
                {editing === it.id ? (
                  <>
                    <td style={td}>
                      <input className="tabular" style={{ ...input, width: 90, textAlign: 'right' }} type="number"
                        value={draft.price_per_copy} onChange={e => setDraft(d => ({ ...d, price_per_copy: e.target.value }))} />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input style={{ ...input, width: 70, textAlign: 'center' }} type="number" min={1}
                        value={draft.pages_per_unit} onChange={e => setDraft(d => ({ ...d, pages_per_unit: e.target.value }))}
                        title="Pages consumed per copy of this item" />
                    </td>
                    <td style={td}>
                      <select style={{ ...select, minWidth: 140 }} value={draft.inventory_item_id}
                        onChange={e => setDraft(d => ({ ...d, inventory_item_id: e.target.value }))}>
                        <option value="">— No link —</option>
                        {invItems.map(inv => <option key={inv.id} value={inv.id}>{inv.item_name}</option>)}
                      </select>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button style={{ ...actionBtn, color: 'var(--success)' }} onClick={() => saveEdit(it.id)} disabled={saving}>✓ Save</button>
                        <button style={actionBtn} onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="tabular" style={{ ...td, textAlign: 'right' }}>{rs(it.price_per_copy)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                        {it.pages_per_unit || 1} pg
                      </span>
                    </td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--text-muted)' }}>
                      {it.inventory_item_id
                        ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ {invItems.find(i => i.id === it.inventory_item_id)?.item_name || 'Linked'}</span>
                        : <span>— Not linked</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button style={actionBtn} onClick={() => startEdit(it)}>Edit</button>
                        <button style={{ ...actionBtn, color: 'var(--danger)' }} onClick={() => removeItem(it.id)}>Remove</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new item */}
      <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 18 }}>
        <SectionTitle>Add New Item</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <div style={{ ...field, marginBottom: 0, gridColumn: 'span 2' }}>
            <label style={label}>Item Name *</label>
            <input style={input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Lamination" />
          </div>
          <div style={{ ...field, marginBottom: 0 }}>
            <label style={label}>Price/Copy (Rs.) *</label>
            <input style={input} type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0" />
          </div>
          <div style={{ ...field, marginBottom: 0 }}>
            <label style={label}>Pages per Copy</label>
            <input style={input} type="number" min={1} value={newPages} onChange={e => setNewPages(e.target.value)} placeholder="1" />
          </div>
          <div style={{ ...field, marginBottom: 0, gridColumn: 'span 2' }}>
            <label style={label}>Deduct from Stock Item</label>
            <select style={select} value={newInvItem} onChange={e => setNewInvItem(e.target.value)}>
              <option value="">— No inventory link —</option>
              {invItems.map(inv => <option key={inv.id} value={inv.id}>{inv.item_name}</option>)}
            </select>
          </div>
        </div>
        <button style={{ ...primaryBtn, marginTop: 14, width: 'auto', padding: '10px 22px' }} onClick={addItem} disabled={saving}>
          {saving ? 'Adding…' : 'Add Item'}
        </button>
      </div>
    </div>
  )
}
