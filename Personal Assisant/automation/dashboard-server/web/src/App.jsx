import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import JobSearch from './pages/JobSearch'
import Goals from './pages/Goals'
import Money from './pages/Money'
import Sidebar from './components/Sidebar'
import BottomTabBar from './components/BottomTabBar'
import './theme.css'

export default function App() {
  const [authed, setAuthed] = useState(null) // null = checking, true/false once known

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => setAuthed(res.ok))
      .catch(() => setAuthed(false))
  }, [])

  if (authed === null) return null
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/job-search" element={<JobSearch />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/money" element={<Money />} />
          </Routes>
        </main>
        <BottomTabBar />
      </div>
    </BrowserRouter>
  )
}
