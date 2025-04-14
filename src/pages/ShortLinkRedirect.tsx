import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ShortLinkRedirect() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOriginalLink = async () => {
      try {
        // Konstruksi shortlink yang dibuat
        const shortUrl = `${window.location.origin}/s/${code}`
        
        // Cari link di database
        const { data, error } = await supabase
          .from('tracking_links')
          .select('name')
          .eq('short_url', shortUrl)
          .single()
        
        if (error) throw error
        
        if (data && data.name) {
          // Ditemukan, redirect ke halaman promo dengan nama yang sesuai
          navigate(`/promo/${data.name}`, { replace: true })
        } else {
          setError('Link tidak ditemukan')
        }
      } catch (err) {
        console.error('Error redirecting from short link:', err)
        setError('Terjadi kesalahan saat mengakses link')
      }
    }
    
    fetchOriginalLink()
  }, [code, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Link Tidak Valid</h1>
          
          <p className="text-gray-600 mb-6">
            Link yang Anda coba akses tidak valid atau telah kedaluwarsa.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/')} 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tampilkan loading saat melakukan redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-16 h-16 border-4 border-current border-r-transparent text-purple-600 rounded-full animate-spin mb-6"></div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Mengalihkan...</h1>
        <p className="text-gray-600">Mohon tunggu sebentar</p>
      </div>
    </div>
  )
} 