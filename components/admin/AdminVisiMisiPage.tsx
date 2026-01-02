"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FiDownload, FiUpload, FiSave, FiX, FiTrash2, FiEdit2 } from "react-icons/fi";
import { toast } from "react-toastify";

interface MisiItem {
  id: string;
  order_number: number;
  title: string;
  description: string;
}

interface VisiMisiData {
  id: string;
  hero_image: string;
  hero_title: string;
  hero_subtitle: string;
  company_name: string;
  pdf_url: string | null;
  pdf_filename: string | null;
  visi_text: string;
  updated_at: string;
}

export default function AdminVisiMisiPage() {
  const supabase = createClient();
  
  const [data, setData] = useState<VisiMisiData | null>(null);
  const [misiList, setMisiList] = useState<MisiItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit mode states
  const [isEditingMain, setIsEditingMain] = useState(false);
  
  // Form states
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [visiText, setVisiText] = useState("");
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState("");
  const [shouldDeleteImage, setShouldDeleteImage] = useState(false);
  const [shouldDeletePdf, setShouldDeletePdf] = useState(false);

  // Modal states
  const [showAddMisi, setShowAddMisi] = useState(false);
  const [editingMisi, setEditingMisi] = useState<MisiItem | null>(null);
  const [misiTitle, setMisiTitle] = useState("");
  const [misiDescription, setMisiDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{id: string, title: string} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch visi misi data
      const { data: visiMisiData, error: visiError } = await supabase
        .from("visi_misi")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (visiError && visiError.code !== "PGRST116") {
        throw visiError;
      }

      if (visiMisiData) {
        setData(visiMisiData);
        setHeroTitle(visiMisiData.hero_title);
        setHeroSubtitle(visiMisiData.hero_subtitle);
        setCompanyName(visiMisiData.company_name);
        setVisiText(visiMisiData.visi_text);
        
        // Set preview dari database
        setHeroImagePreview(getImageUrl(visiMisiData.hero_image));
      }

      // Fetch misi list
      const { data: misiData, error: misiError } = await supabase
        .from("misi_items")
        .select("*")
        .order("order_number", { ascending: true });

      if (misiError) throw misiError;

      setMisiList(misiData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data");
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith('http') || path.startsWith('/')) {
      return path;
    }
    return supabase.storage.from("visi-misi").getPublicUrl(path).data.publicUrl;
  };

  const handleEditMain = () => {
    setIsEditingMain(true);
    setShouldDeleteImage(false);
    setShouldDeletePdf(false);
  };

  const handleCancelEdit = () => {
    // Reset form ke data awal
    if (data) {
      setHeroTitle(data.hero_title);
      setHeroSubtitle(data.hero_subtitle);
      setCompanyName(data.company_name);
      setVisiText(data.visi_text);
      setHeroImagePreview(getImageUrl(data.hero_image));
    }
    setHeroImageFile(null);
    setPdfFile(null);
    setShouldDeleteImage(false);
    setShouldDeletePdf(false);
    setIsEditingMain(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }
      setHeroImageFile(file);
      setHeroImagePreview(URL.createObjectURL(file));
      setShouldDeleteImage(false);
    }
  };

  const handleDeleteImage = () => {
    setShouldDeleteImage(true);
    setHeroImageFile(null);
    setHeroImagePreview("");
    toast.info("Foto akan dihapus saat menyimpan");
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("File harus berformat PDF");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 10MB");
        return;
      }
      setPdfFile(file);
      setShouldDeletePdf(false);
      toast.success(`File ${file.name} siap diupload`);
    }
  };

  const handleDeletePdf = () => {
    setShouldDeletePdf(true);
    setPdfFile(null);
    toast.info("PDF akan dihapus saat menyimpan");
  };

  const deleteOldFile = async (path: string, bucket: string) => {
    if (!path || path.startsWith('http') || path.startsWith('/')) return;
    
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      
      if (error) {
        console.error("Error deleting old file:", error);
      }
    } catch (error) {
      console.error("Error in deleteOldFile:", error);
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return { path: fileName, url: urlData.publicUrl };
  };

  const handleSaveMain = async () => {
    if (!heroTitle.trim() || !visiText.trim()) {
      toast.error("Judul dan visi tidak boleh kosong");
      return;
    }

    setIsSaving(true);
    try {
      let heroImagePath = data?.hero_image || "";
      let pdfUrl = data?.pdf_url || null;
      let pdfFilename = data?.pdf_filename || null;

      // Handle image deletion or upload
      if (shouldDeleteImage) {
        // Delete old image
        if (data?.hero_image) {
          await deleteOldFile(data.hero_image, "visi-misi");
        }
        heroImagePath = "";
      } else if (heroImageFile) {
        // Delete old image
        if (data?.hero_image) {
          await deleteOldFile(data.hero_image, "visi-misi");
        }
        
        const { path } = await uploadFile(heroImageFile, "visi-misi", "hero");
        heroImagePath = path;
      }

      // Handle PDF deletion or upload
      if (shouldDeletePdf) {
        // Delete old PDF
        if (data?.pdf_url) {
          const oldPdfPath = data.pdf_url.split('/documents/')[1];
          if (oldPdfPath) {
            await deleteOldFile(oldPdfPath, "documents");
          }
        }
        pdfUrl = null;
        pdfFilename = null;
      } else if (pdfFile) {
        // Delete old PDF
        if (data?.pdf_url) {
          const oldPdfPath = data.pdf_url.split('/documents/')[1];
          if (oldPdfPath) {
            await deleteOldFile(oldPdfPath, "documents");
          }
        }
        
        const { path, url } = await uploadFile(pdfFile, "documents", "perizinan");
        pdfUrl = url;
        pdfFilename = pdfFile.name;
      }

      const payload = {
        hero_image: heroImagePath,
        hero_title: heroTitle.trim(),
        hero_subtitle: heroSubtitle.trim(),
        company_name: companyName.trim(),
        visi_text: visiText.trim(),
        pdf_url: pdfUrl,
        pdf_filename: pdfFilename,
        updated_at: new Date().toISOString(),
      };

      if (data?.id) {
        const { error } = await supabase
          .from("visi_misi")
          .update(payload)
          .eq("id", data.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("visi_misi")
          .insert([payload]);

        if (error) throw error;
      }

      toast.success("Data berhasil disimpan");
      setHeroImageFile(null);
      setPdfFile(null);
      setShouldDeleteImage(false);
      setShouldDeletePdf(false);
      setIsEditingMain(false);
      
      // Fetch data lagi untuk update preview dengan URL yang benar
      await fetchData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Gagal menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMisi = async () => {
    if (!misiTitle.trim() || !misiDescription.trim()) {
      toast.error("Judul dan deskripsi misi tidak boleh kosong");
      return;
    }

    try {
      if (editingMisi) {
        // Update existing
        const { error } = await supabase
          .from("misi_items")
          .update({
            title: misiTitle.trim(),
            description: misiDescription.trim(),
          })
          .eq("id", editingMisi.id);

        if (error) throw error;
        toast.success("Misi berhasil diupdate");
      } else {
        // Create new
        const maxOrder = misiList.length > 0 
          ? Math.max(...misiList.map(m => m.order_number))
          : 0;

        const { error } = await supabase
          .from("misi_items")
          .insert([{
            order_number: maxOrder + 1,
            title: misiTitle.trim(),
            description: misiDescription.trim(),
          }]);

        if (error) throw error;
        toast.success("Misi berhasil ditambahkan");
      }

      setShowAddMisi(false);
      setEditingMisi(null);
      setMisiTitle("");
      setMisiDescription("");
      fetchData();
    } catch (error) {
      console.error("Error saving misi:", error);
      toast.error("Gagal menyimpan misi");
    }
  };

  const handleDeleteMisi = (id: string, title: string) => {
    setShowDeleteConfirm({ id, title });
  };

  const confirmDeleteMisi = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      const { error } = await supabase
        .from("misi_items")
        .delete()
        .eq("id", showDeleteConfirm.id);

      if (error) throw error;
      toast.success("Misi berhasil dihapus");
      setShowDeleteConfirm(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting misi:", error);
      toast.error("Gagal menghapus misi");
    }
  };

  const handleEditMisi = (misi: MisiItem) => {
    setEditingMisi(misi);
    setMisiTitle(misi.title);
    setMisiDescription(misi.description);
    setShowAddMisi(true);
  };

  return (
    <main className="min-h-screen">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Manage Profile
            </h1>
            <p className="text-gray-600 mt-1">
              Kelola informasi profil perusahaan, visi, dan misi
            </p>
          </div>
        </div>

        {/* SECTION 1: HERO & MAIN INFO */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Gambar & Visi</h2>
            {!isEditingMain && (
              <button
                onClick={handleEditMain}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <FiEdit2 />
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Hero Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gambar 
              </label>
              {heroImagePreview && !shouldDeleteImage ? (
                <div className="mb-3 relative group">
                  <img
                    src={heroImagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {isEditingMain && (
                    <button
                      onClick={handleDeleteImage}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition opacity-0 group-hover:opacity-100"
                      title="Hapus gambar"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ) : shouldDeleteImage ? (
                <div className="mb-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  Gambar akan dihapus saat menyimpan
                </div>
              ) : (
                <div className="mb-3 p-4 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 text-sm text-center">
                  Tidak ada gambar
                </div>
              )}
              {isEditingMain && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimal 5MB
                  </p>
                </>
              )}
            </div>

            {/* Hero Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul *
              </label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                disabled={!isEditingMain}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Profil Perusahaan"
              />
            </div>

            {/* Hero Subtitle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtitle
              </label>
              <textarea
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                disabled={!isEditingMain}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Komitmen kami dalam..."
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Perusahaan
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!isEditingMain}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="CV Akas Brother Consultant"
              />
            </div>

            {/* PDF Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Surat Perizinan (PDF)
              </label>
              {data?.pdf_url && !shouldDeletePdf ? (
                <div className="mb-3 relative group">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <FiDownload className="text-green-600" />
                    <span className="text-sm text-gray-700 flex-1">
                      {data.pdf_filename || "surat-perizinan.pdf"}
                    </span>
                    <a
                      href={data.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:underline"
                    >
                      Lihat
                    </a>
                    {isEditingMain && (
                      <button
                        onClick={handleDeletePdf}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus PDF"
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
              ) : shouldDeletePdf ? (
                <div className="mb-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  PDF akan dihapus saat menyimpan
                </div>
              ) : (
                <div className="mb-3 p-4 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 text-sm text-center">
                  Tidak ada PDF
                </div>
              )}
              {isEditingMain && (
                <>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format PDF, maksimal 10MB
                  </p>
                </>
              )}
            </div>

            {/* Visi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visi Perusahaan *
              </label>
              <textarea
                value={visiText}
                onChange={(e) => setVisiText(e.target.value)}
                disabled={!isEditingMain}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Menjadi mitra konsultan teknik..."
              />
            </div>
          </div>

          {/* Save/Cancel Buttons */}
          {isEditingMain && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveMain}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                <FiSave />
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2: MISI */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Misi Perusahaan</h2>
            <button
              onClick={() => {
                setEditingMisi(null);
                setMisiTitle("");
                setMisiDescription("");
                setShowAddMisi(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FiUpload />
              Tambah Misi
            </button>
          </div>

          <div className="space-y-3">
            {misiList.map((misi) => (
              <div
                key={misi.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {misi.order_number}. {misi.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{misi.description}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditMisi(misi)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDeleteMisi(misi.id, misi.title)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hapus"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {misiList.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Belum ada misi. Klik "Tambah Misi" untuk menambahkan.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL ADD/EDIT MISI */}
      {showAddMisi && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddMisi(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingMisi ? "Edit Misi" : "Tambah Misi"}
              </h3>
              <button
                onClick={() => setShowAddMisi(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <FiX />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Judul Misi *
                </label>
                <input
                  type="text"
                  value={misiTitle}
                  onChange={(e) => setMisiTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Keunggulan Perencanaan & Desain"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi *
                </label>
                <textarea
                  value={misiDescription}
                  onChange={(e) => setMisiDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Menghasilkan rancangan yang presisi..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddMisi(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveMisi}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm border-2 border-red-300 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Misi</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus misi "<span className="font-semibold">{showDeleteConfirm.title}</span>"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteMisi}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}