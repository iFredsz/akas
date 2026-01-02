"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { HiDotsVertical, HiTrash, HiPencil, HiUpload, HiX, HiEye } from "react-icons/hi";
import { toast } from "react-toastify";

type MediaItem = {
  id: string;
  image_path: string;
  description: string;
  user_id: string;
  created_at: string;
  uploader_name?: string;
};

export default function KaryawanMediaDashboard() {
  const supabase = createClient();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<MediaItem | null>(null);
  const [showEditModal, setShowEditModal] = useState<MediaItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState<{ url: string; description: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editDescription, setEditDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFilePreview, setUploadFilePreview] = useState<string | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const itemsPerPage = 9;
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =========================
  // INIT + REALTIME
  // =========================
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (data.user) {
        setUserId(data.user.id);

        // Karyawan hanya melihat media milik sendiri
        const { data: mediaData } = await supabase
          .from("media_dokumentasi")
          .select("*")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false });

        if (mounted) {
          setMedia(mediaData || []);
          setIsLoading(false);
        }
      } else {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    const channel = supabase
      .channel("karyawan-media-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "media_dokumentasi" },
        (payload) => {
          const newItem = payload.new as MediaItem;
          if (newItem.user_id === userId) {
            setMedia((prev) => {
              const exists = prev.some((i) => i.id === newItem.id);
              if (exists) return prev;
              return [newItem, ...prev];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "media_dokumentasi" },
        (payload) => {
          const updatedItem = payload.new as MediaItem;
          if (updatedItem.user_id === userId) {
            setMedia((prev) =>
              prev.map((item) =>
                item.id === updatedItem.id ? updatedItem : item
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "media_dokumentasi" },
        (payload) => {
          setMedia((prev) =>
            prev.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  // =========================
  // CLOSE MENU ON OUTSIDE CLICK
  // =========================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    if (openMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu]);

  // =========================
  // HELPERS
  // =========================
  const getImageUrl = (path: string) =>
    supabase.storage.from("media").getPublicUrl(path).data.publicUrl;

  const normalizePath = (path: string) => {
    if (path.startsWith("http")) {
      const url = new URL(path);
      const pathname = url.pathname;
      const parts = pathname.split('/');
      const mediaIndex = parts.indexOf('media');
      if (mediaIndex !== -1) {
        return parts.slice(mediaIndex + 1).join('/');
      }
      return pathname.replace('/storage/v1/object/public/media/', '');
    }
    if (path.startsWith("media/")) {
      return path.replace("media/", "");
    }
    return path;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  // =========================
  // PAGINATION
  // =========================
  const totalPages = Math.ceil(media.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMedia = media.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========================
  // UPLOAD LOGIC
  // =========================
  const openUploadModal = () => {
    setShowUploadModal(true);
    setUploadFile(null);
    setUploadFilePreview(null);
    setUploadDescription("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }
      
      setUploadFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadFilePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !userId) {
      toast.error("Pilih file dan pastikan Anda login");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

      // 1. Upload ke storage
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      // 2. Ambil full_name dari tabel users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        // Hapus file yang sudah diupload jika gagal
        await supabase.storage.from("media").remove([fileName]);
        throw new Error("Gagal mendapatkan nama pengguna");
      }

      const uploader_name = userData.full_name;

      // 3. Insert ke database
      const { error: dbError } = await supabase
        .from("media_dokumentasi")
        .insert({
          image_path: fileName,
          description: uploadDescription.trim(),
          user_id: userId,
          uploader_name: uploader_name,
        });

      if (dbError) {
        // Hapus file yang sudah diupload jika gagal
        await supabase.storage.from("media").remove([fileName]);
        throw dbError;
      }

      // Reset form
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadFilePreview(null);
      setUploadDescription("");
      toast.success("Media berhasil diupload");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Terjadi kesalahan saat mengupload");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // =========================
  // EDIT
  // =========================
  const openEditModal = (item: MediaItem) => {
    setShowEditModal(item);
    setEditDescription(item.description);
    setOpenMenu(null);
  };

  const updateMedia = async () => {
    if (!showEditModal || !editDescription.trim()) {
      toast.error("Deskripsi tidak boleh kosong");
      return;
    }

    const { data, error } = await supabase
      .from("media_dokumentasi")
      .update({ description: editDescription.trim() })
      .eq("id", showEditModal.id)
      .select();

    if (error) {
      toast.error(`Gagal update: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      toast.error("Gagal update media");
      return;
    }

    setMedia((prev) =>
      prev.map((item) =>
        item.id === showEditModal.id
          ? { ...item, description: editDescription.trim() }
          : item
      )
    );

    toast.success("Media berhasil diupdate");
    setShowEditModal(null);
  };

  // =========================
  // DELETE
  // =========================
  const confirmDelete = (item: MediaItem) => {
    setShowDeleteConfirm(item);
    setOpenMenu(null);
  };

  const deleteMedia = async (item: MediaItem) => {
    setShowDeleteConfirm(null);

    const cleanPath = normalizePath(item.image_path);
    
    if (!cleanPath) {
      toast.error("Path file tidak valid");
      return;
    }

    try {
      // Hapus file dari storage
      const { error: storageError } = await supabase.storage
        .from("media")
        .remove([cleanPath]);

      if (storageError) {
        // Coba hapus dengan format berbeda jika gagal
        const altPath = cleanPath.startsWith('media/') ? cleanPath : `media/${cleanPath}`;
        const { error: altError } = await supabase.storage
          .from("media")
          .remove([altPath]);
          
        if (altError) {
          console.warn("File tidak ditemukan di storage, melanjutkan hapus dari database...");
        }
      }

      // Hapus dari database
      const { error: dbError } = await supabase
        .from("media_dokumentasi")
        .delete()
        .eq("id", item.id);

      if (dbError) throw dbError;

      toast.success("Media berhasil dihapus");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal menghapus: ${err.message}`);
      } else {
        toast.error("Gagal menghapus media");
      }
    }
  };

  // =========================
  // IMAGE PREVIEW
  // =========================
  const openImagePreview = (item: MediaItem) => {
    setShowImagePreview({
      url: getImageUrl(item.image_path),
      description: item.description
    });
  };

  // =========================
  // RENDER
  // =========================
  return (
    <main className="min-h-screen bg-white pb-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Media</h1>
            <p className="text-gray-600 mt-1">Kelola media dokumentasi Anda</p>
          </div>
          <button
            onClick={openUploadModal}
            className="flex items-center gap-2 px-6 py-3 bg-[#A6FF00] hover:bg-[#95E600] text-gray-900 rounded-lg font-medium transition-colors shadow-md"
          >
            <HiUpload className="w-5 h-5" />
            Upload Media
          </button>
        </div>

        {/* Statistik */}
        <div className="bg-white rounded-xl border-2 border-[#A6FF00] p-6 mb-6 shadow-md">
          <p className="text-gray-900">
            Total Media Anda: <span className="font-bold">{media.length}</span>
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#A6FF00]"></div>
            <p className="text-gray-600 mt-4">Memuat media...</p>
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum ada media</h3>
            <p className="text-gray-600 mb-6">
              Upload media pertama Anda untuk memulai dokumentasi
            </p>
            <button
              onClick={openUploadModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#A6FF00] hover:bg-[#95E600] text-gray-900 rounded-lg font-medium transition-colors"
            >
              <HiUpload className="w-5 h-5" />
              Upload Sekarang
            </button>
          </div>
        ) : (
          <>
            {/* Grid Media */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {currentMedia.map((item) => (
                <div
                  key={item.id}
                  className="relative border-2 border-[#A6FF00]/30 rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl hover:border-[#A6FF00] transition-all duration-300 group"
                >
                  {/* Menu */}
                  <div className="absolute top-2 right-2 z-10" ref={openMenu === item.id ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                      className="p-1 hover:scale-110 transition-transform bg-[#A6FF00]/90 rounded-lg backdrop-blur-sm"
                      aria-label="Menu"
                    >
                      <HiDotsVertical className="w-6 h-6 text-gray-900" />
                    </button>

                    {openMenu === item.id && (
                      <div className="absolute right-0 mt-2 w-36 bg-white border-2 border-[#A6FF00] rounded-lg shadow-xl z-20">
                        <button
                          onClick={() => openImagePreview(item)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-[#A6FF00]/20 w-full rounded-t-lg transition-colors"
                        >
                          <HiEye className="w-4 h-4" />
                          Preview
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-[#A6FF00]/20 w-full transition-colors"
                        >
                          <HiPencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => confirmDelete(item)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full rounded-b-lg transition-colors"
                        >
                          <HiTrash className="w-4 h-4" />
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Image dengan overlay preview */}
                  <div 
                    className="relative h-52 cursor-pointer"
                    onClick={() => openImagePreview(item)}
                  >
                    <Image
                      src={getImageUrl(item.image_path)}
                      alt={item.description}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <HiEye className="w-8 h-8 text-white/80" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 text-gray-900">
                    <p className="text-xs text-gray-500 mb-1">
                      {formatDate(item.created_at)}
                    </p>
                    <p className="text-sm line-clamp-2">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-white border-2 border-[#A6FF00] text-gray-900 hover:bg-[#A6FF00]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ Prev
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? "bg-[#A6FF00] text-gray-900 border-2 border-[#A6FF00]"
                          : "bg-white border-2 border-[#A6FF00]/30 text-gray-900 hover:bg-[#A6FF00]/20"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg bg-white border-2 border-[#A6FF00] text-gray-900 hover:bg-[#A6FF00]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => !isUploading && setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-[#A6FF00] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Upload Media Baru</h3>
              <button
                onClick={() => !isUploading && setShowUploadModal(false)}
                disabled={isUploading}
                className="text-gray-500 hover:text-gray-700"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitUpload} className="space-y-4">
              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Pilih Gambar
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  required
                  className="w-full px-3 py-2 border-2 border-[#A6FF00]/30 rounded-lg focus:border-[#A6FF00] focus:outline-none bg-white text-gray-900"
                />
                {uploadFile && (
                  <p className="text-sm text-gray-600 mt-1">File: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                )}
              </div>

              {/* Preview Gambar */}
              {uploadFilePreview && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Preview Gambar
                  </label>
                  <div className="relative h-48 w-full rounded-lg overflow-hidden border-2 border-[#A6FF00]/30">
                    <Image
                      src={uploadFilePreview}
                      alt="Preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Deskripsi
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                  required
                  className="w-full px-3 py-2 border-2 border-[#A6FF00]/30 rounded-lg focus:border-[#A6FF00] focus:outline-none resize-none bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="Tulis deskripsi media..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile || !uploadDescription.trim()}
                  className="flex-1 px-4 py-2 bg-[#A6FF00] hover:bg-[#95E600] text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Mengupload...
                    </span>
                  ) : (
                    "Upload"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowEditModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-[#A6FF00] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Deskripsi</h3>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border-2 border-[#A6FF00]/30 rounded-lg focus:border-[#A6FF00] focus:outline-none resize-none mb-4 bg-white text-gray-900 placeholder:text-gray-400"
              placeholder="Tulis deskripsi..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={updateMedia}
                className="flex-1 px-4 py-2 bg-[#A6FF00] hover:bg-[#95E600] text-gray-900 rounded-lg font-medium transition-colors"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImagePreview && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4"
          onClick={() => setShowImagePreview(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImagePreview(null)}
              className="absolute top-2 right-2 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
            >
              <HiX className="w-6 h-6" />
            </button>
            <div className="relative h-[70vh] w-full">
              <Image
                src={showImagePreview.url}
                alt={showImagePreview.description}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>
            {showImagePreview.description && (
              <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-white text-center">{showImagePreview.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm border-2 border-red-300 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Media</h3>
            <p className="text-gray-600 mb-6">Apakah Anda yakin ingin menghapus media ini?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => deleteMedia(showDeleteConfirm)}
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