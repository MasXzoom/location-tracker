-- Menambahkan kolom-kolom baru ke tabel tracking_links
ALTER TABLE tracking_links 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS redirect_url TEXT,
ADD COLUMN IF NOT EXISTS short_url TEXT,
ADD COLUMN IF NOT EXISTS is_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- Memperbarui RLS policies untuk mengizinkan akses ke kolom baru
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Allow public read" ON tracking_links;
DROP POLICY IF EXISTS "Allow public insert" ON tracking_links;
DROP POLICY IF EXISTS "Allow public update" ON tracking_links;

-- Buat policy baru yang mencakup semua kolom
CREATE POLICY "Allow public read" 
ON tracking_links FOR SELECT 
TO anon
USING (true);

CREATE POLICY "Allow public insert" 
ON tracking_links FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "Allow public update" 
ON tracking_links FOR UPDATE
TO anon
USING (true);

-- Membuat index untuk mempercepat pencarian
CREATE INDEX IF NOT EXISTS idx_tracking_links_name ON tracking_links(name);
CREATE INDEX IF NOT EXISTS idx_tracking_links_tracking_code ON tracking_links(tracking_code); 