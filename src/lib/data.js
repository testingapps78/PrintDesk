import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

// ── helpers ────────────────────────────────────────────────────────────
export const today = () => new Date().toISOString().slice(0, 10)
export function daysOverdue(d) {
  return Math.max(0, Math.round((new Date(today()) - new Date(d)) / 86400000))
}
export const rs = n => `Rs. ${Math.round(Number(n) || 0).toLocaleString('en-PK')}`

// ── staff ──────────────────────────────────────────────────────────────
export function useStaff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('staff')
      .select('id,full_name,role,designation,ssm_code,permissions,is_active')
      .order('role').order('full_name')
    setStaff(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { staff, loading, refresh }
}

// ── print records — filters applied server-side ────────────────────────
export function usePrintRecords({ status, personId, month, showArchived } = {}) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('print_records')
      .select('id,person_id,other_person_name,entry_date,description,copies,amount,amount_paid,remaining,status,payment_date,remarks,is_archived,created_at,person:staff!print_records_person_id_fkey(id,full_name,designation)')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!showArchived) q = q.eq('is_archived', false)
    if (status && status !== 'All') q = q.eq('status', status)
    if (personId && personId !== 'all') q = q.eq('person_id', personId)
    if (month) q = q.gte('entry_date', `${month}-01`).lte('entry_date', `${month}-31`)

    const { data, error } = await q
    if (!error) setRecords(data || [])
    setLoading(false)
  }, [status, personId, month, showArchived])

  useEffect(() => { fetch() }, [fetch])
  return { records, loading, refresh: fetch }
}

// ── all records for admin ──────────────────────────────────────────────
export function useAllRecords() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('print_records')
      .select('id,person_id,other_person_name,entry_date,description,copies,amount,amount_paid,remaining,status,is_archived,person:staff!print_records_person_id_fkey(id,full_name,designation)')
      .order('entry_date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { records, loading, refresh }
}

// ── price list ─────────────────────────────────────────────────────────
export function usePriceList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('print_items')
      .select('id,item_name,price_per_copy,pages_per_unit,is_active,inventory_item_id')
      .eq('is_active', true).order('item_name')
    setItems(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { items, loading, refresh }
}

// ── cash transactions ──────────────────────────────────────────────────
export function useCashTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('cash_transactions')
      .select('id,entry_date,description,amount,type,remarks,created_at,is_archived,custom_type_id,custom_type:custom_transaction_types(id,type_name,cash_effect,manager_balance_effect)')
      .eq('is_archived', false)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { transactions, loading, refresh }
}

// ── all cash for admin ─────────────────────────────────────────────────
export function useAllCash() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('cash_transactions')
      .select('id,entry_date,description,amount,type,remarks,is_archived,custom_type:custom_transaction_types(id,type_name,cash_effect,manager_balance_effect)')
      .order('entry_date', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { transactions, loading, refresh }
}

// ── custom transaction types ───────────────────────────────────────────
export function useTransactionTypes() {
  const [types, setTypes] = useState([])
  const refresh = useCallback(async () => {
    const { data } = await supabase.from('custom_transaction_types')
      .select('*').eq('is_active', true).order('sort_order').order('type_name')
    setTypes(data || [])
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { types, refresh }
}

// ── inventory — uses inventory_stock view ──────────────────────────────
export function useInventory() {
  const [items, setItems] = useState([])   // from inventory_stock view
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [{ data: stockData }, { data: histData }] = await Promise.all([
      supabase.from('inventory_stock').select('*').order('item_name'),
      supabase.from('inventory_transactions')
        .select('id,item_id,txn_type,quantity,description,source,print_record_id,created_at,item:inventory_items(item_name,unit)')
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    setItems(stockData || [])
    setHistory(histData || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { items, history, loading, refresh }
}

// ── inventory items list (for linking) ────────────────────────────────
export function useInventoryItems() {
  const [invItems, setInvItems] = useState([])
  const refresh = useCallback(async () => {
    const { data } = await supabase.from('inventory_items').select('id,item_name,unit').eq('is_active', true).order('item_name')
    setInvItems(data || [])
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { invItems, refresh }
}

// ── messages — polling based (safe, no realtime crash) ─────────────────
export function useMessages(channelKey, myId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!myId) return
    let q = supabase.from('messages')
      .select('id,channel,sender_id,recipient_id,content,created_at,sender:staff!messages_sender_id_fkey(id,full_name,designation)')
      .order('created_at', { ascending: true })
      .limit(200)

    if (channelKey === 'group') {
      q = q.eq('channel', 'group')
    } else {
      // private: messages between me and the other person
      q = q.eq('channel', 'private')
        .or(`and(sender_id.eq.${myId},recipient_id.eq.${channelKey}),and(sender_id.eq.${channelKey},recipient_id.eq.${myId})`)
    }

    const { data, error } = await q
    if (!error) setMessages(data || [])
    setLoading(false)
  }, [channelKey, myId])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 8000) // poll every 8s
    return () => clearInterval(interval)
  }, [fetch])

  return { messages, loading, refresh: fetch }
}

// ── unread message counts ──────────────────────────────────────────────
export function useUnreadCounts(myId) {
  const [counts, setCounts] = useState({})

  const fetch = useCallback(async () => {
    if (!myId) return
    // Get all messages visible to me that I haven't read
    const [{ data: msgs }, { data: reads }] = await Promise.all([
      supabase.from('messages').select('id,channel,sender_id,recipient_id')
        .or(`channel.eq.group,recipient_id.eq.${myId}`),
      supabase.from('message_reads').select('message_id').eq('reader_id', myId),
    ])
    if (!msgs) return
    const readSet = new Set((reads || []).map(r => r.message_id))
    const c = {}
    for (const m of msgs) {
      if (m.sender_id === myId) continue
      if (readSet.has(m.id)) continue
      const key = m.channel === 'group' ? 'group' : m.sender_id
      c[key] = (c[key] || 0) + 1
    }
    setCounts(c)
  }, [myId])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 15000)
    return () => clearInterval(interval)
  }, [fetch])

  const totalUnread = Object.values(counts).reduce((s, v) => s + v, 0)
  return { counts, totalUnread, refresh: fetch }
}

// ── notifications ──────────────────────────────────────────────────────
export function useNotifications(myId) {
  const [notifications, setNotifications] = useState([])
  const refresh = useCallback(async () => {
    if (!myId) return
    const { data } = await supabase.from('notifications')
      .select('id,title,body,is_read,created_at,sender:staff!notifications_sender_id_fkey(full_name)')
      .eq('recipient_id', myId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
  }, [myId])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh, myId])

  const unreadCount = notifications.filter(n => !n.is_read).length
  return { notifications, unreadCount, refresh }
}

// ── app settings ───────────────────────────────────────────────────────
export function useSettings() {
  const [settings, setSettings] = useState({
    overdue_yellow_days: 7,
    overdue_red_days: 30,
    default_page_size: 10,
    bill_header: {
      office_name: 'State Life Insurance Corporation of Pakistan',
      area_name: 'Area 9219',
      address: 'Jhang Zone',
      contact: '',
    },
  })

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('key,value')
    if (!data) return
    const s = {}
    for (const row of data) s[row.key] = row.value
    setSettings(prev => ({ ...prev, ...s }))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const updateSetting = async (key, value) => {
    await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return { settings, updateSetting, refresh }
}

// ── computed summaries ─────────────────────────────────────────────────
export function buildPersonSummary(staff, records) {
  const rows = staff.map(s => ({
    key: s.id, name: s.full_name, designation: s.designation, role: s.role,
    isStaff: true, copies: 0, billed: 0, received: 0, pending: 0, maxOverdue: 0,
  }))
  const otherMap = new Map()
  for (const r of records) {
    let target
    if (r.person_id) {
      target = rows.find(row => row.key === r.person_id)
    } else {
      const name = r.other_person_name || 'Unnamed'
      if (!otherMap.has(name)) {
        const row = { key: `other:${name}`, name, designation: 'Other', role: 'other', isStaff: false, copies: 0, billed: 0, received: 0, pending: 0, maxOverdue: 0 }
        otherMap.set(name, row); rows.push(row)
      }
      target = otherMap.get(name)
    }
    if (!target) continue
    target.copies += Number(r.copies) || 0
    target.billed += Number(r.amount) || 0
    if (r.status === 'Paid') {
      target.received += Number(r.amount) || 0
    } else if (r.status === 'Partially Paid') {
      target.received += Number(r.amount_paid) || 0
      target.pending += Number(r.remaining) || 0
      target.maxOverdue = Math.max(target.maxOverdue, daysOverdue(r.entry_date))
    } else {
      target.pending += Number(r.amount) || 0
      target.maxOverdue = Math.max(target.maxOverdue, daysOverdue(r.entry_date))
    }
  }
  return rows
}

export function buildKPIs(records) {
  const k = { totalEntries: records.length, totalBilled: 0, totalPending: 0, overdue30: 0, totalReceived: 0, totalCopies: 0 }
  for (const r of records) {
    k.totalBilled += Number(r.amount) || 0
    k.totalCopies += Number(r.copies) || 0
    const o = daysOverdue(r.entry_date)
    if (r.status === 'Paid') {
      k.totalReceived += Number(r.amount) || 0
    } else if (r.status === 'Partially Paid') {
      k.totalReceived += Number(r.amount_paid) || 0
      k.totalPending += Number(r.remaining) || 0
      if (o > 30) k.overdue30 += Number(r.remaining) || 0
    } else {
      k.totalPending += Number(r.amount) || 0
      if (o > 30) k.overdue30 += Number(r.amount) || 0
    }
  }
  return k
}

export function buildCashSummary(transactions) {
  let cashInHand = 0
  let managerBalance = 0
  for (const t of transactions) {
    const ct = t.custom_type
    const cashEffect = ct?.cash_effect || 'none'
    const mgrEffect = ct?.manager_balance_effect || 'none'
    if (cashEffect === 'cash_in') cashInHand += Number(t.amount) || 0
    else if (cashEffect === 'cash_out') cashInHand -= Number(t.amount) || 0
    if (mgrEffect === 'increase') managerBalance += Number(t.amount) || 0
    else if (mgrEffect === 'decrease') managerBalance -= Number(t.amount) || 0
  }
  return { cashInHand, managerBalance }
}
