"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";

interface Movie {
  id: string;
  title: string;
  image: string;
  minute: number;
  price: number;
  drive_url: string;
  createdAt: Timestamp;
}

interface Transaction {
  status: "completed" | "pending" | "failed";
}

interface TransactionResponse {
  transaction?: Transaction;
  error?: string;
}

interface PaymentResponse {
  payment_url?: string;
  error?: string;
}

// Fungsi untuk mendapatkan atau membuat user ID unik
function getUserId(): string {
  const cookieName = "movie_user_id";
  
  // Cek apakah sudah ada cookie
  const cookies = document.cookie.split("; ");
  const existingCookie = cookies.find(c => c.startsWith(cookieName + "="));
  
  if (existingCookie) {
    return existingCookie.split("=")[1];
  }
  
  // Buat user ID baru jika belum ada
  const newUserId = "user_" + Math.random().toString(36).substring(2, 15) + Date.now();
  
  // Set cookie yang expire dalam 10 tahun
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 10);
  document.cookie = `${cookieName}=${newUserId}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  
  return newUserId;
}

export default function MovieList({ search }: { search?: string }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Transaction["status"] | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  // Inisialisasi userId langsung tanpa useState untuk menghindari cascading renders
  const userId = typeof window !== 'undefined' ? getUserId() : '';

  useEffect(() => {
    const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Movie[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Movie));
      setMovies(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleClick = async (movie: Movie) => {
    try {
      // Buat order_id unik untuk setiap user: movie.id + userId
      const uniqueOrderId = `${movie.id}_${userId}`;
      
      const res = await fetch(`/api/transactiondetail?order_id=${uniqueOrderId}&amount=${movie.price}`);
      const data = await res.json() as TransactionResponse;

      setSelected(movie);
      setSelectedStatus(data.transaction?.status ?? "pending");
      setPaymentUrl(null);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat memeriksa status transaksi.");
    }
  };

  const handlePayment = async (movie: Movie) => {
    try {
      if (selectedStatus === "completed") {
        window.open(movie.drive_url, "_blank");
        setSelected(null);
        return;
      }

      // Buat order_id unik untuk setiap user
      const uniqueOrderId = `${movie.id}_${userId}`;

      const res = await fetch("/api/pay", {
        method: "POST",
        body: JSON.stringify({ order_id: uniqueOrderId, amount: movie.price }),
      });

      if (!res.ok) {
        const err = await res.json() as PaymentResponse;
        alert(`Gagal membuat transaksi: ${err.error}`);
        return;
      }

      const data = await res.json() as PaymentResponse;
      if (!data.payment_url) {
        alert("Gagal membuat transaksi.");
        return;
      }

      setPaymentUrl(data.payment_url);

      // polling status
      const interval = setInterval(async () => {
        const statusRes = await fetch(`/api/transactiondetail?order_id=${uniqueOrderId}&amount=${movie.price}`);
        const statusData = await statusRes.json() as TransactionResponse;

        if (statusData.transaction?.status === "completed") {
          clearInterval(interval);
          setSelected(null);
          setPaymentUrl(null);
          window.open(movie.drive_url, "_blank");
        }
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat membuat pembayaran.");
    }
  };

  if (loading) return null;

  // fungsi format tanggal
  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Filter dan pagination
  const filteredMovies = movies.filter((m) => 
    search ? m.title.toLowerCase().includes(search.toLowerCase()) : true
  );
  
  // Reset halaman ke 1 jika currentPage melebihi totalPages setelah filter
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
  const safePage = currentPage > totalPages ? 1 : currentPage;
  
  const paginatedMovies = filteredMovies.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  // Update currentPage jika berbeda dari safePage
  if (currentPage !== safePage && totalPages > 0) {
    setTimeout(() => setCurrentPage(safePage), 0);
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-2">
        {paginatedMovies.map((movie) => (
          <div
            key={movie.id}
            className="bg-zinc-900 text-white rounded-xl overflow-hidden shadow-md hover:scale-105 duration-200 cursor-pointer"
            onClick={() => handleClick(movie)}
          >
            <div className="w-full aspect-3/4 relative">
              <Image src={movie.image} alt={movie.title} fill className="object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-2 flex justify-between text-xs">
                <span>{formatDate(movie.createdAt)}</span>
                <span>{movie.minute} min</span>
              </div>
            </div>
            <div className="p-2">
              <h2 className="text-sm font-semibold line-clamp-2 leading-tight">{movie.title}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6 mb-4 px-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={safePage === 1}
            className={`px-4 py-2 rounded-lg ${
              safePage === 1
                ? "bg-zinc-800 text-gray-500 cursor-not-allowed"
                : "bg-zinc-800 text-white hover:bg-zinc-700"
            }`}
          >
            Prev
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Tampilkan halaman: first, last, current, dan 1 halaman sebelum/sesudah current
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= safePage - 1 && page <= safePage + 1);

              if (!showPage) {
                // Tampilkan ellipsis
                if (page === safePage - 2 || page === safePage + 2) {
                  return (
                    <span key={page} className="px-3 py-2 text-gray-500">
                      ...
                    </span>
                  );
                }
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg ${
                    safePage === page
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-gray-200 hover:bg-zinc-700"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={safePage === totalPages}
            className={`px-4 py-2 rounded-lg ${
              safePage === totalPages
                ? "bg-zinc-800 text-gray-500 cursor-not-allowed"
                : "bg-zinc-800 text-white hover:bg-zinc-700"
            }`}
          >
            Next
          </button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 overflow-auto">
          <div className="bg-zinc-900 rounded-lg w-full max-w-md md:max-w-lg p-4 mx-auto relative overflow-x-hidden">
            <button
              className="absolute top-2 right-2 text-white text-2xl font-bold z-50 focus:outline-none"
              onClick={() => {
                setSelected(null);
                setPaymentUrl(null);
              }}
            >
              &times;
            </button>

            <h3 className="text-white font-semibold text-lg mb-2">{selected.title}</h3>

            {selectedStatus !== "completed" && !paymentUrl && (
              <p className="text-white mb-4">Harga: Rp{selected.price}</p>
            )}

            <button
              className="bg-green-600 text-white w-full py-2 rounded-lg mb-2"
              onClick={() => handlePayment(selected)}
            >
              {selectedStatus === "completed" ? "Tonton Film" : "Bayar & Dapatkan Akses"}
            </button>

            {paymentUrl && (
              <div className="mt-4 w-full h-[70vh] md:h-[500px] overflow-y-auto rounded-lg">
                <iframe
                  src={paymentUrl}
                  title="Pembayaran"
                  className="w-full h-full rounded-lg"
                  style={{ border: "none" }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}