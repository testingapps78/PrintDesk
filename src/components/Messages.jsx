import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useStaff, useMessages, useUnreadCounts } from '../lib/data'

export default function Messages() {
  const { profile } = useAuth()
  const { staff, loading: staffLoading } = useStaff()
  const [activeChannel, setActiveChannel] = useState('group')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showList, setShowList] = useState(true) // mobile: show list or chat
  const bottomRef = useRef(null)

  const myId = profile?.id
  const otherStaff = staff.filter(s => s.id !== myId)

  const { messages, loading: msgLoading, refresh: refreshMsgs } = useMessages(activeChannel, myId)
  const { counts, refresh: refreshCounts } = useUnreadCounts(myId)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Mark messages as read when viewing a channel
  useEffect(() => {
    if (!myId || messages.length === 0) return
    const unread = messages.filter(m => m.sender_id !== myId)
    if (unread.length === 0) return
    const markRead = async () => {
      try {
        const inserts = unread.map(m => ({
          message_id: m.id,
          reader_id: myId,
          read_at: new Date().toISOString(),
        }))
        await supabase.from('message_reads').upsert(inserts, { onConflict: 'message_id,reader_id', ignoreDuplicates: true })
        refreshCounts()
      } catch (e) {
        // Silent fail — read status is non-critical
      }
    }
    const timer = setTimeout(markRead, 1000)
    return () => clearTimeout(timer)
  }, [messages, myId, refreshCounts])

  async function sendMessage() {
    if (!text.trim() || !myId || sending) return
    setSending(true)
    try {
      await supabase.from('messages').insert({
        channel: activeChannel === 'group' ? 'group' : 'private',
        sender_id: myId,
        content: text.trim(),
        recipient_id: activeChannel !== 'group' ? activeChannel : null,
      })
      setText('')
      refreshMsgs()
    } catch (e) {
      // Silent fail
    }
    setSending(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function selectChannel(key) {
    setActiveChannel(key)
    setShowList(false) // On mobile: switch to chat view
  }

  const activeLabel = activeChannel === 'group'
    ? 'Group Channel'
    : (otherStaff.find(s => s.id === activeChannel)?.full_name || 'Private')

  const totalUnread = Object.values(counts).reduce((s, v) => s + v, 0)

  if (staffLoading) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Loading…</div>

  return (
    <>
      {/* Mobile/desktop responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .msg-container { flex-direction: column !important; height: calc(100vh - 100px) !important; }
          .msg-sidebar { width: 100% !important; display: ${showList ? 'flex' : 'none'} !important; height: auto !important; max-height: 45vh !important; flex-direction: column; }
          .msg-chat { display: ${!showList ? 'flex' : 'none'} !important; }
          .msg-back-btn { display: flex !important; }
        }
        @media (min-width: 641px) {
          .msg-sidebar { display: flex !important; }
          .msg-chat { display: flex !important; }
          .msg-back-btn { display: none !important; }
        }
      `}</style>

      <div className="msg-container" style={{ display: 'flex', height: 'calc(100vh - 120px)', minHeight: 400, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div className="msg-sidebar" style={{ width: 220, borderRight: '1px solid var(--border-subtle)', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Messages</span>
            {totalUnread > 0 && <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>{totalUnread}</span>}
          </div>

          {/* Group channel */}
          <ChannelBtn
            active={activeChannel === 'group'}
            label="Group Channel"
            sub="All staff"
            icon="#"
            badge={counts['group'] || 0}
            onClick={() => selectChannel('group')}
          />

          <div style={{ padding: '6px 14px 4px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Private</div>

          {otherStaff.map(s => (
            <ChannelBtn
              key={s.id}
              active={activeChannel === s.id}
              label={s.full_name}
              sub={s.designation || s.role}
              icon={s.full_name[0]}
              badge={counts[s.id] || 0}
              onClick={() => selectChannel(s.id)}
            />
          ))}
        </div>

        {/* Chat area */}
        <div className="msg-chat" style={{ flex: 1, flexDirection: 'column', minWidth: 0 }}>
          {/* Chat header */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="msg-back-btn" onClick={() => setShowList(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
              ‹
            </button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                {activeChannel === 'group' ? '# Group Channel' : activeLabel}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {activeChannel === 'group' ? 'Visible to all staff' : 'Private conversation'}
              </div>
            </div>
            <button onClick={refreshMsgs} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
              ↻ Refresh
            </button>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgLoading ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>
                No messages yet. Be the first to say something!
              </div>
            ) : (
              messages.map(m => {
                const isMe = m.sender_id === myId
                const time = new Date(m.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
                const dateStr = new Date(m.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {!isMe && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                        {m.sender?.full_name} · {m.sender?.designation}
                      </div>
                    )}
                    <div style={{
                      maxWidth: '75%',
                      background: isMe ? 'var(--gold-soft)' : 'var(--bg-elevated)',
                      border: `1px solid ${isMe ? 'var(--gold-border)' : 'var(--border)'}`,
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '9px 13px',
                      fontSize: 13.5,
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>{dateStr} · {time}</div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '9px 12px',
                fontSize: 14,
                fontFamily: 'var(--font-ui)',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
                maxHeight: 120,
                overflowY: 'auto',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending}
              style={{
                background: text.trim() ? 'var(--gold)' : 'var(--bg-elevated)',
                color: text.trim() ? 'var(--text-on-accent)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                fontSize: 18,
                cursor: text.trim() ? 'pointer' : 'default',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >↑</button>
          </div>
        </div>
      </div>
    </>
  )
}

function ChannelBtn({ active, label, sub, icon, badge, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px', border: 'none', width: '100%', textAlign: 'left',
      background: active ? 'var(--gold-soft)' : 'transparent',
      cursor: 'pointer', transition: 'background 0.1s',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: active ? 'var(--gold-soft)' : 'var(--bg-elevated)', border: `1px solid ${active ? 'var(--gold-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: active ? 'var(--gold)' : 'var(--state-blue)', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--gold)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      {badge > 0 && <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999, minWidth: 18, textAlign: 'center', flexShrink: 0 }}>{badge}</span>}
    </button>
  )
}
