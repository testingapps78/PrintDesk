import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { callAdminFn } from '../lib/supabase'
import { useStaff, useAllRecords, useAllCash, rs } from '../lib/data'
import { SectionTitle, Ok, Err, tableWrap, th, td } from './shared'
import { field, label, input, select, primaryBtn, ghostBtn, actionBtn } from './formStyles'
import PriceList from './PriceList'

const TABS = [
  { key: 'users', label: '👤 Users' },
  { key: 'records', label: '📄 Records' },
  { key: 'cash', label: '💰 Cash' },
  { key: 'prices', label: '🏷️ Prices' },
  { key: 'notifications', label: '🔔 Notify' },
]

const ALL_PAGES = ['dashboard','records','cash','messages','inventory','bills']
const DESIGNATIONS = ['SSM-I','SSM-II','SM','SR-SM','Manager','Office Clerk','Custom']

// ── Users Tab ─────────────────────────────────────────────────────────
function UsersTab() {
  const { staff, loading, refresh } = useStaff()
  const [adding, setAdding] = useState(false)
  const [pwUserId, setPwUserId] = useState(null)
  const [editPermsId, setEditPermsId] = useState(null)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  // New user form
  const [nName, setNName] = useState('')
  const [nCode, setNCode] = useState('')
  const [nRole, setNRole] = useState('ssm')
  const [nDesig, setNDesig] = useState('SSM-I')
  const [nCustomDesig, setNCustomDesig] = useState('')
  const [nPass, setNPass] = useState('')

  // Password change
  const [newPw, setNewPw] = useState('')

  // Permissions editor
  const [permDraft, setPermDraft] = useState(null)

  async function createUser() {
    setErr('')
    const desig = nDesig === 'Custom' ? nCustomDesig.trim() : nDesig
    if (!nName.trim() || !nCode.trim() || !nPass || !desig) {
      setErr('Name, code, designation and password are all required.')
      return
    }
    if (nPass.length < 6) { setErr('Password must be at least 6 characters.'); return }
    setSaving(true)
    try {
      const email = `${nCode.trim().toLowerCase()}@area9219.local`
      await callAdminFn('create_user', {
        email, password: nPass,
        full_name: nName.trim(),
        role: nRole,
        designation: desig,
        ssm_code: nCode.trim(),
      })
      setOk(`✓ User "${nName.trim()}" created. They can now log in with code "${nCode.trim()}".`)
      setNName(''); setNCode(''); setNPass(''); setNDesig('SSM-I'); setNCustomDesig('')
      setAdding(false)
      refresh()
    } catch (e) {
      setErr('Failed: ' + e.message)
    }
    setSaving(false)
  }

  async function changePassword(userId) {
    setErr('')
    if (!newPw || newPw.length < 6) { setErr('Password must be at least 6 characters.'); return }
    setSaving(true)
    try {
      await callAdminFn('change_password', { target_user_id: userId, new_password: newPw })
      setOk('✓ Password changed successfully.')
      setPwUserId(null); setNewPw('')
    } catch (e) {
      setErr('Failed: ' + e.message)
    }
    setSaving(false)
  }

  async function removeUser(userId, name) {
    if (!window.confirm(`Remove "${name}"?\n\nTheir print records will be kept. This cannot be undone.`)) return
    setErr('')
    setSaving(true)
    try {
      await callAdminFn('delete_user', { target_user_id: userId })
      setOk(`✓ ${name} has been removed.`)
      refresh()
    } catch (e) {
      setErr('Failed: ' + e.message)
    }
    setSaving(false)
  }

  async function savePermissions(userId) {
    setErr('')
    setSaving(true)
    try {
      await callAdminFn('update_user', { target_user_id: userId, permissions: permDraft })
      setOk('✓ Permissions updated.')
      setEditPermsId(null)
      refresh()
    } catch (e) {
      setErr('Failed: ' + e.message)
    }
    setSaving(false)
  }

  async function updateRole(userId, role) {
    setSaving(true)
    try {
      const defaultPerms = role === 'clerk'
        ? { pages: ['dashboard','records','cash','messages','inventory','bills','prices','admin','settings'], view_all_records: true }
        : role === 'manager'
        ? { pages: ['dashboard','records','cash','messages'], view_all_records: true }
        : { pages: ['dashboard','records','messages'], view_all_records: false }
      await callAdminFn('update_user', { target_user_id: userId, role, permissions: defaultPerms })
      setOk('✓ Role updated.')
      refresh()
    } catch (e) {
      setErr('Failed: ' + e.message)
    }
    setSaving(false)
  }

  const roleColor = r => r === 'clerk' ? 'var(--warning)' : r === 'manager' ? 'var(--state-blue)' : 'var(--text-muted)'
  const roleBg = r => r === 'clerk' ? 'var(--warning-soft)' : r === 'manager' ? 'var(--state-blue-soft)' : 'var(--bg-elevated)'

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionTitle style={{ marginBottom: 0 }}>Staff Users ({staff.length})</SectionTitle>
        <button style={ghostBtn} onClick={() => { setAdding(v => !v); setErr('') }}>
          {adding ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {/* Add user form */}
      {adding && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px 20px', marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', marginBottom: 14, textTransform: 'uppercase' }}>New User</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ ...field, marginBottom: 0 }}>
              <label style={label}>Full Name *</label>
              <input style={input} value={nName} onChange={e => setNName(e.target.value)} placeholder="Muhammad Ali" autoComplete="off" />
            </div>
            <div style={{ ...field, marginBottom: 0 }}>
              <label style={label}>Login Code / SSM Code *</label>
              <input style={input} value={nCode} onChange={e => setNCode(e.target.value)} placeholder="e.g. 292362" autoComplete="off" />
            </div>
            <div style={{ ...field, marginBottom: 0 }}>
              <label style={label}>Role *</label>
              <select style={select} value={nRole} onChange={e => setNRole(e.target.value)}>
                <option value="ssm">SSM (Field Agent)</option>
                <option value="manager">Manager</option>
                <option value="clerk">Clerk</option>
              </select>
            </div>
            <div style={{ ...field, marginBottom: 0 }}>
              <label style={label}>Designation *</label>
              <select style={select} value={nDesig} onChange={e => setNDesig(e.target.value)}>
                {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {nDesig === 'Custom' && (
              <div style={{ ...field, marginBottom: 0, gridColumn: '1/-1' }}>
                <label style={label}>Custom Designation Text</label>
                <input style={input} value={nCustomDesig} onChange={e => setNCustomDesig(e.target.value)} placeholder="e.g. SR-SSM" />
              </div>
            )}
            <div style={{ ...field, marginBottom: 0, gridColumn: '1/-1' }}>
              <label style={label}>Password * (min 6 characters)</label>
              <input style={input} type="password" value={nPass} onChange={e => setNPass(e.target.value)} placeholder="••••••" autoComplete="new-password" />
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            Login email will be: <code style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4 }}>{nCode.trim().toLowerCase() || 'code'}@area9219.local</code>
          </div>
          <button style={{ ...primaryBtn, marginTop: 14 }} onClick={createUser} disabled={saving}>
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 16 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {staff.map(u => (
            <div key={u.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 18px' }}>
              {/* User header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 15, flexShrink: 0 }}>
                    {u.full_name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {u.ssm_code && <span style={{ fontFamily: 'monospace', background: 'var(--bg-surface)', padding: '1px 6px', borderRadius: 4 }}>{u.ssm_code}</span>}
                      <span style={{ background: roleBg(u.role), color: roleColor(u.role), padding: '1px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>{u.role}</span>
                      <span>{u.designation}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={actionBtn} onClick={() => { setPwUserId(pwUserId === u.id ? null : u.id); setNewPw(''); setEditPermsId(null) }}>🔑 Password</button>
                  <button style={actionBtn} onClick={() => { setEditPermsId(editPermsId === u.id ? null : u.id); setPermDraft(u.permissions || {}); setPwUserId(null) }}>🛡 Permissions</button>
                  <button style={{ ...actionBtn, color: 'var(--danger)' }} onClick={() => removeUser(u.id, u.full_name)}>Remove</button>
                </div>
              </div>

              {/* Role quick-change */}
              <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Change role:</span>
                {['ssm','manager','clerk'].map(r => (
                  <button key={r} onClick={() => updateRole(u.id, r)} disabled={u.role === r}
                    style={{ ...actionBtn, fontSize: 11, opacity: u.role === r ? 0.4 : 1, cursor: u.role === r ? 'default' : 'pointer' }}>
                    {r}
                  </button>
                ))}
              </div>

              {/* Password change */}
              {pwUserId === u.id && (
                <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ ...field, flex: 1, marginBottom: 0, minWidth: 180 }}>
                    <label style={label}>New Password (min 6 chars)</label>
                    <input style={input} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
                  </div>
                  <button style={{ ...primaryBtn, width: 'auto', padding: '10px 18px' }} onClick={() => changePassword(u.id)} disabled={saving}>{saving ? '…' : 'Change'}</button>
                  <button style={{ ...ghostBtn, padding: '10px 14px' }} onClick={() => setPwUserId(null)}>Cancel</button>
                </div>
              )}

              {/* Permissions editor */}
              {editPermsId === u.id && permDraft && (
                <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', marginBottom: 10, textTransform: 'uppercase' }}>Page Access for {u.full_name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {ALL_PAGES.map(page => {
                      const has = (permDraft.pages || []).includes(page)
                      return (
                        <button key={page} onClick={() => {
                          const pages = permDraft.pages || []
                          setPermDraft(d => ({ ...d, pages: has ? pages.filter(p => p !== page) : [...pages, page] }))
                        }}
                          style={{ background: has ? 'var(--gold-soft)' : 'var(--bg-elevated)', border: `1px solid ${has ? 'var(--gold-border)' : 'var(--border)'}`, color: has ? 'var(--gold)' : 'var(--text-muted)', padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
                          {page}
                        </button>
                      )
                    })}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                    <input type="checkbox" checked={permDraft.view_all_records || false} onChange={e => setPermDraft(d => ({ ...d, view_all_records: e.target.checked }))} />
                    Can view all persons' records (not just own)
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...primaryBtn, width: 'auto', padding: '9px 18px' }} onClick={() => savePermissions(u.id)} disabled={saving}>{saving ? '…' : 'Save'}</button>
                    <button style={ghostBtn} onClick={() => setEditPermsId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Records Tab ───────────────────────────────────────────────────────
function RecordsTab() {
  const { records, loading, refresh } = useAllRecords()
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  const filtered = records.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (r.person?.full_name || r.other_person_name || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) || r.entry_date.includes(q)
  })

  async function saveEdit() {
    const newAmount = Number(editDraft.amount)
    const { error: e } = await supabase.from('print_records').update({
      entry_date: editDraft.entry_date,
      description: editDraft.description,
      copies: Number(editDraft.copies),
      amount: newAmount,
      updated_at: new Date().toISOString(),
    }).eq('id', editId)
    if (!e) { setOk('Updated.'); setEditId(null); refresh() } else setErr(e.message)
  }

  async function deleteRec(id) {
    if (!window.confirm('Delete permanently?')) return
    await supabase.from('print_records').delete().eq('id', id)
    setOk('Deleted.'); refresh()
  }

  async function toggleArchive(id, current) {
    await supabase.from('print_records').update({ is_archived: !current }).eq('id', id)
    setOk(current ? 'Unarchived.' : 'Archived.'); refresh()
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionTitle style={{ marginBottom: 0 }}>All Records ({filtered.length})</SectionTitle>
        <input style={{ ...input, width: 200, fontSize: 13 }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>Date</th><th style={th}>Person</th><th style={th}>Description</th>
              <th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={th}>Status</th>
              <th style={th}>Arch</th><th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 150).map(r => editId === r.id ? (
              <tr key={r.id} style={{ background: 'var(--bg-elevated)' }}>
                <td style={td}><input style={{ ...input, width: 125 }} type="date" value={editDraft.entry_date} onChange={e => setEditDraft(d => ({ ...d, entry_date: e.target.value }))} /></td>
                <td style={{ ...td, fontSize: 12, color: 'var(--text-muted)' }}>{r.person?.full_name || r.other_person_name}</td>
                <td style={td}><input style={{ ...input, minWidth: 160 }} value={editDraft.description || ''} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} /></td>
                <td style={td}><input style={{ ...input, width: 80 }} type="number" value={editDraft.amount} onChange={e => setEditDraft(d => ({ ...d, amount: e.target.value }))} /></td>
                <td style={{ ...td, fontSize: 12, color: 'var(--text-muted)' }}>{r.status}</td>
                <td style={td}>{r.is_archived ? '📦' : '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button style={{ ...actionBtn, color: 'var(--success)', marginRight: 4 }} onClick={saveEdit}>✓</button>
                  <button style={actionBtn} onClick={() => setEditId(null)}>✕</button>
                </td>
              </tr>
            ) : (
              <tr key={r.id} style={{ opacity: r.is_archived ? 0.5 : 1 }}>
                <td className="tabular" style={{ ...td, whiteSpace: 'nowrap', fontSize: 12 }}>{r.entry_date}</td>
                <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.person?.full_name || r.other_person_name}</td>
                <td style={{ ...td, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>{r.description}</td>
                <td className="tabular" style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{rs(r.amount)}</td>
                <td style={td}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: r.status === 'Paid' ? 'var(--success)' : r.status === 'Partially Paid' ? 'var(--warning)' : 'var(--danger)', background: r.status === 'Paid' ? 'var(--success-soft)' : r.status === 'Partially Paid' ? 'var(--warning-soft)' : 'var(--danger-soft)' }}>{r.status}</span>
                </td>
                <td style={{ ...td, fontSize: 12, color: 'var(--text-muted)' }}>{r.is_archived ? '📦' : '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button style={actionBtn} onClick={() => { setEditId(r.id); setEditDraft({ entry_date: r.entry_date, description: r.description, copies: r.copies, amount: r.amount, amount_paid: r.amount_paid }) }}>Edit</button>
                    <button style={actionBtn} onClick={() => toggleArchive(r.id, r.is_archived)}>{r.is_archived ? 'Unarchive' : 'Archive'}</button>
                    <button style={{ ...actionBtn, color: 'var(--danger)' }} onClick={() => deleteRec(r.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Cash Tab ──────────────────────────────────────────────────────────
function CashTab() {
  const { transactions, loading, refresh } = useAllCash()
  const [editId, setEditId] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  async function saveEdit() {
    const { error: e } = await supabase.from('cash_transactions').update({
      entry_date: editDraft.entry_date,
      description: editDraft.description || null,
      amount: Number(editDraft.amount),
      remarks: editDraft.remarks || null,
    }).eq('id', editId)
    if (!e) { setOk('Updated.'); setEditId(null); refresh() } else setErr(e.message)
  }

  async function deleteTxn(id) {
    if (!window.confirm('Delete permanently?')) return
    await supabase.from('cash_transactions').delete().eq('id', id)
    setOk('Deleted.'); refresh()
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <SectionTitle>All Cash Transactions ({transactions.length})</SectionTitle>
      <div style={tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>Date</th><th style={th}>Type</th><th style={th}>Description</th>
              <th style={{ ...th, textAlign: 'right' }}>Amount</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => editId === t.id ? (
              <tr key={t.id} style={{ background: 'var(--bg-elevated)' }}>
                <td style={td}><input style={{ ...input, width: 125 }} type="date" value={editDraft.entry_date} onChange={e => setEditDraft(d => ({ ...d, entry_date: e.target.value }))} /></td>
                <td style={{ ...td, fontSize: 12, color: 'var(--text-muted)' }}>{t.custom_type?.type_name || t.type}</td>
                <td style={td}><input style={{ ...input, minWidth: 150 }} value={editDraft.description || ''} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} /></td>
                <td style={td}><input style={{ ...input, width: 90 }} type="number" value={editDraft.amount} onChange={e => setEditDraft(d => ({ ...d, amount: e.target.value }))} /></td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button style={{ ...actionBtn, color: 'var(--success)', marginRight: 4 }} onClick={saveEdit}>✓</button>
                  <button style={actionBtn} onClick={() => setEditId(null)}>✕</button>
                </td>
              </tr>
            ) : (
              <tr key={t.id}>
                <td className="tabular" style={{ ...td, whiteSpace: 'nowrap', fontSize: 12 }}>{t.entry_date}</td>
                <td style={td}><span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 999 }}>{t.custom_type?.type_name || t.type}</span></td>
                <td style={{ ...td, color: 'var(--text-secondary)' }}>{t.description || '—'}</td>
                <td className="tabular" style={{ ...td, textAlign: 'right', color: t.custom_type?.cash_effect === 'cash_in' ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{rs(t.amount)}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button style={actionBtn} onClick={() => { setEditId(t.id); setEditDraft({ entry_date: t.entry_date, description: t.description, amount: t.amount, remarks: t.remarks }) }}>Edit</button>
                    <button style={{ ...actionBtn, color: 'var(--danger)' }} onClick={() => deleteTxn(t.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Notifications Tab ─────────────────────────────────────────────────
function NotificationsTab() {
  const { staff } = useStaff()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [recipientId, setRecipientId] = useState('all')
  const [sending, setSending] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  async function send() {
    if (!title.trim() || !body.trim()) { setErr('Title and message required.'); return }
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    let error
    if (recipientId === 'all') {
      const inserts = staff.map(s => ({ sender_id: user?.id, recipient_id: s.id, title: title.trim(), body: body.trim() }))
      ;({ error } = await supabase.from('notifications').insert(inserts))
    } else {
      ;({ error } = await supabase.from('notifications').insert({ sender_id: user?.id, recipient_id: recipientId, title: title.trim(), body: body.trim() }))
    }
    setSending(false)
    if (error) { setErr(error.message); return }
    setOk(`✓ Notification sent to ${recipientId === 'all' ? 'all staff' : staff.find(s => s.id === recipientId)?.full_name || 'user'}.`)
    setTitle(''); setBody('')
  }

  return (
    <div>
      <Err msg={err} /><Ok msg={ok} />
      <SectionTitle>Send Notification</SectionTitle>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px 20px', maxWidth: 480 }}>
        <div style={field}><label style={label}>Send to</label>
          <select style={select} value={recipientId} onChange={e => setRecipientId(e.target.value)}>
            <option value="all">All Staff</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.designation || s.role})</option>)}
          </select>
        </div>
        <div style={field}><label style={label}>Title *</label>
          <input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Payment Reminder" />
        </div>
        <div style={field}><label style={label}>Message *</label>
          <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message…" />
        </div>
        <button style={primaryBtn} onClick={send} disabled={sending}>{sending ? 'Sending…' : '🔔 Send'}</button>
      </div>
    </div>
  )
}

// ── Main Admin Panel ──────────────────────────────────────────────────
export default function AdminPanel() {
  const [tab, setTab] = useState('users')
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Admin Panel</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Full control — visible to clerk only</p>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid rgba(226,101,75,0.3)', padding: '4px 12px', borderRadius: 999 }}>⚙ Clerk Only</div>
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border-subtle)', marginBottom: 20, flexWrap: 'wrap', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ background: 'transparent', border: 'none', borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent', color: tab === t.key ? 'var(--gold)' : 'var(--text-muted)', padding: '10px 14px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 22 }}>
        {tab === 'users' && <UsersTab />}
        {tab === 'records' && <RecordsTab />}
        {tab === 'cash' && <CashTab />}
        {tab === 'prices' && <PriceList />}
        {tab === 'notifications' && <NotificationsTab />}
      </div>
    </div>
  )
}
