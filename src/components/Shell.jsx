import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import statelifeBadge from '../assets/statelife-badge.png'
import szSymbol from '../assets/sz-symbol.png'
import { Credit } from './shared'
import './shell.css'

const ALL_NAV = [
  { key: 'dashboard',  label: 'Dashboard',     icon: '▦',  page: 'dashboard' },
  { key: 'records',    label: 'Print Records',  icon: '☷',  page: 'records' },
  { key: 'cash',       label: 'Cash Register',  icon: '₨',  page: 'cash' },
  { key: 'messages',   label: 'Messages',       icon: '✉',  page: 'messages' },
  { key: 'inventory',  label: 'Inventory',      icon: '📦', page: 'inventory' },
  { key: 'bills',      label: 'Bill Generator', icon: '🧾', page: 'bills' },
  { key: 'prices',     label: 'Price List',     icon: '◈',  page: 'prices', clerkOnly: true },
  { key: 'admin',      label: 'Admin Panel',    icon: '⚙',  page: 'admin',   clerkOnly: true },
  { key: 'settings',   label: 'Settings',       icon: '🔧', page: 'settings', clerkOnly: true },
  { key: 'export',     label: 'Export Data',    icon: '⬇',  page: 'export',   clerkOnly: true },
]

export default function Shell({ view, setView, children, unreadMessages = 0 }) {
  const { profile, signOut, canAccess, isClerk } = useAuth()
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set())

  // Online presence via periodic heartbeat
  useEffect(() => {
    if (!profile?.id) return
    // Update own last_seen via a simple presence channel
    const channel = supabase.channel('online-presence', { config: { presence: { key: profile.id } } })
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      setOnlineUsers(new Set(Object.keys(state)))
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: profile.id, online_at: new Date().toISOString() })
      }
    })
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  const navItems = ALL_NAV.filter(n => {
    if (n.clerkOnly) return isClerk
    return canAccess(n.page)
  })

  const go = (key) => { setView(key); setMenuOpen(false) }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(2px)' }}
          onClick={() => setMenuOpen(false)} />
      )}

      <aside className={`pd-sidebar ${menuOpen ? 'pd-open' : ''}`} style={{ width: 230, flexShrink: 0, background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', padding: '18px 12px', position: 'sticky', top: 0, height: '100vh', zIndex: 250 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 18px' }}>
          <img src={statelifeBadge} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gold)', lineHeight: 1.1 }}>PrintDesk</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Area 9219</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
          {navItems.map((item, i) => {
            const isActive = view === item.key
            const badge = item.key === 'messages' ? unreadMessages : 0
            const prevIsAdmin = i > 0 && navItems[i - 1]?.clerkOnly
            const showSep = item.clerkOnly && !prevIsAdmin

            return (
              <div key={item.key}>
                {showSep && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 0' }} />}
                <button
                  onClick={() => go(item.key)}
                  style={{
                    width: '100%', textAlign: 'left', background: isActive ? (item.clerkOnly ? 'rgba(226,101,75,0.12)' : 'var(--gold-soft)') : 'transparent',
                    border: 'none', color: isActive ? (item.clerkOnly ? 'var(--danger)' : 'var(--gold)') : 'var(--text-secondary)',
                    padding: '9px 10px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge > 0 && (
                    <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999, minWidth: 18, textAlign: 'center' }}>{badge}</span>
                  )}
                </button>
              </div>
            )
          })}
        </nav>

        {/* Online indicator */}
        {onlineUsers.size > 0 && (
          <div style={{ padding: '8px 6px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
              Online now · {onlineUsers.size}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Array.from(onlineUsers).slice(0, 6).map(uid => (
                <div key={uid} style={{ position: 'relative' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--success-soft)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--success)' }}>
                    {uid === profile?.id ? (profile?.full_name || '?')[0] : '?'}
                  </div>
                  <span style={{ position: 'absolute', bottom: 0, right: 0, width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', border: '1px solid var(--bg-surface)' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '7px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, width: '100%', cursor: 'pointer' }}>
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold-soft)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--gold)', flexShrink: 0 }}>
              {(profile?.full_name || '?')[0]}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{profile?.designation || profile?.role}</div>
            </div>
          </div>
          <button onClick={signOut} style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '7px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="pd-topbar" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 100 }}>
          <button className="pd-menu-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer', padding: 4 }} onClick={() => setMenuOpen(v => !v)}>☰</button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--gold)' }}>PrintDesk</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unreadMessages > 0 && <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>{unreadMessages}</span>}
            <button onClick={toggle} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', padding: 4 }}>{theme === 'dark' ? '☀️' : '🌙'}</button>
          </div>
        </header>

        <main className="pd-content" style={{ flex: 1, padding: '22px 24px', position: 'relative' }}>{children}</main>

        <footer style={{ padding: '0 24px', borderTop: '1px solid var(--border-subtle)' }}>
          <Credit szSymbol={szSymbol} />
        </footer>
      </div>
    </div>
  )
}
