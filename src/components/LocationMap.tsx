import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import './LocationMap.css'

interface LocationPoint {
  id: string
  lat: number
  lng: number
  address: string
  created_at: string
}

interface LocationMapProps {
  locations: LocationPoint[]
  height?: string
}

// Icon harus diinisialisasi ulang karena path relatif di CSS Leaflet
// https://github.com/Leaflet/Leaflet/issues/4968
const fixLeafletIcon = () => {
  // Menggunakan type casting yang lebih spesifik untuk menghindari penggunaan any
  const iconProto = L.Icon.Default.prototype as {
    _getIconUrl?: unknown;
    options: L.IconOptions;
  };
  
  delete iconProto._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

const LocationMap = ({ locations, height }: LocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.MarkerClusterGroup | null>(null)

  useEffect(() => {
    // Inisialisasi peta saat komponen dimuat
    if (mapRef.current && !leafletMap.current) {
      fixLeafletIcon()
      
      // Buat peta
      leafletMap.current = L.map(mapRef.current).setView([-1.6, 118], 5) // Indonesia di tengah
      
      // Tambahkan layer tiles (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(leafletMap.current)
      
      // Buat layer marker dengan clustering
      markersLayer.current = L.markerClusterGroup()
      leafletMap.current.addLayer(markersLayer.current)
    }
    
    // Cleanup saat komponen unmount
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }
    }
  }, [])
  
  // Update markers saat locations berubah
  useEffect(() => {
    if (!markersLayer.current || !leafletMap.current || locations.length === 0) return
    
    // Hapus marker yang ada
    markersLayer.current.clearLayers()
    
    // Tambahkan marker baru untuk setiap lokasi
    const markers: L.Marker[] = []
    const bounds = L.latLngBounds([])
    
    locations.forEach((location) => {
      // Buat marker
      const marker = L.marker([location.lat, location.lng])
        .bindPopup(`
          <div class="location-map-popup">
            <p><strong>Alamat:</strong> ${location.address}</p>
            <p><strong>Tanggal:</strong> ${new Date(location.created_at).toLocaleString()}</p>
            <p>
              <a href="https://www.google.com/maps?q=${location.lat},${location.lng}" 
                 target="_blank" rel="noopener noreferrer">
                Lihat di Google Maps
              </a>
            </p>
          </div>
        `)
      
      markers.push(marker)
      bounds.extend([location.lat, location.lng])
    })
    
    // Tambahkan marker ke layer clustering
    markersLayer.current.addLayers(markers)
    
    // Zoom ke bounds dari semua marker
    if (markers.length > 0) {
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [locations])

  // Set custom height via DOM if provided
  useEffect(() => {
    if (mapRef.current && height) {
      mapRef.current.style.height = height;
    }
  }, [height]);

  // Tidak ada inline style, menggunakan className saja
  return <div ref={mapRef} className="location-map" />
}

export default LocationMap