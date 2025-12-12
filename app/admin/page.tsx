"use client";

import { useEffect, useState, ChangeEvent } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  DocumentData,
  QuerySnapshot,
  serverTimestamp,
  FieldValue,
} from "firebase/firestore";
import { auth, provider, signInWithPopup, signOut, db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { toast, Toaster } from "sonner";

interface Movie {
  id: string;
  title: string;
  image: string;
  minute: number;
  price: number;
  drive_url: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

interface MovieData {
  title: string;
  image: string;
  minute: number;
  price: number;
  drive_url: string;
  createdAt?: FieldValue;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [minute, setMinute] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [driveUrl, setDriveUrl] = useState("");

  const [isEdit, setIsEdit] = useState(false);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // cek auth & admin
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u?.email) {
        const q = query(collection(db, "admins"), where("email", "==", u.email));
        const snap: QuerySnapshot<DocumentData> = await getDocs(q);
        setIsAdmin(!snap.empty);
      } else {
        setIsAdmin(null);
      }
    });
    return () => unsub();
  }, []);

  // load movies
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "movies"), (snap) => {
      const data: Movie[] = snap.docs
        .map((d) => ({
          id: d.id,
          title: d.data().title,
          image: d.data().image,
          minute: d.data().minute,
          price: d.data().price,
          drive_url: d.data().drive_url,
          createdAt: d.data().createdAt || null,
        }))
        .sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.seconds - a.createdAt.seconds; // terbaru di atas
        });

      setMovies(data);
      setLoadingMovies(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      if (err instanceof Error) toast.error(`Login gagal: ${err.message}`);
      else toast.error("Login gagal: unknown error");
    }
  };

  const resetForm = () => {
    setId("");
    setTitle("");
    setImage("");
    setMinute("");
    setPrice("");
    setDriveUrl("");
    setIsEdit(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const movieData: MovieData = {
        title,
        image,
        minute: Number(minute),
        price: Number(price),
        drive_url: driveUrl,
      };

      if (!isEdit) movieData.createdAt = serverTimestamp(); // tambah createdAt otomatis

      if (isEdit) {
        await updateDoc(doc(db, "movies", id), {
          title: movieData.title,
          image: movieData.image,
          minute: movieData.minute,
          price: movieData.price,
          drive_url: movieData.drive_url,
        });
        toast.success("Film diperbarui!");
      } else {
        await addDoc(collection(db, "movies"), movieData);
        toast.success("Film ditambahkan!");
      }
      resetForm();
    } catch (err: unknown) {
      if (err instanceof Error) {
        if ((err as { code?: string }).code === "permission-denied") {
          toast.error("Gagal menyimpan: Akses ditolak!");
        } else {
          toast.error(`Gagal menyimpan: ${err.message}`);
        }
      } else {
        toast.error("Gagal menyimpan: unknown error");
      }
    }
  };

  const handleEdit = (m: Movie) => {
    setId(m.id);
    setTitle(m.title);
    setImage(m.image);
    setMinute(m.minute);
    setPrice(m.price);
    setDriveUrl(m.drive_url);
    setIsEdit(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus film ini?")) return;
    try {
      await deleteDoc(doc(db, "movies", id));
      toast.success("Film dihapus!");
    } catch (err: unknown) {
      if (err instanceof Error) toast.error(`Gagal menghapus: ${err.message}`);
      else toast.error("Gagal menghapus: unknown error");
    }
  };

  const filteredMovies = movies.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // === RENDER ===
  if (!user)
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Khusus Admin</h1>
        <button
          onClick={handleLogin}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
        >
          Login with Google
        </button>
        <Toaster />
      </div>
    );

  if (isAdmin === false)
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-gray-400 mb-4">Email kamu tidak terdaftar sebagai admin.</p>
        <button
          onClick={() => (window.location.href = "/")}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
        >
          Kembali ke Homepage
        </button>
        <Toaster />
      </div>
    );

  if (isAdmin === null)
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-center text-lg font-medium">Memeriksa akses admin...</p>
        <Toaster />
      </div>
    );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Toaster />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <button
          className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700"
          onClick={() => signOut(auth)}
        >
          Logout
        </button>
      </div>

      {/* FORM TAMBAH / EDIT */}
      <div className="bg-zinc-900 p-4 rounded-xl shadow-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">{isEdit ? "Edit Film" : "Tambah Film"}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Judul Film"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full p-2 rounded bg-zinc-800 text-white"
          />
          <input
            type="text"
            placeholder="URL Gambar"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            required
            className="w-full p-2 rounded bg-zinc-800 text-white"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Durasi (menit)"
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              required
              className="w-full p-2 rounded bg-zinc-800 text-white"
            />
            <input
              type="number"
              placeholder="Harga (Rp)"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
              className="w-full p-2 rounded bg-zinc-800 text-white"
            />
          </div>
          <input
            type="text"
            placeholder="Drive URL"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            required
            className="w-full p-2 rounded bg-zinc-800 text-white"
          />
          <div className="flex gap-4">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded font-semibold">
              {isEdit ? "Simpan Perubahan" : "Tambah Film"}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded font-semibold"
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Cari film..."
        value={search}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        className="w-full p-2 rounded mb-4 bg-zinc-800 text-white"
      />

      {/* LIST MOVIE */}
      {loadingMovies ? (
        <p>Loading...</p>
      ) : paginatedMovies.length === 0 ? (
        <p className="text-gray-400">Belum ada film.</p>
      ) : (
        <div className="space-y-4">
          {paginatedMovies.map((m) => (
            <div key={m.id} className="bg-zinc-900 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{m.title}</p>
                <p className="text-sm text-gray-400">
                  {m.minute} min • Rp{m.price}
                </p>
                <p className="text-xs text-gray-500 break-all">Drive: {m.drive_url}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(m)} className="px-4 py-1 bg-blue-600 rounded hover:bg-blue-700">
                  Edit
                </button>
                <button onClick={() => handleDelete(m.id)} className="px-4 py-1 bg-red-600 rounded hover:bg-red-700">
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-zinc-800 text-gray-200"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}