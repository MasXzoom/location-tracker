import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Track from './pages/Track'
import Dashboard from './pages/Dashboard'
import ShortLinkRedirect from './pages/ShortLinkRedirect'

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/promo/:name" element={<Track />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/s/:code" element={<ShortLinkRedirect />} />
      <Route path="*" element={<div>Halaman tidak ditemukan</div>} />
    </Routes>
  )
} 