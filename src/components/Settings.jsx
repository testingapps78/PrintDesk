import { useState } from 'react'
import { useSettings, useTransactionTypes } from '../lib/data'
import { supabase } from '../lib/supabase'
import { SectionTitle, Ok, Err } from './shared'
import { field, label, input, select, primaryBtn, ghostBtn, actionBtn, textarea } from './formStyles'

export default function Settings() {
  const { settings, updateSetting } = useSettings()
  const { types, refresh: refreshTypes } = useTransactionTypes()
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  // Bill header state
  const bh = settings.bill_header || {}
  const [officeName, setOfficeName] = useState(bh.office_name || 'State Life Insurance Corporation of Pakistan')
  const [areaName, setAreaName] = useState(bh.area_name || 'Area 9219')
  const [address, setAddress] = useState(bh.address || 'Jhang Zone')
  const [contact, setContact] = useState(bh.contact || '')

  // Overdue thresholds
  const [yellowDays, setYellowDays] = useState(settings.overdue_yellow_days || 7)
  const [redDays, setRedDays] = useState(settings.overdue_red_days || 30)

  // App prefs
  const [defaultPageSize, setDefaultPageSize] = useState(settings.default_page_size || 10)

  // New transaction type form
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeDesc, setNewTypeDesc] = useState('')
  const [newTypeCashEffect, setNewTypeCashEffect] = useState('cash_in')
  const [newTypeMgrEffect, setNewTypeMgrEffect] = useState('none')
  const [savingType, setSavingType] = useState(false)

  async function saveBillHeader() {
    await updateSetting('bill_header', { office_name: officeName, area_name: areaName, address, contact })
    setOk('Bill header saved.')
  }

  async function saveThresholds() {
    await updateSetting('overdue_yellow_days', Number(yellowDays))
    await updateSetting('overdue_red_days', Number(redDays))
    setOk('Overdue thresholds saved.')
  }

  async function savePageSize() {
    await updateSetting('default_page_size', Number(defaultPageSize))
    setOk('Page size preference saved.')
  }

  async function addTransactionType() {
    if (!newTypeName.trim()) { setErr('Type name is required.'); return }
    setSavingType(true)
    const { error: e } = await supabase.from('custom_transaction_types').insert({
      type_name: newTypeName.trim(),
      description: newTypeDesc.trim() || null,
      cash_effect: newTypeCashEffect,
      manager_balance_effect: newTypeMgrEffect,
      inventory_effect: 'none',
      is_active: true,
      sort_order: types.length + 1,
    })
    setSavingType(false)
    if (e) { setErr(e.message); return }
    setNewTypeName(''); setNewTypeDesc(''); setOk('Transaction type added.')
    refreshTypes()
  }

  async function toggleType(id, currentState) {
    await supabase.from('custom_transaction_types').update({ is_active: !currentState }).eq('id', id)
    refreshTypes()
  }

  async function deleteType(id) {
    if (!window.confirm('Remove this transaction type? Existing transactions will keep their data.')) return
    await supabase.from('custom_transaction_types').update({ is_active: false }).eq('id', id)
    setOk('Type removed.'); refreshTypes()
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <Err msg={err} />
      <Ok msg={ok} />

      {/* Bill Header */}
      <section style={sec}>
        <SectionTitle>Bill / PDF Header</SectionTitle>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>This text appears at the top of every printed bill.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ ...field, marginBottom: 0 }}>
            <label style={label}>Organisation Name</label>
            <input style={input} value={officeName} onChange={e => setOfficeName(e.target.value)} />
          </div>
          <div style={{ ...field, marginBottom: 0 }}>
            <label style={label}>Area Name</label>
            <input style={input} value={areaName} onChange={e => setAreaName(e.target.value)} />
          </div>
          <div style={{ ...field, marginBottom: 0 }}>
            <label style={label}>Address / Zone</label>
            <input style={input} value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div style={{ ...field, marginBottom: 0 }}>
            <label style={label}>Contact (optional)</label>
            <input style={input} value={contact} onChange={e => setContact(e.target.value)} placeholder="Phone or email" />
          </div>
        </div>
        <button style={{ ...primaryBtn, marginTop: 14, width: 'auto', padding: '10px 20px' }} onClick={saveBillHeader}>Save Header</button>
      </section>

      {/* Overdue thresholds */}
      <section style={sec}>
        <SectionTitle>Overdue Warning Thresholds</SectionTitle>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>Days after which overdue warnings appear in the dashboard.</p>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ ...field, marginBottom: 0, flex: 1 }}>
            <label style={label}>⚠ Yellow warning after (days)</label>
            <input style={input} type="number" min={1} value={yellowDays} onChange={e => setYellowDays(e.target.value)} />
          </div>
          <div style={{ ...field, marginBottom: 0, flex: 1 }}>
            <label style={label}>🔴 Red warning after (days)</label>
            <input style={input} type="number" min={1} value={redDays} onChange={e => setRedDays(e.target.value)} />
          </div>
        </div>
        <button style={{ ...primaryBtn, marginTop: 14, width: 'auto', padding: '10px 20px' }} onClick={saveThresholds}>Save Thresholds</button>
      </section>

      {/* Page size */}
      <section style={sec}>
        <SectionTitle>App Preferences</SectionTitle>
        <div style={{ ...field, maxWidth: 200 }}>
          <label style={label}>Default records per page</label>
          <select style={select} value={defaultPageSize} onChange={e => setDefaultPageSize(e.target.value)}>
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button style={{ ...primaryBtn, width: 'auto', padding: '10px 20px' }} onClick={savePageSize}>Save Preferences</button>
      </section>

      {/* Transaction Types Manager */}
      <section style={sec}>
        <SectionTitle>Cash Transaction Types</SectionTitle>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
          Define what types of cash transactions exist and how each affects your cash balance and manager account.
        </p>

        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Type Name</th>
                <th style={th}>Cash Effect</th>
                <th style={th}>Manager Balance</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map(t => (
                <tr key={t.id}>
                  <td style={{ ...td, fontWeight: 700 }}>{t.type_name}</td>
                  <td style={td}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: t.cash_effect === 'cash_in' ? 'var(--success)' : t.cash_effect === 'cash_out' ? 'var(--danger)' : 'var(--text-muted)', background: t.cash_effect === 'cash_in' ? 'var(--success-soft)' : t.cash_effect === 'cash_out' ? 'var(--danger-soft)' : 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 999 }}>
                      {t.cash_effect === 'cash_in' ? '↑ Increases' : t.cash_effect === 'cash_out' ? '↓ Decreases' : '— No effect'}
                    </span>
                  </td>
                  <td style={{ ...td, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t.manager_balance_effect === 'increase' ? '↑ Increases' : t.manager_balance_effect === 'decrease' ? '↓ Decreases' : '—'}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: t.is_active ? 'var(--success)' : 'var(--text-muted)', background: t.is_active ? 'var(--success-soft)' : 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 999 }}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button style={actionBtn} onClick={() => toggleType(t.id, t.is_active)}>
                        {t.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button style={{ ...actionBtn, color: 'var(--danger)' }} onClick={() => deleteType(t.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add new type */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add New Transaction Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ ...field, marginBottom: 0, gridColumn: '1/-1' }}>
              <label style={label}>Type Name *</label>
              <input style={input} value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Office Rent" />
            </div>
            <div style={{ ...field, marginBottom: 0 }}>
              <label style={label}>Cash Effect</label>
              <select style={select} value={newTypeCashEffect} onChange={e => setNewTypeCashEffect(e.target.value)}>
                <option value="cash_in">↑ Cash In (increases hand cash)</option>
                <option value="cash_out">↓ Cash Out (decreases hand cash)</option>
                <option value="none">No effect on cash</option>
              </select>
            </div>
            <div style={{ ...field, marginBottom: 0 }}>
              <label style={label}>Manager Balance Effect</label>
              <select style={select} value={newTypeMgrEffect} onChange={e => setNewTypeMgrEffect(e.target.value)}>
                <option value="none">No effect</option>
                <option value="increase">↑ Increases (I owe manager more)</option>
                <option value="decrease">↓ Decreases (manager balance reduces)</option>
              </select>
            </div>
            <div style={{ ...field, marginBottom: 0, gridColumn: '1/-1' }}>
              <label style={label}>Description (optional)</label>
              <input style={input} value={newTypeDesc} onChange={e => setNewTypeDesc(e.target.value)} placeholder="What is this type for?" />
            </div>
          </div>
          <button style={{ ...primaryBtn, marginTop: 12, width: 'auto', padding: '10px 20px' }} onClick={addTransactionType} disabled={savingType}>
            {savingType ? 'Adding…' : 'Add Type'}
          </button>
        </div>
      </section>
    </div>
  )
}

const sec = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '20px 22px',
  marginBottom: 16,
}

const { th, td } = (() => {
  const th = { textAlign: 'left', padding: '9px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }
  const td = { padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }
  return { th, td }
})()
