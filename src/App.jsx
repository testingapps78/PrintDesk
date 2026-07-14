import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './components/Login'
import Shell from './components/Shell'
import Dashboard from './components/Dashboard'
import RecordsTable from './components/RecordsTable'
import CashRegister from './components/CashRegister'
import Messages from './components/Messages'
import Inventory from './components/Inventory'
import BillGenerator from './components/BillGenerator'
import PriceList from './components/PriceList'
import AdminPanel from './components/AdminPanel'
import Settings from './components/Settings'
import ExcelExport from './components/ExcelExport'
import { useUnreadCounts } from './lib/data'

function Gate() {
  const { session, loading, profile, canAccess, isClerk } = useAuth()
  const [view, setView] = useState('dashboard')
  const { totalUnread } = useUnreadCounts(profile?.id)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  if (!session) return <Login />

  // Guard: redirect to dashboard if user doesn't have access to current view
  const accessible = isClerk || canAccess(view)
  const safeView = accessible ? view : 'dashboard'

  const setViewGuarded = (v) => {
    if (isClerk || canAccess(v)) setView(v)
    else setView('dashboard')
  }

  return (
    <Shell view={safeView} setView={setViewGuarded} unreadMessages={totalUnread}>
      {safeView === 'dashboard'  && <Dashboard />}
      {safeView === 'records'    && <RecordsTable />}
      {safeView === 'cash'       && <CashRegister />}
      {safeView === 'messages'   && <Messages />}
      {safeView === 'inventory'  && <Inventory />}
      {safeView === 'bills'      && <BillGenerator />}
      {safeView === 'prices'     && <PriceList />}
      {safeView === 'admin'      && <AdminPanel />}
      {safeView === 'settings'   && <Settings />}
      {safeView === 'export'     && <ExcelExport />}
    </Shell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
