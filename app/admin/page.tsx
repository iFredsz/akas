"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { HiEye, HiEyeOff, HiShieldCheck } from "react-icons/hi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface User {
  id: string;
  email: string | null;
  role: string | null;
  full_name: string | null;
  position: string | null;
  birth_date: string | null;
  address: string | null;
}

export default function AdminPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [users, setUsers] = useState<User[]>([]);
  const [adminName, setAdminName] = useState<string>("Admin");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // pagination
  const perPage = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPageRef = useRef<number>(currentPage);

  // search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchRef = useRef<string>(searchQuery);
  const searchDebounceRef = useRef<number | null>(null);

  // Form tambah karyawan
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<User>>({});

  // Loading state
  const [addingUser, setAddingUser] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<User | null>(null);
  
  // Role change confirmation modal
  const [showRoleChangeConfirm, setShowRoleChangeConfirm] = useState<{
    user: User;
    newRole: string;
  } | null>(null);

  const isSuperAdmin = currentUserRole === 'super_admin';

  // Fetch users
  const fetchUsers = useCallback(
    async (page = 1, query = "") => {
      try {
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        let builder = supabase
          .from("users")
          .select("*", { count: "exact" })
          .order("full_name", { ascending: true })
          .range(from, to);

        if (query.trim()) {
          const q = query.trim();
          builder = builder.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,position.ilike.%${q}%`);
        }

        const res = await builder;

        if (res.error) {
          console.error("fetchUsers error:", res.error);
          toast.error("Gagal memuat data pengguna");
          setUsers([]);
          setTotal(0);
          return;
        }
        
        setUsers(res.data || []);
        setTotal(res.count ?? 0);

        const newTotalPages = Math.max(1, Math.ceil((res.count ?? 0) / perPage));
        if (currentPageRef.current > newTotalPages) {
          setCurrentPage(newTotalPages);
          currentPageRef.current = newTotalPages;
        }
      } catch (err) {
        console.error("fetchUsers error:", err);
        toast.error("Terjadi kesalahan saat memuat data");
        setUsers([]);
        setTotal(0);
      }
    },
    [supabase]
  );

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        if (userData) {
          setAdminName(userData.full_name || "Admin");
          setCurrentUserRole(userData.role);
        }
      }
    } catch (err) {
      console.error("fetchCurrentUser error:", err);
    }
  }, [supabase]);

  // Update refs
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    searchRef.current = searchQuery;
  }, [searchQuery]);

  // Initial fetch
  useEffect(() => {
    fetchCurrentUser();
    fetchUsers(currentPageRef.current, searchRef.current);
  }, [fetchCurrentUser, fetchUsers]);

  // Realtime setup - dengan update nama admin
  useEffect(() => {
    const channel = supabase
      .channel('users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => {
          // Refresh data when any change happens
          fetchUsers(currentPageRef.current, searchRef.current);
          // Update nama admin juga
          fetchCurrentUser();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchUsers, fetchCurrentUser]);

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    setCurrentPage(1);
    currentPageRef.current = 1;

    searchDebounceRef.current = window.setTimeout(() => {
      fetchUsers(1, searchQuery);
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, fetchUsers]);

  // Tambah karyawan
  const addKaryawan = async () => {
    if (!newEmail || !newPassword || !newFullName) {
      toast.error("Isi semua field wajib!");
      return;
    }

    setAddingUser(true);
    try {
      const res = await fetch("/api/admin/add-karyawan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newFullName,
          position: newPosition,
          birth_date: newBirthDate,
          address: newAddress,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Gagal menambah karyawan");
        return;
      }
      
      toast.success("Berhasil menambah karyawan!");
      resetForm();
      
    } catch (err) {
      console.error("addKaryawan error:", err);
      toast.error("Terjadi kesalahan");
    } finally {
      setAddingUser(false);
    }
  };

  const resetForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewFullName("");
    setNewPosition("");
    setNewBirthDate("");
    setNewAddress("");
    setShowPassword(false);
  };

  // Open delete confirmation modal
  const confirmDelete = (user: User) => {
    // Cek jika user mencoba menghapus dirinya sendiri
    if (user.id === currentUserId) {
      toast.error("Anda tidak dapat menghapus akun Anda sendiri");
      return;
    }

    // Cek jika user yang akan dihapus adalah admin atau super admin
    if (user.role === 'admin' || user.role === 'super_admin') {
      toast.error("Tidak dapat menghapus user dengan role Admin/Super Admin. Hubungi Super Admin untuk mengubah role terlebih dahulu.");
      return;
    }

    setShowDeleteConfirm(user);
  };

  // Hapus user
  const deleteUser = async (user: User) => {
    if (!user.email) {
      toast.error("User tidak punya email");
      return;
    }

    setShowDeleteConfirm(null);
    setDeletingId(user.id);

    try {
      const res = await fetch("/api/admin/delete-karyawan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, email: user.email }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus");
        return;
      }
      
      toast.success(`User berhasil dihapus!`);
      
    } catch (err) {
      console.error("deleteUser error:", err);
      toast.error("Terjadi kesalahan");
    } finally {
      setDeletingId(null);
    }
  };

  // Edit user
  const saveEdit = async (id: string) => {
    if (!editData.full_name?.trim()) {
      toast.error("Nama lengkap harus diisi");
      return;
    }

    // Validasi: hanya super admin yang bisa mengubah role
    const targetUser = users.find(u => u.id === id);
    if (targetUser && editData.role && editData.role !== targetUser.role) {
      if (!isSuperAdmin) {
        toast.error("🔒 Hanya Super Admin yang dapat mengubah role user");
        return;
      }

      // Tampilkan modal konfirmasi ubah role
      setShowRoleChangeConfirm({
        user: targetUser,
        newRole: editData.role
      });
      return;
    }

    await proceedSaveEdit(id);
  };

  // Fungsi untuk melanjutkan save edit setelah konfirmasi role change
  const proceedWithRoleChange = async () => {
    if (!showRoleChangeConfirm) return;
    
    const { user, newRole } = showRoleChangeConfirm;
    setShowRoleChangeConfirm(null);
    setSavingEditId(user.id);
    
    try {
      const res = await fetch("/api/admin/edit-karyawan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: user.id, 
          role: newRole,
          full_name: editData.full_name || user.full_name,
          position: editData.position || user.position
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan perubahan role");
        return;
      }
      
      toast.success("Perubahan role disimpan!");
      setEditId(null);
      setEditData({});
      
    } catch (err) {
      console.error("saveEdit error:", err);
      toast.error("Terjadi kesalahan");
    } finally {
      setSavingEditId(null);
    }
  };

  // Fungsi untuk melanjutkan save edit tanpa perubahan role
  const proceedSaveEdit = async (id: string) => {
    setSavingEditId(id);
    try {
      const res = await fetch("/api/admin/edit-karyawan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editData }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan");
        return;
      }
      
      toast.success(" Perubahan disimpan!");
      setEditId(null);
      setEditData({});
      
    } catch (err) {
      console.error("saveEdit error:", err);
      toast.error("Terjadi kesalahan");
    } finally {
      setSavingEditId(null);
    }
  };

  // Pagination
  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
    currentPageRef.current = p;
    fetchUsers(p, searchRef.current);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPageNumbers = () => {
    const maxButtons = 7;
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const left = Math.max(1, currentPage - 2);
      const right = Math.min(totalPages, currentPage + 2);
      
      if (left > 1) {
        pages.push(1);
        if (left > 2) pages.push("...");
      }
      
      for (let i = left; i <= right; i++) pages.push(i);
      
      if (right < totalPages) {
        if (right < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
    }
    
    return pages.map((p, idx) =>
      typeof p === "number" ? (
        <button
          key={p}
          onClick={() => goToPage(p)}
          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
            currentPage === p
              ? "bg-[#A6FF00] text-gray-900 border-2 border-[#A6FF00]"
              : "bg-white border-2 border-[#A6FF00]/30 text-gray-900 hover:bg-[#A6FF00]/20"
          }`}
        >
          {p}
        </button>
      ) : (
        <div key={`dots-${idx}`} className="w-10 h-10 flex items-center justify-center text-gray-500">
          {p}
        </div>
      )
    );
  };

  const showPagination = total >= perPage;

  // Helper function untuk mendapatkan badge role
  const getRoleBadge = (role: string | null) => {
    switch(role) {
      case 'super_admin':
        return (
          <span className="px-2 py-1 rounded text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold flex items-center gap-1 w-fit">
            <HiShieldCheck className="w-3 h-3" />
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 font-medium">
            Admin
          </span>
        );
      case 'karyawan':
        return (
          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
            Karyawan
          </span>
        );
      default:
        return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">-</span>;
    }
  };

  // Helper function untuk mendapatkan nama role lengkap
  const getRoleName = (role: string) => {
    switch(role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'karyawan': return 'Karyawan';
      default: return role;
    }
  };

  // Gunakan useEffect untuk memastikan ToastContainer hanya dirender di client
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="bg-white min-h-screen text-gray-900 text-sm">
      {isClient && (
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      )}
      
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-3xl font-bold">Selamat datang, {adminName}</h1>
        {currentUserRole === 'super_admin' && (
          <span className="px-3 py-1 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold flex items-center gap-1.5 shadow-md">
            <HiShieldCheck className="w-4 h-4" />
            Super Admin
          </span>
        )}
        {currentUserRole === 'admin' && (
          <span className="px-3 py-1 rounded-lg text-sm bg-purple-100 text-purple-800 font-semibold flex items-center gap-1.5 border-2 border-purple-200">
            Admin
          </span>
        )}
      </div>

      {/* Form tambah */}
      <div className="mb-4 p-3 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Tambah User</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Full Name *"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="email"
            placeholder="Email *"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="border p-2 rounded"
          />
          
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password *"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border p-2 rounded pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
            >
              {showPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Position"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="date"
            value={newBirthDate}
            onChange={(e) => setNewBirthDate(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="border p-2 rounded"
          />
          
          <button
            onClick={addKaryawan}
            disabled={addingUser}
            className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {addingUser ? "Menambah..." : "Tambah"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Cari nama, email, posisi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <button
          onClick={() => setSearchQuery("")}
          className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 border">Nama</th>
              <th className="px-2 py-1 border">Email</th>
              <th className="px-2 py-1 border">Role</th>
              <th className="px-2 py-1 border">Posisi</th>
              <th className="px-2 py-1 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-600">
                  {searchQuery ? "Tidak ditemukan" : "Tidak ada data"}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  {editId === user.id ? (
                    <>
                      <td className="px-2 py-1 border">
                        <input
                          value={editData.full_name || ""}
                          onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="px-2 py-1 border">{user.email}</td>
                      <td className="px-2 py-1 border">
                        <select
                          value={editData.role || user.role || ""}
                          onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                          className="border p-1 rounded w-full"
                          disabled={!isSuperAdmin}
                          title={!isSuperAdmin ? "Hanya Super Admin yang dapat mengubah role" : ""}
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Admin</option>
                          <option value="karyawan">Karyawan</option>
                        </select>
                        {!isSuperAdmin && (
                          <p className="text-xs text-red-600 mt-1">🔒 Hanya Super Admin</p>
                        )}
                      </td>
                      <td className="px-2 py-1 border">
                        <input
                          value={editData.position || ""}
                          onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="px-2 py-1 border flex gap-1">
                        <button
                          onClick={() => saveEdit(user.id)}
                          disabled={savingEditId === user.id}
                          className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingEditId === user.id ? "..." : "Simpan"}
                        </button>
                        <button
                          onClick={() => {
                            setEditId(null);
                            setEditData({});
                          }}
                          className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                        >
                          Batal
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1 border">{user.full_name}</td>
                      <td className="px-2 py-1 border">{user.email}</td>
                      <td className="px-2 py-1 border">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-2 py-1 border">{user.position}</td>
                      <td className="px-2 py-1 border flex gap-1">
                        <button
                          onClick={() => {
                            setEditId(user.id);
                            setEditData(user);
                          }}
                          className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => confirmDelete(user)}
                          disabled={
                            deletingId === user.id || 
                            user.id === currentUserId || 
                            user.role === 'admin' || 
                            user.role === 'super_admin'
                          }
                          className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            user.id === currentUserId 
                              ? "Tidak dapat menghapus akun sendiri" 
                              : (user.role === 'admin' || user.role === 'super_admin')
                              ? "Hubungi Super Admin untuk mengubah role terlebih dahulu"
                              : "Hapus user"
                          }
                        >
                          {deletingId === user.id ? "..." : "Hapus"}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-white border border-[#A6FF00] hover:bg-[#A6FF00]/20 disabled:opacity-50"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-white border border-[#A6FF00] hover:bg-[#A6FF00]/20 disabled:opacity-50"
            >
              Next ›
            </button>
          </div>

          <div className="flex gap-2">{renderPageNumbers()}</div>

          <div className="text-sm text-gray-600">
            Halaman {currentPage} dari {totalPages} • Total {total} user
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus User</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus user <strong>{showDeleteConfirm.full_name || showDeleteConfirm.email}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => deleteUser(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      {showRoleChangeConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowRoleChangeConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm border-2 border-orange-300 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <HiShieldCheck className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Konfirmasi Perubahan Role</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Anda akan mengubah role user:
            </p>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">User:</span>
                <span className="font-semibold">{showRoleChangeConfirm.user.full_name || showRoleChangeConfirm.user.email}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Role saat ini:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  showRoleChangeConfirm.user.role === 'super_admin' 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : showRoleChangeConfirm.user.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {getRoleName(showRoleChangeConfirm.user.role || '')}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Role baru:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  showRoleChangeConfirm.newRole === 'super_admin' 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : showRoleChangeConfirm.newRole === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {getRoleName(showRoleChangeConfirm.newRole)}
                </span>
              </div>
            </div>

            <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg mb-6">
              ⚠️ Perubahan role akan mempengaruhi akses dan hak akses user di sistem.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRoleChangeConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={proceedWithRoleChange}
                disabled={savingEditId === showRoleChangeConfirm.user.id}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingEditId === showRoleChangeConfirm.user.id ? "Menyimpan..." : "Ya, Ubah Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}