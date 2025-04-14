import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'

interface TrackingData {
  id: string
  tracking_code: string
  lat: number
  lng: number
  address: string
  google_maps_url: string
  device_info: string
  created_at: string
}

interface TrackingLink {
  id: string
  name: string
  tracking_code: string
  description: string | null
  redirect_url: string | null
  short_url?: string
  is_clicked: boolean
  clicked_at: string | null
  created_at: string
}

interface ChartData {
  date: string
  count: number
}

// Set password untuk akses dashboard (sebaiknya ini disimpan di environment variable)
const DASHBOARD_PASSWORD = "psy27"

Chart.register(...registerables)

export default function Dashboard() {
  const [trackingData, setTrackingData] = useState<TrackingData[]>([])
  const [trackingLink, setTrackingLink] = useState<TrackingLink | null>(null)
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [linkCode, setLinkCode] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const pollingRef = useRef<number | null>(null)
  const [timeChartData, setTimeChartData] = useState<ChartData[]>([])
  const timeChartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

  // Periksa apakah sudah login sebelumnya (dengan localStorage)
  useEffect(() => {
    const auth = localStorage.getItem('dashboard_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    } else {
      setLoading(false)
    }
  }, [])

  // Cleanup polling pada unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }
  }, [])

  // Fungsi untuk login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password === DASHBOARD_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem('dashboard_auth', 'true')
      setError(null)
    } else {
      setError('Password salah. Silakan coba lagi.')
    }
  }

  // Fungsi untuk logout
  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('dashboard_auth')
    setPassword('')
    setLinkCode('')
    setTrackingData([])
    setTrackingLink(null)
    setHasSearched(false)
    setIsWaiting(false)
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  // Fetch data link tracking
  const fetchTrackingLink = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('tracking_links')
        .select('*')
        .eq('tracking_code', code.trim())
        .single()
      
      if (error) throw error
      
      return data as TrackingLink
    } catch (error) {
      console.error('Error fetching tracking link:', error)
      return null
    }
  }

  // Polling untuk cek data tracking baru
  const startPolling = () => {
    setTimeElapsed(0)
    setIsWaiting(true)
    
    // Stop existing polling if any
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    
    // Check immediately first
    fetchTrackingData(undefined, false)
    
    // Then start polling
    pollingRef.current = window.setInterval(() => {
      fetchTrackingData(undefined, false)
      setTimeElapsed(prev => prev + 5)
    }, 5000) // Check every 5 seconds
  }

  // Fetch data tracking dari Supabase
  const fetchTrackingData = async (e?: React.FormEvent, initialSearch: boolean = true) => {
    if (e) e.preventDefault()
    
    if (initialSearch && !linkCode.trim()) {
      setError('Masukkan kode tracking untuk melihat data')
      return
    }
    
    const currentCode = initialSearch ? linkCode.trim() : linkCode
    
    if (initialSearch) {
      setLoading(true)
      setError(null)
      setTrackingData([])
      setTrackingLink(null)
      setIsWaiting(false)
      
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
    
    try {
      // Ambil informasi link terlebih dahulu jika ini pencarian awal
      if (initialSearch) {
        const link = await fetchTrackingLink(currentCode)
        setTrackingLink(link)
      }
      
      // Filter berdasarkan kode tracking dan ambil data unik berdasarkan ID
      const { data, error } = await supabase
        .from('tracking_logs')
        .select('*')
        .eq('tracking_code', currentCode)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Ambil data unik berdasarkan kombinasi lat dan lng
      // Ini akan memastikan bahwa data dengan lokasi yang sama tidak muncul dua kali
      const locationMap = new Map()
      data?.forEach(item => {
        const locationKey = `${item.lat},${item.lng}`
        if (!locationMap.has(locationKey)) {
          locationMap.set(locationKey, item)
        }
      })
      
      const uniqueData = Array.from(locationMap.values()) as TrackingData[]
      setTrackingData(uniqueData)
      
      // Jika ada data, hentikan polling
      if (uniqueData.length > 0 && pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
        setIsWaiting(false)
      }
      
      if (initialSearch) {
        setHasSearched(true)
        // Jika tidak ada data tracking tapi link valid, mulai polling
        if (uniqueData.length === 0 && trackingLink) {
          startPolling()
        }
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error)
      if (initialSearch) {
        setError('Terjadi kesalahan saat mengambil data tracking')
      }
    } finally {
      if (initialSearch) {
        setLoading(false)
      }
    }
  }

  // Fungsi untuk memformat data tracking untuk grafik berdasarkan waktu
  const prepareTimeChartData = (data: TrackingData[]) => {
    const dateCountMap = new Map<string, number>()
    
    // Sortir data berdasarkan created_at
    const sortedData = [...data].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    // Hitung jumlah tracking per tanggal
    sortedData.forEach(item => {
      const date = new Date(item.created_at)
      const dateStr = `${date.getDate()}/${date.getMonth() + 1}`
      
      if (dateCountMap.has(dateStr)) {
        dateCountMap.set(dateStr, dateCountMap.get(dateStr)! + 1)
      } else {
        dateCountMap.set(dateStr, 1)
      }
    })
    
    // Convert map to array
    const chartData: ChartData[] = []
    dateCountMap.forEach((count, date) => {
      chartData.push({ date, count })
    })
    
    return chartData
  }
  
  // Buat grafik waktu
  const renderTimeChart = useCallback(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }
    
    if (!timeChartRef.current || timeChartData.length === 0) return
    
    const ctx = timeChartRef.current.getContext('2d')
    if (!ctx) return
    
    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeChartData.map(d => d.date),
        datasets: [{
          label: 'Jumlah Tracking',
          data: timeChartData.map(d => d.count),
          backgroundColor: 'rgba(147, 51, 234, 0.2)',
          borderColor: 'rgba(147, 51, 234, 1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                family: 'Inter, sans-serif'
              }
            }
          },
          title: {
            display: true,
            text: 'Aktivitas Tracking Berdasarkan Waktu',
            font: {
              size: 16,
              family: 'Inter, sans-serif'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    })
  }, [timeChartData])
  
  // Update grafik saat data tracking berubah
  useEffect(() => {
    if (trackingData.length > 0) {
      const chartData = prepareTimeChartData(trackingData)
      setTimeChartData(chartData)
    }
  }, [trackingData])
  
  // Render grafik saat data chart berubah
  useEffect(() => {
    if (timeChartData.length > 0) {
      renderTimeChart()
    }
  }, [timeChartData, renderTimeChart])

  // Tampilkan form login jika belum terautentikasi
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              Dashboard Access
            </h1>
            <p className="text-gray-600 mt-2">Masukkan password untuk melihat data tracking</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-primary pr-10"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              Masuk ke Dashboard
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <Link to="/" className="text-purple-600 hover:text-purple-700 font-medium">
              &larr; Kembali ke Halaman Utama
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4 md:mb-0 flex items-center">
              <svg className="w-8 h-8 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2a8 8 0 0 0-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 0 0-8-8z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Dashboard Tracking
            </h1>
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="inline-flex items-center bg-gray-100 py-2 px-4 rounded-lg text-gray-700 hover:bg-gray-200 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
                </svg>
                <span>Home</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="inline-flex items-center bg-red-100 py-2 px-4 rounded-lg text-red-700 hover:bg-red-200 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <form onSubmit={fetchTrackingData} className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                <label htmlFor="linkCode" className="block text-gray-700 font-medium mb-2">
                  Masukkan Kode Tracking
                </label>
                <input
                  type="text"
                  id="linkCode"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value)}
                  className="input-primary"
                  placeholder="Masukkan kode tracking link Anda"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? 'Mencari...' : 'Lihat Data'}
                </button>
              </div>
            </form>
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                {error}
              </div>
            )}
          </div>
        </div>
        
        {hasSearched && trackingLink && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Detail Link Tracking</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nama Link:</p>
                  <p className="font-medium text-gray-800">{trackingLink.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kode Tracking:</p>
                  <p className="font-mono font-medium text-gray-800">{trackingLink.tracking_code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">URL Lengkap:</p>
                  <div className="flex items-center">
                    <p className="font-medium text-gray-800 break-all mr-2">
                      {trackingLink.name.startsWith('expired_') ? 
                        'Link sudah tidak aktif' : 
                        `${window.location.origin}/promo/${trackingLink.name}`
                      }
                    </p>
                    {!trackingLink.name.startsWith('expired_') && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/promo/${trackingLink.name}`)
                        }}
                        className="text-purple-600 hover:text-purple-700"
                        title="Salin URL"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status Link:</p>
                  {trackingLink.is_clicked ? (
                    <div className="flex items-center">
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                        Sudah Diklik
                      </span>
                      {trackingLink.clicked_at && (
                        <span className="text-sm text-gray-600">
                          pada {new Date(trackingLink.clicked_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                      Aktif
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dibuat pada:</p>
                  <p className="font-medium text-gray-800">{new Date(trackingLink.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {isWaiting && trackingLink && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <svg className="w-16 h-16 text-purple-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Menunggu target mengakses link...
              </h3>
              <p className="text-gray-600 mb-4">
                Sistem akan otomatis memperbarui data ketika target mengklik link tracking Anda.
              </p>
              <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-4">
                <div className="bg-purple-600 h-2.5 rounded-full w-full animate-pulse"></div>
              </div>
              <p className="text-gray-500 text-sm">
                Menunggu selama {timeElapsed} detik
              </p>
            </div>
          </div>
        )}
        
        {hasSearched && !isWaiting && (
          <>
            {trackingData.length > 0 ? (
              <>
                <p className="text-gray-600 mb-8 text-lg">
                  Menampilkan {trackingData.length} hasil tracking untuk kode: <span className="font-mono font-medium">{linkCode}</span>
                </p>
                
                {/* Tambahkan grafik waktu */}
                {timeChartData.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                    <canvas ref={timeChartRef} height="200"></canvas>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trackingData.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-[1.02] transition-transform duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Kode: {item.tracking_code}</h2>
                        <span className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500">Alamat</p>
                          <p className="text-gray-800">{item.address}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Device Info</p>
                          <p className="text-gray-800">{item.device_info}</p>
                        </div>
                        
                        <a 
                          href={item.google_maps_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-purple-600 hover:text-purple-700"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Lihat di Google Maps
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : trackingLink ? (
              <div className="text-center py-12">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
                  <svg className="w-16 h-16 text-purple-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Target belum mengakses link
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Link <span className="font-medium">{trackingLink.name}</span> sudah dibuat, tapi belum ada yang mengaksesnya.
                  </p>
                  <button
                    onClick={() => startPolling()}
                    className="inline-flex items-center justify-center w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mulai Monitoring Real-time
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Tidak ada data untuk kode: <span className="font-mono">{linkCode}</span>
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Pastikan kode tracking yang Anda masukkan benar atau coba kode tracking yang lain.
                  </p>
                  <Link 
                    to="/" 
                    className="inline-flex items-center justify-center w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                  >
                    Buat Link Tracking Baru
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
        
        {!hasSearched && (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Masukkan Kode Tracking Anda
              </h3>
              <p className="text-gray-600 mb-4">
                Masukkan kode tracking dari link yang Anda buat untuk melihat data lokasi.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 