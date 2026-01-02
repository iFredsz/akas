"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { HiDotsVertical, HiShare, HiTrash, HiPencil, HiLink, HiExternalLink } from "react-icons/hi";
import { toast } from "react-toastify";

type MediaItem = {
  id: string;
  image_path: string;
  description: string;
  user_id: string;
  created_at: string;
};

// Skeleton Component untuk loading state
const MediaSkeleton = () => (
  <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-md animate-pulse">
    <div className="relative h-52 bg-gray-200"></div>
    <div className="p-4">
      <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </div>
  </div>
);

export default function MediaPage() {
  const supabase = createClient();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<MediaItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<MediaItem | null>(null);
  const [showEditModal, setShowEditModal] = useState<MediaItem | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const menuRef = useRef<HTMLDivElement>(null);

  // =========================
  // AUTH & DATA INITIALIZATION
  // =========================
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!mounted) return;

      try {
        // Parallel fetch - auth dan media dimuat bersamaan untuk performa maksimal
        const [sessionResult, mediaResult] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from("media_dokumentasi")
            .select("*")
            .order("created_at", { ascending: false })
        ]);

        // Set media data segera tanpa menunggu auth
        if (mounted) {
          setMedia(mediaResult.data || []);
          setIsInitialLoad(false);
        }

        // Set user & role
        const user = sessionResult.data.session?.user;
        if (user && mounted) {
          setUserId(user.id);

          // Get user role
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

          if (mounted) {
            setRole(userData?.role ?? null);
          }
        }
      } catch (error) {
        console.error("Error initializing:", error);
        if (mounted) setIsInitialLoad(false);
      }
    };

    init();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log("Auth state changed:", event, session?.user?.id);
        
        if (session?.user) {
          setUserId(session.user.id);
          
          // Get user role
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single();

          setRole(userData?.role ?? null);
        } else {
          setUserId(null);
          setRole(null);
        }
        
        // Close any open modals/menus when auth state changes
        setOpenMenu(null);
        setShowShareModal(null);
        setShowDeleteConfirm(null);
        setShowEditModal(null);
      }
    );

    // Realtime subscription for media changes
    const channel: RealtimeChannel = supabase
      .channel("media-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "media_dokumentasi" },
        (payload) => {
          if (!mounted) return;
          setMedia((prev) => {
            const exists = prev.some((i) => i.id === payload.new.id);
            if (exists) return prev;
            return [payload.new as MediaItem, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "media_dokumentasi" },
        (payload) => {
          if (!mounted) return;
          setMedia((prev) =>
            prev.map((item) =>
              item.id === payload.new.id ? (payload.new as MediaItem) : item
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "media_dokumentasi" },
        (payload) => {
          if (!mounted) return;
          setMedia((prev) =>
            prev.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

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
      return path.split("/media/")[1];
    }
    if (path.startsWith("media/")) {
      return path.replace("media/", "");
    }
    return path;
  };

  const canDelete = (item: MediaItem) => {
    if (!userId) return false;

    // admin & super_admin bisa hapus semua
    if (role === "admin" || role === "super_admin") return true;

    // user biasa hanya bisa hapus miliknya sendiri
    return item.user_id === userId;
  };

  const canEdit = (item: MediaItem) => {
    if (!userId) return false;

    // admin & super_admin bisa edit semua
    if (role === "admin" || role === "super_admin") return true;

    // user biasa hanya bisa edit miliknya sendiri
    return item.user_id === userId;
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    try {
      const { error } = await supabase
        .from("media_dokumentasi")
        .update({ description: editDescription.trim() })
        .eq("id", showEditModal.id);

      if (error) throw error;

      toast.success("Media berhasil diupdate");
      setShowEditModal(null);
    } catch (error) {
      console.error("Error updating media:", error);
      toast.error("Gagal update media");
    }
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

    try {
      const cleanPath = normalizePath(item.image_path);
      const folder = cleanPath.split("/")[0];
      const filename = cleanPath.split("/")[1];

      // List files in folder
      const { data: files } = await supabase.storage
        .from("media")
        .list(folder);

      const target = files?.find((f) => f.name === filename);
      
      if (target) {
        // Delete file from storage
        const { error: storageError } = await supabase.storage
          .from("media")
          .remove([`${folder}/${target.name}`]);

        if (storageError) throw storageError;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("media_dokumentasi")
        .delete()
        .eq("id", item.id);

      if (dbError) throw dbError;

      toast.success("Media berhasil dihapus");
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error("Gagal menghapus media");
    }
  };

  // =========================
  // SHARE
  // =========================
  const openShareModal = (item: MediaItem) => {
    setShowShareModal(item);
    setOpenMenu(null);
  };

  const copyLink = async (item: MediaItem) => {
    const url = getImageUrl(item.image_path);
    await navigator.clipboard.writeText(url);
    toast.success("Link berhasil disalin!");
    setShowShareModal(null);
  };

  const shareVia = async (item: MediaItem) => {
    const url = getImageUrl(item.image_path);

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: "Media Dokumentasi",
          text: item.description,
          url,
        });
        setShowShareModal(null);
      } catch {
        // User cancelled, no action needed
      }
    } else {
      toast.error("Browser tidak mendukung fitur share");
    }
  };

  // =========================
  // RENDER
  // =========================
  return (
    <main className="min-h-screen bg-linear-to-br from-green-50 via-white to-emerald-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14 border-2 border-[#A6FF00] rounded-xl p-6 bg-white/80 backdrop-blur-sm shadow-lg">
          <h1 className="text-3xl font-bold text-gray-900">
            Media
          </h1>
          <p className="text-gray-600 mt-1">
            Dokumentasi kegiatan maupun proyek kami
          </p>
        </div>

        {/* Skeleton Loading hanya pada initial load */}
        {isInitialLoad ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <MediaSkeleton key={i} />
            ))}
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum ada media</h3>
            <p className="text-gray-600">
              Belum ada dokumentasi media yang tersedia
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {currentMedia.map((item) => {
                const userCanDelete = canDelete(item);
                const userCanEdit = canEdit(item);
                const showActions = userCanDelete || userCanEdit;
                
                return (
                  <div
                    key={item.id}
                    className="relative border-2 border-[#A6FF00]/30 rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl hover:border-[#A6FF00] transition-all duration-300 group"
                  >
                    {/* ⋮ MENU - hanya muncul jika user login dan memiliki akses */}
                    {userId && showActions && (
                      <div className="absolute top-2 right-2 z-10" ref={openMenu === item.id ? menuRef : null}>
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === item.id ? null : item.id)
                          }
                          className="p-1 hover:scale-110 transition-transform bg-[#A6FF00]/90 rounded-lg backdrop-blur-sm"
                          aria-label="Menu"
                        >
                          <HiDotsVertical 
                            className="w-6 h-6 text-gray-900" 
                          />
                        </button>

                        {openMenu === item.id && (
                          <div className="absolute right-0 mt-2 w-36 bg-white border-2 border-[#A6FF00] rounded-lg shadow-xl z-20">
                            <button
                              onClick={() => openShareModal(item)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-[#A6FF00]/20 w-full rounded-t-lg transition-colors"
                            >
                              <HiShare className="w-4 h-4" />
                              Bagikan
                            </button>

                            {userCanEdit && (
                              <button
                                onClick={() => openEditModal(item)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-[#A6FF00]/20 w-full transition-colors"
                              >
                                <HiPencil className="w-4 h-4" />
                                Edit
                              </button>
                            )}

                            {userCanDelete && (
                              <button
                                onClick={() => confirmDelete(item)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full rounded-b-lg transition-colors"
                              >
                                <HiTrash className="w-4 h-4" />
                                Hapus
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Jika user tidak login atau tidak punya akses, tampilkan hanya tombol share */}
                    {userId && !showActions && (
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={() => openShareModal(item)}
                          className="p-1 hover:scale-110 transition-transform bg-[#A6FF00]/90 rounded-lg backdrop-blur-sm"
                          aria-label="Bagikan"
                          title="Bagikan"
                        >
                          <HiShare className="w-6 h-6 text-gray-900" />
                        </button>
                      </div>
                    )}

                    {/* Jika user tidak login, tombol share muncul saat hover */}
                    {!userId && (
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={() => openShareModal(item)}
                          className="p-1 hover:scale-110 transition-transform bg-[#A6FF00]/90 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Bagikan"
                          title="Bagikan"
                        >
                          <HiShare className="w-6 h-6 text-gray-900" />
                        </button>
                      </div>
                    )}

                    {/* IMAGE */}
                    <div className="relative h-52">
                      <Image
                        src={getImageUrl(item.image_path)}
                        alt={item.description}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>

                    {/* CONTENT */}
                    <div className="p-4 text-gray-900">
                      <p className="text-xs text-gray-500 mb-1">
                        {formatDate(item.created_at)}
                      </p>
                      <p className="text-sm">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAGINATION */}
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

      {/* EDIT MODAL */}
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

      {/* SHARE MODAL */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowShareModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm border-2 border-[#A6FF00] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Bagikan Media</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => copyLink(showShareModal)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-900 hover:bg-[#A6FF00]/20 rounded-lg transition-colors border border-[#A6FF00]/30"
              >
                <HiLink className="w-5 h-5 text-[#A6FF00]" />
                <span>Salin Tautan</span>
              </button>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={() => shareVia(showShareModal)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-900 hover:bg-[#A6FF00]/20 rounded-lg transition-colors border border-[#A6FF00]/30"
                >
                  <HiExternalLink className="w-5 h-5 text-[#A6FF00]" />
                  <span>Bagikan via...</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowShareModal(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
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