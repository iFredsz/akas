"use client";

import { FiDownload } from "react-icons/fi";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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
}

// Default data untuk instant render
const DEFAULT_DATA: VisiMisiData = {
  id: 'default',
  hero_image: '/gedung.avif',
  hero_title: 'Profil Perusahaan',
  hero_subtitle: 'Komitmen CV Akas Brother Consultant dalam menghadirkan layanan konsultan teknik yang profesional, legal, dan berkelanjutan.',
  company_name: 'CV Akas Brother Consultant',
  pdf_url: null,
  pdf_filename: 'surat-perizinan.pdf',
  visi_text: '"Menjadi mitra konsultan teknik terintegrasi yang inovatif, berkelanjutan, dan terdepan dalam menghadirkan solusi infrastruktur serta bangunan yang berdampak positif bagi masyarakat dan lingkungan."'
};

const DEFAULT_MISI: MisiItem[] = [
  {
    id: '1',
    order_number: 1,
    title: 'Keunggulan Perencanaan & Desain',
    description: 'Menghasilkan rancangan yang presisi, estetis, dan fungsional dengan integrasi teknologi terkini serta standar engineering internasional.'
  },
  {
    id: '2',
    order_number: 2,
    title: 'Kualitas Supervisi yang Ketat',
    description: 'Menjamin setiap tahapan konstruksi berjalan sesuai rencana melalui pengawasan transparan dan mengutamakan K3.'
  },
  {
    id: '3',
    order_number: 3,
    title: 'Inovasi Berkelanjutan',
    description: 'Menerapkan prinsip green engineering dan solusi ramah lingkungan dalam setiap proyek.'
  },
  {
    id: '4',
    order_number: 4,
    title: 'Integritas & Profesionalisme',
    description: 'Membangun kepercayaan klien melalui komunikasi jujur, ketepatan waktu, dan mutu tinggi.'
  },
  {
    id: '5',
    order_number: 5,
    title: 'Pengembangan Sumber Daya Manusia',
    description: 'Membentuk tim ahli yang kompeten dan adaptif terhadap perkembangan teknologi industri 4.0 di bidang teknik dan manajemen proyek.'
  }
];

// Skeleton Components
const HeroSkeleton = () => (
  <section className="max-w-[1400px] mx-auto px-6 mb-24">
    <div className="relative rounded-3xl overflow-hidden shadow-xl h-[420px] sm:h-[520px] bg-gray-200 animate-pulse">
      <div className="absolute inset-0 bg-linear-to-t from-white/90 via-white/60 to-transparent flex items-end">
        <div className="p-8 sm:p-12 max-w-3xl space-y-3">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-12 bg-gray-300 rounded w-48 mt-6"></div>
        </div>
      </div>
    </div>
  </section>
);

const VisiSkeleton = () => (
  <section className="max-w-7xl mx-auto px-6 mb-20">
    <div className="border-l-4 border-gray-300 pl-6 animate-pulse">
      <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  </section>
);

const MisiSkeleton = () => (
  <section className="max-w-7xl mx-auto px-6">
    <div className="h-6 bg-gray-300 rounded w-48 mb-12 mx-auto animate-pulse"></div>
    <div className="grid gap-8 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-gray-200 rounded-2xl p-6 animate-pulse">
          <div className="h-5 bg-gray-300 rounded w-3/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default function VisiMisiPage() {
  const supabase = createClient();
  
  const [data, setData] = useState<VisiMisiData>(DEFAULT_DATA);
  const [misiList, setMisiList] = useState<MisiItem[]>(DEFAULT_MISI);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        // Parallel fetch untuk performa maksimal
        const [visiMisiResult, misiResult] = await Promise.all([
          supabase
            .from("visi_misi")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from("misi_items")
            .select("*")
            .order("order_number", { ascending: true })
        ]);

        if (mounted) {
          // Update visi misi data jika ada
          if (visiMisiResult.data) {
            setData(visiMisiResult.data);
          }

          // Update misi list jika ada
          if (misiResult.data && misiResult.data.length > 0) {
            setMisiList(misiResult.data);
          }

          setIsInitialLoad(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (mounted) {
          setIsInitialLoad(false);
        }
      }
    };

    // Delay untuk memberikan waktu render UI dulu
    const timer = setTimeout(() => {
      fetchData();
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [supabase]);

  const getImageUrl = (path: string) => {
    if (path.startsWith('http') || path.startsWith('/')) {
      return path;
    }
    return supabase.storage.from("visi-misi").getPublicUrl(path).data.publicUrl;
  };

  const formatSubtitle = (subtitle: string, companyName: string) => {
    if (subtitle.includes(companyName)) {
      const parts = subtitle.split(companyName);
      return (
        <>
          {parts[0]}
          <span className="font-semibold text-green-600">{companyName}</span>
          {parts[1]}
        </>
      );
    }
    return subtitle;
  };

  return (
    <main className="pt-24 pb-24 bg-white">
      {/* HERO SECTION */}
      {isInitialLoad ? (
        <HeroSkeleton />
      ) : (
        <section className="max-w-[1400px] mx-auto px-6 mb-24">
          <div className="relative rounded-3xl overflow-hidden shadow-xl h-[420px] sm:h-[520px]">
            <img
              src={getImageUrl(data.hero_image)}
              alt="Gedung Perkantoran Modern"
              className="w-full h-full object-cover object-top"
            />

            <div className="absolute inset-0 bg-linear-to-t from-white/90 via-white/60 to-transparent flex items-end">
              <div className="p-8 sm:p-12 max-w-3xl">
                <h1 className="text-3xl font-bold text-gray-900">
                  {data.hero_title}
                </h1>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {formatSubtitle(data.hero_subtitle, data.company_name)}
                </p>

                {data.pdf_url ? (
                  <a
                    href={data.pdf_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-7 py-3 rounded-full 
                    bg-green-600 text-white font-semibold
                    hover:bg-green-700 transition shadow-lg"
                  >
                    <FiDownload className="text-lg" />
                    Unduh Surat Perizinan
                  </a>
                ) : (
                  <div className="inline-flex items-center gap-3 px-7 py-3 rounded-full 
                  bg-gray-400 text-white font-semibold cursor-not-allowed">
                    <FiDownload className="text-lg" />
                    Dokumen Belum Tersedia
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3">
                  Dokumen resmi • Format PDF
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VISI SECTION */}
      {isInitialLoad ? (
        <VisiSkeleton />
      ) : (
        <section className="max-w-7xl mx-auto px-6 mb-20">
          <div className="border-l-4 border-green-500 pl-6">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Visi Perusahaan
            </h2>
            <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
              {data.visi_text}
            </p>
          </div>
        </section>
      )}

      {/* MISI SECTION */}
      {isInitialLoad ? (
        <MisiSkeleton />
      ) : (
        <section className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-green-600 mb-12 text-center">
            Misi Perusahaan
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            {misiList.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="border border-green-200 rounded-2xl p-6 hover:shadow-lg transition"
              >
                <h3 className="font-semibold text-green-600 mb-3">
                  {item.order_number}. {item.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}

            {misiList.length > 4 && (
              <div className="border border-green-200 rounded-2xl p-6 hover:shadow-lg transition md:col-span-2">
                <h3 className="font-semibold text-green-600 mb-3">
                  {misiList[4].order_number}. {misiList[4].title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {misiList[4].description}
                </p>
              </div>
            )}

            {misiList.length > 5 && misiList.slice(5).map((item) => (
              <div
                key={item.id}
                className="border border-green-200 rounded-2xl p-6 hover:shadow-lg transition"
              >
                <h3 className="font-semibold text-green-600 mb-3">
                  {item.order_number}. {item.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}