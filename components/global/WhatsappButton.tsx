"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { HiPlus, HiArrowUp, HiX } from "react-icons/hi";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import contactUsIcon from "@/public/contactus.svg";

export default function FloatingButtons() {
  const supabase = createClient();
  const pathname = usePathname();

  const [isLogin, setIsLogin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const showPostButton = pathname === "/media" && isLogin;

  // ==========================
  // HANDLE SCROLL EVENT
  // ==========================
  const handleScroll = useCallback(() => {
    // Tampilkan tombol naik ke atas ketika scroll lebih dari 300px
    if (window.scrollY > 300) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  }, []);

  useEffect(() => {
    // Tambah event listener scroll
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Cek posisi scroll awal
    handleScroll();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // ==========================
  // AUTH LISTENER (REALTIME)
  // ==========================
  useEffect(() => {
    // cek session awal
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setIsLogin(true);
        setUserId(data.session.user.id);
      } else {
        setIsLogin(false);
        setUserId(null);
      }
    });

    // listen perubahan login / logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLogin(true);
        setUserId(session.user.id);
      } else {
        setIsLogin(false);
        setUserId(null);
        setShowModal(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // ==========================
  // Handle File Change & Preview
  // ==========================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      return;
    }

    // Validasi tipe file
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    // Validasi ukuran file (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    setFile(selectedFile);
    
    // Buat preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  // ==========================
  // UPLOAD HANDLER - DIPERBAIKI
  // ==========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !userId) {
      toast.error("Pilih file dan pastikan Anda login");
      return;
    }

    if (!description.trim()) {
      toast.error("Deskripsi tidak boleh kosong");
      return;
    }

    setLoading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

      // 1. Upload ke storage
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Ambil full_name dari tabel users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        // Rollback: hapus file yang sudah diupload
        await supabase.storage.from("media").remove([fileName]);
        throw new Error("Gagal mendapatkan nama pengguna");
      }

      const uploader_name = userData.full_name;

      // 3. Insert ke database
      const { error: dbError } = await supabase
        .from("media_dokumentasi")
        .insert({
          image_path: fileName,
          description: description.trim(),
          user_id: userId,
          uploader_name,
        });

      if (dbError) {
        // Rollback: hapus file yang sudah diupload
        await supabase.storage.from("media").remove([fileName]);
        throw dbError;
      }

      // Success
      toast.success("Media berhasil diupload");
      
      // Reset form
      setShowModal(false);
      setFile(null);
      setFilePreview(null);
      setDescription("");
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Terjadi kesalahan saat mengupload");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset modal
  const resetModal = () => {
    setShowModal(false);
    setFile(null);
    setFilePreview(null);
    setDescription("");
  };

  // ==========================
  // Render UI Floating Buttons
  // ==========================
  return (
    <>
      {/* FLOATING BUTTONS - LAYOUT BARU */}
      <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
        {/* Scroll to Top Button - Kiri - Muncul saat scroll ke bawah */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              onClick={handleScrollTop}
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 20 }}
              whileHover={{ scale: 1.1 }}
              className="bg-[#A6FF00] text-gray-900 p-3 rounded-full shadow-lg hover:shadow-xl transition-all"
              title="Naik ke atas"
            >
              <HiArrowUp className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Container Kanan: Upload Button + WhatsApp */}
        <div className="flex flex-col items-center gap-3">
          {/* Upload Button - Hanya di halaman /media dan saat login */}
          <AnimatePresence>
            {showPostButton && (
              <motion.button
                onClick={() => setShowModal(true)}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                className="bg-[#A6FF00] text-gray-900 p-4 rounded-full shadow-lg hover:shadow-xl transition-all"
                title="Tambah Media"
              >
                <HiPlus className="w-6 h-6" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* WhatsApp Button - Selalu Tampil */}
          <motion.a
            href="https://wa.me/628814153292"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            className="w-16 h-16 relative"
          >
            <Image
              src={contactUsIcon}
              alt="Hubungi Kami via WhatsApp"
              className="w-full h-full object-contain"
              priority
            />
          </motion.a>
        </div>
      </div>

      {/* MODAL UPLOAD - UI KONSISTEN */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => !loading && resetModal()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-[#A6FF00] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Upload Media Baru</h2>
              <button
                onClick={resetModal}
                disabled={loading}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Pilih Gambar
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 border-2 border-[#A6FF00]/30 rounded-lg focus:border-[#A6FF00] focus:outline-none bg-white text-gray-900"
                />
                {file && (
                  <p className="text-sm text-gray-600 mt-1">
                    File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Preview Gambar */}
              {filePreview && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Preview Gambar
                  </label>
                  <div className="relative h-48 w-full rounded-lg overflow-hidden border-2 border-[#A6FF00]/30">
                    <Image
                      src={filePreview}
                      alt="Preview"
                      fill
                      className="object-contain"
                      unoptimized
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
                  placeholder="Tulis deskripsi media..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  rows={3}
                  required
                  className="w-full px-3 py-2 border-2 border-[#A6FF00]/30 rounded-lg focus:border-[#A6FF00] focus:outline-none resize-none bg-white text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetModal}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !file || !description.trim()}
                  className="flex-1 px-4 py-2 bg-[#A6FF00] hover:bg-[#95E600] text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                      Mengupload...
                    </>
                  ) : (
                    <>
                      Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}