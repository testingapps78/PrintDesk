import { createPortal } from 'react-dom'

export default function Modal({ title, onClose, children, width = 480 }) {
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,12,0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: width, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lift)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
          <button style={{ background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-secondary)', width: 28, height: 28, borderRadius: '50%', fontSize: 13, cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '18px 22px 24px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>,
    document.body
  )
}
