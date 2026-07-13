export function StatCard({ label, value, accent = 'gold', sub }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderTop: `2px solid var(--${accent})`, borderRadius: 'var(--radius-md)', padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <div className="tabular" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export function BalanceRing({ total, received, size = 38, stroke = 4 }) {
  const pct = total > 0 ? Math.min(1, received / total) : 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - pct)
  const col = pct >= 0.999 ? 'var(--success)' : pct > 0 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.25, fontWeight: 700, color: 'var(--text-secondary)' }}>{Math.round(pct * 100)}%</div>
    </div>
  )
}

const STATUS_MAP = {
  Pending: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  'Partially Paid': { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  Paid: { bg: 'var(--success-soft)', fg: 'var(--success)' },
}
export function StatusChip({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.Pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: s.bg, color: s.fg, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.fg }} />{status}
    </span>
  )
}

export function Watermark({ src, size = 560, top, right, bottom, left, opacity = 0.035, rotate = -6 }) {
  return <img src={src} alt="" aria-hidden style={{ position: 'absolute', width: size, height: 'auto', top, right, bottom, left, opacity, transform: `rotate(${rotate}deg)`, pointerEvents: 'none', userSelect: 'none', zIndex: 0 }} />
}

export function Credit({ szSymbol }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
      <img src={szSymbol} alt="" style={{ width: 13, opacity: 0.7 }} />
      <span>Designed &amp; built by <span style={{ color: 'var(--text-secondary)' }}>Shahzaib Ali</span>, Office Clerk · Area 9219 · <a href="mailto:contactzaibii@gmail.com" style={{ color: 'var(--text-secondary)', textDecoration: 'none', textTransform: 'lowercase' }}>contactzaibii@gmail.com</a></span>
    </div>
  )
}

export function SectionTitle({ children, style = {} }) {
  return <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gold)', fontWeight: 800, margin: '0 0 14px', ...style }}>{children}</h3>
}

export function Err({ msg }) {
  if (!msg) return null
  return <div style={{ color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid rgba(226,101,75,0.3)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 12.5, marginBottom: 12 }}>{msg}</div>
}

export function Ok({ msg }) {
  if (!msg) return null
  return <div style={{ color: 'var(--success)', background: 'var(--success-soft)', border: '1px solid rgba(95,190,138,0.3)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 12.5, marginBottom: 12 }}>{msg}</div>
}

export const th = { textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }
export const td = { padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }
export const tableWrap = { background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'auto' }
