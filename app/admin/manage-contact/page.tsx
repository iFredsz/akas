"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Save, Edit2, X, ExternalLink, MapPin } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ContactData {
  id: string;
  company_name: string;
  hero_title: string;
  hero_subtitle: string;
  address: string;
  phone: string;
  email: string;
  office_hours: string;
  maps_url: string;
  address_url: string;
  whatsapp_url: string;
}

const DEFAULT_DATA: ContactData = {
  id: '',
  company_name: 'CV Akas Brother Consultant',
  hero_title: 'Mari Mulai Proyek Anda',
  hero_subtitle: 'Tim profesional kami siap membantu mewujudkan visi proyek Anda dengan solusi konsultan terbaik.',
  address: 'Perumahan Griya Annisa Estate Blok B No 9 Jl Rusa Gg Bendo 2, Kel Sukamenanti Kec Kedaton, Bandar Lampung, Lampung, Indonesia',
  phone: '+62 812-3456-7890',
  email: 'info@akasbrotherconsultant.co.id',
  office_hours: 'Senin – Jumat\n08.00 – 17.00 WIB',
  maps_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3972.123456789012!2d105.2627345!3d-5.3979876!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNcKwMjInNTIuOCJTIDEwNcKwMTUnNDkuOCJF!5e0!3m2!1sid!2sid!4v1234567890',
  address_url: 'https://maps.app.goo.gl/your-address-url',
  whatsapp_url: 'https://wa.me/6281234567890'
};

export default function AdminContactPage() {
  const [formData, setFormData] = useState<ContactData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tempMapsIframe, setTempMapsIframe] = useState('');
  const [tempAddressUrl, setTempAddressUrl] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contact_page')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setFormData(data);
        setTempAddressUrl(data.address_url || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTempAddressUrl(value);
    setFormData(prev => ({
      ...prev,
      address_url: value
    }));
  };

  const handleMapsIframeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const iframeCode = e.target.value;
    setTempMapsIframe(iframeCode);
    
    const srcMatch = iframeCode.match(/src="([^"]*)"/);
    if (srcMatch && srcMatch[1]) {
      setFormData(prev => ({
        ...prev,
        maps_url: srcMatch[1]
      }));
    }
  };

  const generateMapsUrlFromAddress = () => {
    const encodedAddress = encodeURIComponent(formData.address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    setTempAddressUrl(mapsUrl);
    setFormData(prev => ({
      ...prev,
      address_url: mapsUrl
    }));
    toast.info('URL Google Maps telah digenerate dari alamat');
  };

  const handleStartEdit = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();
      
      let result;
      
      if (formData.id) {
        result = await supabase
          .from('contact_page')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.id);
      } else {
        result = await supabase
          .from('contact_page')
          .insert([formData])
          .select()
          .single();
          
        if (result.data) {
          setFormData(result.data);
        }
      }

      if (result.error) throw result.error;

      toast.success('Data berhasil disimpan!');
      setEditing(false);

    } catch (error) {
      console.error('Error saving:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan data';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Manage Contact
              </h1>
              <p className="text-gray-600 mt-1">
                Edit informasi kontak perusahaan
              </p>
            </div>
            
            {!editing ? (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-6 py-3 bg-[#A6FF00] text-gray-900 rounded-lg hover:bg-[#A6FF00]/90 transition font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Edit Data
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  <X className="w-4 h-4" />
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-300">
                  Informasi Perusahaan
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Perusahaan
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900"
                        placeholder="CV Akas Brother Consultant"
                      />
                    ) : (
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg">
                        <p className="text-gray-900">{formData.company_name}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Judul Halaman
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="hero_title"
                        value={formData.hero_title}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900"
                        placeholder="Mari Mulai Proyek Anda"
                      />
                    ) : (
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg">
                        <p className="text-gray-900">{formData.hero_title}</p>
                      </div>
                    )}
                    
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    {editing ? (
                      <textarea
                        name="hero_subtitle"
                        value={formData.hero_subtitle}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900"
                        placeholder="Tim profesional kami siap membantu..."
                      />
                    ) : (
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg">
                        <p className="text-gray-900">{formData.hero_subtitle}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-300">
                  Kontak
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telepon
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900"
                        placeholder="+62 812-3456-7890"
                      />
                    ) : (
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg">
                        <p className="text-gray-900">{formData.phone}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp URL
                    </label>
                    {editing ? (
                      <input
                        type="url"
                        name="whatsapp_url"
                        value={formData.whatsapp_url}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900"
                        placeholder="https://wa.me/6281234567890"
                      />
                    ) : (
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg">
                        <p className="text-gray-900 break-all">{formData.whatsapp_url}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    {editing ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900"
                        placeholder="info@akasbrotherconsultant.co.id"
                      />
                    ) : (
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg">
                        <p className="text-gray-900">{formData.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-300">
                  Alamat & Peta
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alamat Lengkap
                    </label>
                    {editing ? (
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={5}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900"
                        placeholder="Perumahan Griya Annisa Estate..."
                      />
                    ) : (
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg whitespace-pre-line">
                        <p className="text-gray-900">{formData.address}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Google Maps Link (untuk card alamat)
                      </label>
                      {editing && (
                        <button
                          type="button"
                          onClick={generateMapsUrlFromAddress}
                          className="flex items-center gap-1 text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        >
                          <MapPin className="w-3 h-3" />
                          Generate dari Alamat
                        </button>
                      )}
                    </div>
                    {editing ? (
                      <div className="space-y-2">
                        <input
                          type="url"
                          value={tempAddressUrl}
                          onChange={handleAddressUrlChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900"
                          placeholder="https://maps.app.goo.gl/your-address-url"
                        />
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <ExternalLink className="w-3 h-3" />
                          <span>Link yang akan dibuka saat user klik card alamat</span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg">
                        <p className="text-gray-900 text-sm break-all">
                          {formData.address_url || 'Belum ada URL'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Maps Embed (untuk iframe)
                    </label>
                    {editing ? (
                      <>
                        <textarea
                          value={tempMapsIframe}
                          onChange={handleMapsIframeChange}
                          rows={3}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900 font-mono text-sm"
                          placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
                        />
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-800">
                            <strong>Cara:</strong> Copy seluruh kode iframe dari Google Maps (Bagikan → Sematkan peta)
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg">
                        <p className="text-gray-900 text-sm break-all">{formData.maps_url}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-300">
                  Jam Operasional
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jam Operasional
                  </label>
                  {editing ? (
                    <textarea
                      name="office_hours"
                      value={formData.office_hours}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A6FF00] focus:border-[#A6FF00] bg-white text-gray-900"
                      placeholder="Senin – Jumat\n08.00 – 17.00 WIB"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-line">{formData.office_hours}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}