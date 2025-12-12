"use client";

import { useState } from "react";
import MovieList from "@/components/MovieList";

export default function Home() {
  const [search, setSearch] = useState("");

  return (
    <main className="min-h-screen bg-black text-white">

      {/* Hero */}
      <section className="h-[60vh] w-full relative flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center opacity-40"></div>

        <div className="relative z-10 text-center p-4">
          <h1 className="text-5xl md:text-7xl font-extrabold drop-shadow-xl">Movie18</h1>
          <p className="text-gray-300 mt-3 text-lg md:text-xl">Nonton puas tanpa iklan</p>

          {/* Search */}
          <div className="mt-6 flex items-center justify-center gap-2 w-full px-4">
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 md:w-96 px-4 py-3 rounded-xl bg-white/90 text-black shadow focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Movie List */}
      <section className="p-6">
        <h2 className="text-2xl font-semibold mb-2">🔥 Latest Videos</h2>
        <MovieList search={search} />
      </section>

    </main>
  );
}
