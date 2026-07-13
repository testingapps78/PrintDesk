import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useStaff, usePrintRecords, buildPersonSummary, buildKPIs, daysOverdue, rs } from '../lib/data'
import { supabase } from '../lib/supabase'
import { StatCard, BalanceRing, SectionTitle } from './shared'

export default function Dashboard() {
  const { profile, isClerk, canViewAll } = useAuth()
  const { staff } = useStaff()
  const { records, loading, refresh } = usePrintRecords({})
  const [personFilter, setPersonFilter] = useState('all')
  const [payingAll, setPayingAll] = useState(null)
  const [payMsg, setPayMsg] = useState('')

  // SSM only sees their own records
  const myRecords = useMemo(() => {
    if (canViewAll) return records
    return records.filter(r => r.person_id === profile?.id)
  }, [records, canViewAll, profile?.id])

  const kpi = useMemo(() => buildKPIs(myRecords), [myRecords])

  const personRows = useMemo(() => {
    const rows = buildPersonSummary(staff, myRecords)
    return rows.filter(r => r.billed > 0 || r.isStaff).sort((a, b) => {
      const order = { clerk: 0, manager: 1, ssm: 2, other: 3 }
      return ((order[a.role] ?? 3) - (order[b.role] ?? 3)) || a.name.localeCompare(b.name)
    })
  }, [staff, myRecords])

  const filteredRows = personFilter === 'all' ? personRows : personRows.filter(r => r.key === personFilter)

  // My own pending amount (for SSM banner)
  const myPending = useMemo(() => {
    if (!profile?.id) return 0
    const me = personRows.find(r => r.key === profile.id)
    return me?.pending || 0
  }, [personRows, profile?.id])

  async function payAll(personKey, personName) {
    if (!isClerk) return
    setPayingAll(personKey)
    let q = supabase.from('print_records').select('id,amount').eq('is_archived', false).neq('status', 'Paid')
    if (personKey.startsWith('other:')) {
      q = q.is('person_id', null).eq('other_person_name', personName)
    } else {
      q = q.eq('person_id', personKey)
    }
    const { data: pending } = await q
    if (pending && pending.length > 0) {
      await Promise.all(pending.map(r =>
        supabase.from('print_records').update({
          status: 'Paid',
          amount_paid: r.amount,
          remaining: 0,
          payment_date: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        }).eq('id', r.id)
      ))
      setPayMsg(`✓ Marked ${pending.length} records as Paid for ${personName}`)
      refresh()
    } else {
      setPayMsg('No pending records found.')
    }
    setPayingAll(null)
    setTimeout(() => setPayMsg(''), 4000)
  }

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Loading…</div>

  return (
    <div>
      {/* SSM pending reminder */}
      {!canViewAll && myPending > 0 && (
        <div style={{ background: 'var(--warning-soft)', border: '1px solid var(--gold-border)', borderRadius: 'var(--radius-md)', padding: '12px 18px', marginBottom: 18, fontSize: 13.5 }}>
          <strong style={{ color: 'var(--gold)' }}>Pending Balance: {rs(myPending)}</strong>
          <div style={{ color: 'var(--text-secondary)', marginTop: 3, fontSize: 12.5 }}>
            Kindly clear your outstanding balance at your earliest convenience. Contact the office clerk for details.
          </div>
        </div>
      )}

      {payMsg && (
        <div style={{ background: 'var(--success-soft)', border: '1px solid rgba(95,190,138,0.3)', borderRadius: 'var(--radius-sm)', padding: '9px 14px', marginBottom: 14, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>{payMsg}</div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 22 }}>
        <StatCard label="Total Entries" value={kpi.totalEntries.toLocaleString()} accent="gold" />
        <StatCard label="Total Billed" value={rs(kpi.totalBilled)} accent="state-blue" />
        <StatCard label="Pending" value={rs(kpi.totalPending)} accent="warning" />
        <StatCard label="Overdue 30+ Days" value={rs(kpi.overdue30)} accent="danger" />
        <StatCard label="Received" value={rs(kpi.totalReceived)} accent="success" />
        <StatCard label="Total Copies" value={kpi.totalCopies.toLocaleString()} accent="gold" />
      </div>

      {/* Person filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <SectionTitle style={{ marginBottom: 0 }}>
          {canViewAll ? 'Individual Summary' : 'Your Summary'}
        </SectionTitle>
        {canViewAll && (
          <select value={personFilter} onChange={e => setPersonFilter(e.target.value)}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
            <option value="all">All persons</option>
            {personRows.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        )}
      </div>

      {/* Summary table — mobile: cards, desktop: table */}
      <div className="dashboard-table-wrap" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'auto' }}>
        {/* Desktop table */}
        <table className="dashboard-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>Person</th>
              <th style={{ ...th, textAlign: 'right' }}>Billed</th>
              <th style={{ ...th, textAlign: 'right' }}>Received</th>
              <th style={{ ...th, textAlign: 'right' }}>Pending</th>
              <th style={{ ...th, textAlign: 'center' }}>Overdue</th>
              <th style={{ ...th, textAlign: 'center' }}>Progress</th>
              {isClerk && <th style={th}></th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(row => (
              <tr key={row.key}>
                <td style={td}>
                  <div style={{ fontWeight: 700 }}>{row.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.designation || row.role} · {row.copies} copies</div>
                </td>
                <td className="tabular" style={{ ...td, textAlign: 'right' }}>{rs(row.billed)}</td>
                <td className="tabular" style={{ ...td, textAlign: 'right', color: 'var(--success)' }}>{rs(row.received)}</td>
                <td className="tabular" style={{ ...td, textAlign: 'right', color: row.pending > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: row.pending > 0 ? 700 : 400 }}>{rs(row.pending)}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {row.maxOverdue > 0
                    ? <span style={{ color: row.maxOverdue > 30 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>{row.maxOverdue}d</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <BalanceRing total={row.billed} received={row.received} size={32} stroke={3} />
                  </div>
                </td>
                {isClerk && (
                  <td style={td}>
                    {row.pending > 0 && (
                      <button
                        onClick={() => payAll(row.key, row.name)}
                        disabled={payingAll === row.key}
                        style={{ background: 'var(--success-soft)', border: '1px solid rgba(95,190,138,0.3)', color: 'var(--success)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {payingAll === row.key ? '…' : '✓ Pay All'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }
const td = { padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }
