'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/browser'
import Image from 'next/image'
import { HiLink, HiUserGroup, HiOfficeBuilding, HiTrash, HiPlus, HiCheckCircle } from 'react-icons/hi'

// Type definitions
interface Client {
  id: string
  name: string
  logo_url: string
  created_at: string
}

interface Partner {
  id: string
  name: string
  description: string
  logo_url: string | null
  created_at: string
}

interface HomepageSettings {
  id: number
  konsultasi_link: string
  hubungi_link: string
  updated_at: string
}

export default function AdminHomepage() {
  /* ================= SETTINGS ================= */
  const [settings, setSettings] = useState<HomepageSettings | null>(null)
  const [konsultasi, setKonsultasi] = useState('')
  const [hubungi, setHubungi] = useState('')
  const [saving, setSaving] = useState(false)

  /* ================= CLIENT ================= */
  const [clients, setClients] = useState<Client[]>([])
  const [clientName, setClientName] = useState('')
  const [clientFile, setClientFile] = useState<File | null>(null)
  const [uploadingClient, setUploadingClient] = useState(false)

  /* ================= PARTNER ================= */
  const [partners, setPartners] = useState<Partner[]>([])
  const [partnerName, setPartnerName] = useState('')
  const [partnerDesc, setPartnerDesc] = useState('')
  const [partnerFile, setPartnerFile] = useState<File | null>(null)
  const [uploadingPartner, setUploadingPartner] = useState(false)

  /* ================= LOAD DATA ================= */
  const loadAll = useCallback(async () => {
    try {
      // Load settings
      const { data: settingsData } = await supabase
        .from('homepage_settings')
        .select('*')
        .single()

      if (settingsData) {
        setSettings(settingsData)
        setKonsultasi(settingsData.konsultasi_link || '')
        setHubungi(settingsData.hubungi_link || '')
      }

      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      // Load partners
      const { data: partnersData } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false })

      setClients(clientsData || [])
      setPartners(partnersData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [])

  useEffect(() => {
    const initializeData = async () => {
      await loadAll()
    }
    initializeData()
  }, [loadAll])

  /* ================= SAVE SETTINGS ================= */
  const saveSettings = async () => {
    if (!konsultasi || !hubungi) {
      alert('Semua field harus diisi')
      return
    }

    setSaving(true)

    try {
      const updatedSettings: Partial<HomepageSettings> = {
        konsultasi_link: konsultasi,
        hubungi_link: hubungi,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('homepage_settings')
        .upsert({
          id: 1,
          ...updatedSettings,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setSettings(data)
        alert('Link berhasil diperbarui!')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Gagal menyimpan link')
    } finally {
      setSaving(false)
    }
  }

  /* ================= ADD CLIENT ================= */
  const addClient = async () => {
    if (!clientName || !clientFile) {
      alert('Nama dan logo klien wajib diisi')
      return
    }

    setUploadingClient(true)

    try {
      const path = `clients/${Date.now()}-${clientFile.name}`

      const { error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(path, clientFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('client-logos')
        .getPublicUrl(path)

      const { error: insertError } = await supabase.from('clients').insert({
        name: clientName,
        logo_url: data.publicUrl,
      })

      if (insertError) throw insertError

      setClientName('')
      setClientFile(null)
      loadAll()
      alert('Klien berhasil ditambahkan!')
    } catch (error) {
      console.error('Error adding client:', error)
      alert('Gagal menambahkan klien')
    } finally {
      setUploadingClient(false)
    }
  }

  const deleteClient = async (id: string, logoUrl: string) => {
    if (!confirm('Yakin ingin menghapus klien ini?')) return
    
    try {
      const urlParts = logoUrl.split('/')
      const filename = urlParts[urlParts.length - 1]
      const path = `clients/${filename}`
      
      const { error: storageError } = await supabase.storage
        .from('client-logos')
        .remove([path])
      
      if (storageError) {
        console.error('Error deleting logo:', storageError)
      }
      
      const { error: dbError } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
      
      if (dbError) throw dbError
      
      loadAll()
      alert('Klien berhasil dihapus!')
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Gagal menghapus klien')
    }
  }

  /* ================= ADD PARTNER ================= */
  const addPartner = async () => {
    if (!partnerName) {
      alert('Nama mitra wajib diisi')
      return
    }

    setUploadingPartner(true)

    try {
      let logoUrl = null

      if (partnerFile) {
        const path = `partners/${Date.now()}-${partnerFile.name}`

        const { error: uploadError } = await supabase.storage
          .from('partner-logos')
          .upload(path, partnerFile)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('partner-logos')
          .getPublicUrl(path)

        logoUrl = data.publicUrl
      }

      const { error: insertError } = await supabase.from('partners').insert({
        name: partnerName,
        description: partnerDesc,
        logo_url: logoUrl,
      })

      if (insertError) throw insertError

      setPartnerName('')
      setPartnerDesc('')
      setPartnerFile(null)
      loadAll()
      alert('Mitra berhasil ditambahkan!')
    } catch (error) {
      console.error('Error adding partner:', error)
      alert('Gagal menambahkan mitra')
    } finally {
      setUploadingPartner(false)
    }
  }

  const deletePartner = async (id: string, logoUrl: string | null) => {
    if (!confirm('Yakin ingin menghapus mitra ini?')) return
    
    try {
      if (logoUrl) {
        const urlParts = logoUrl.split('/')
        const filename = urlParts[urlParts.length - 1]
        const path = `partners/${filename}`
        
        const { error: storageError } = await supabase.storage
          .from('partner-logos')
          .remove([path])
        
        if (storageError) {
          console.error('Error deleting partner logo:', storageError)
        }
      }
      
      const { error: dbError } = await supabase
        .from('partners')
        .delete()
        .eq('id', id)
      
      if (dbError) throw dbError
      
      loadAll()
      alert('Mitra berhasil dihapus!')
    } catch (error) {
      console.error('Error deleting partner:', error)
      alert('Gagal menghapus mitra')
    }
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen ">
      <div>
        {/* Header */}
        <div>
         <h1 className="text-3xl font-bold text-gray-900">Manage Profile</h1>
          <p className="text-gray-600 mt-2">Atur link, klien, dan mitra kontraktor Anda</p>
        </div>

        {/* SETTINGS SECTION */}
        <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 border-2 border-gray-100 hover:border-[#A6FF00]/30 transition-all">
          <div className="flex items-center gap-3 mb-6">
            <HiLink className="text-3xl text-[#A6FF00]" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Link Button Homepage</h2>
              {settings && (
                <p className="text-sm text-gray-500">
                  Terakhir diupdate: {new Date(settings.updated_at).toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Link "Konsultasi Sekarang"
              </label>
              <input
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#A6FF00] focus:outline-none transition-colors"
                placeholder="https://wa.me/628123456789"
                value={konsultasi}
                onChange={(e) => setKonsultasi(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Link WhatsApp, Instagram, atau platform lainnya</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Link "Hubungi Kami"
              </label>
              <input
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#A6FF00] focus:outline-none transition-colors"
                placeholder="https://wa.me/628123456789"
                value={hubungi}
                onChange={(e) => setHubungi(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Link WhatsApp, Instagram, atau platform lainnya</p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-[#A6FF00] text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-[#95e600] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <HiCheckCircle className="text-xl" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </section>

        {/* CLIENTS SECTION */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <HiUserGroup className="text-3xl text-[#A6FF00]" />
            <h2 className="text-2xl font-bold text-gray-900">Klien Kami</h2>
            <span className="bg-[#A6FF00] text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
              {clients.length}
            </span>
          </div>

          {/* Add Client Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <HiPlus className="text-[#A6FF00]" />
              Tambah Klien Baru
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Klien *
                </label>
                <input
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#A6FF00] focus:outline-none transition-colors"
                  placeholder="PT. Contoh Indonesia"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Logo Klien *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setClientFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#A6FF00] focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#A6FF00] file:text-gray-900 file:font-semibold hover:file:bg-[#95e600] file:cursor-pointer"
                />
                {clientFile && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    ✓ {clientFile.name}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={addClient}
              disabled={uploadingClient}
              className="bg-[#A6FF00] text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-[#95e600] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md"
            >
              <HiPlus className="text-xl" />
              {uploadingClient ? 'Mengupload...' : 'Tambah Klien'}
            </button>
          </div>

          {/* Clients Grid */}
          {clients.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">Belum ada klien yang ditambahkan</p>
              <p className="text-gray-400 text-sm mt-2">Mulai tambahkan klien pertama Anda di atas</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {clients.map((c) => (
                <div key={c.id} className="bg-white rounded-xl shadow-md p-5 relative group hover:shadow-xl transition-all border-2 border-transparent hover:border-[#A6FF00]">
                  {c.logo_url && (
                    <div className="h-20 w-full relative mb-4 bg-gray-50 rounded-lg p-2">
                      <Image
                        src={c.logo_url}
                        alt={`Logo ${c.name}`}
                        fill
                        style={{ objectFit: 'contain' }}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    </div>
                  )}
                  <p className="font-bold text-gray-900 text-center">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    {new Date(c.created_at).toLocaleDateString('id-ID')}
                  </p>
                  <button
                    onClick={() => deleteClient(c.id, c.logo_url)}
                    className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg"
                    title="Hapus klien"
                  >
                    <HiTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* PARTNERS SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <HiOfficeBuilding className="text-3xl text-[#A6FF00]" />
            <h2 className="text-2xl font-bold text-gray-900">Mitra Kontraktor</h2>
            <span className="bg-[#A6FF00] text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
              {partners.length}
            </span>
          </div>

          {/* Add Partner Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <HiPlus className="text-[#A6FF00]" />
              Tambah Mitra Baru
            </h3>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Mitra *
                </label>
                <input
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#A6FF00] focus:outline-none transition-colors"
                  placeholder="PT. Mitra Bangun Jaya"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Deskripsi Mitra
                </label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#A6FF00] focus:outline-none transition-colors resize-none"
                  placeholder="Deskripsi singkat tentang mitra kontraktor..."
                  value={partnerDesc}
                  onChange={(e) => setPartnerDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Logo Mitra (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPartnerFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#A6FF00] focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#A6FF00] file:text-gray-900 file:font-semibold hover:file:bg-[#95e600] file:cursor-pointer"
                />
                {partnerFile && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    ✓ {partnerFile.name}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={addPartner}
              disabled={uploadingPartner}
              className="bg-[#A6FF00] text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-[#95e600] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md"
            >
              <HiPlus className="text-xl" />
              {uploadingPartner ? 'Mengupload...' : 'Tambah Mitra'}
            </button>
          </div>

          {/* Partners Grid */}
          {partners.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">🤝</div>
              <p className="text-gray-500 text-lg">Belum ada mitra yang ditambahkan</p>
              <p className="text-gray-400 text-sm mt-2">Mulai tambahkan mitra kontraktor pertama Anda di atas</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {partners.map((p) => (
                <div key={p.id} className="bg-white rounded-xl shadow-md p-6 relative group hover:shadow-xl transition-all border-2 border-transparent hover:border-[#A6FF00]">
                  {p.logo_url && (
                    <div className="h-16 w-full relative mb-4 bg-gray-50 rounded-lg p-2">
                      <Image
                        src={p.logo_url}
                        alt={`Logo ${p.name}`}
                        fill
                        style={{ objectFit: 'contain' }}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 text-lg">{p.name}</h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.description}</p>
                  <p className="text-xs text-gray-400 mt-3">
                    {new Date(p.created_at).toLocaleDateString('id-ID')}
                  </p>

                  <button
                    onClick={() => deletePartner(p.id, p.logo_url)}
                    className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg"
                    title="Hapus mitra"
                  >
                    <HiTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}