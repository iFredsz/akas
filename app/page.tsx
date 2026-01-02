'use client';

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/browser';

interface Client {
  id: string;
  name: string;
  logo_url: string;
}

interface Partner {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
}

interface HomepageSettings {
  konsultasi_link: string;
  hubungi_link: string;
}

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [settings, setSettings] = useState<HomepageSettings>({ 
    konsultasi_link: '#', 
    hubungi_link: '#' 
  });

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load settings
        const { data: settingsData } = await supabase
          .from('homepage_settings')
          .select('konsultasi_link, hubungi_link')
          .single();

        if (settingsData) {
          setSettings({
            konsultasi_link: settingsData.konsultasi_link || '#',
            hubungi_link: settingsData.hubungi_link || '#'
          });
        }

        // Load clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, logo_url')
          .order('created_at', { ascending: false });

        // Load partners
        const { data: partnersData } = await supabase
          .from('partners')
          .select('id, name, description, logo_url')
          .order('created_at', { ascending: false });

        setClients(clientsData || []);
        setPartners(partnersData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  return (
    <main className="bg-white text-gray-900 overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative min-h-screen flex items-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1521791136064-7986c2920216')",
          }}
        />
        <div className="absolute inset-0 bg-gray-900/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/85 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,_#A6FF00_0%,_transparent_45%)] opacity-20" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-2 sm:px-0">
          <div className="max-w-2xl text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white">
              Mitra Strategis
              <span className="block text-[#A6FF00]">
                Konsultan Proyek Profesional
              </span>
            </h1>
            <p className="mt-4 sm:mt-6 text-gray-100 text-sm sm:text-base md:text-lg leading-relaxed">
              Mitra strategis Anda dalam perencanaan, pengawasan, dan
              pendampingan proyek dengan standar profesional dan hasil yang
              terukur.
            </p>
            <div className="mt-8 sm:mt-10 flex gap-5">
              <a 
                href={settings.konsultasi_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="rounded-full bg-[#A6FF00] text-gray-900 px-6 sm:px-8 py-3 sm:py-4 font-semibold hover:scale-105 hover:ring-4 hover:ring-white/50 hover:shadow-2xl transition-all duration-300 cursor-pointer"
              >
                Konsultasi Sekarang
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ABOUT ================= */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">Kenapa Memilih Kami?</h2>
            <p className="text-gray-600 leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base">
              CV Akas Brother Consultant membantu klien mencapai keberhasilan
              proyek melalui pendekatan analitis, pengalaman lapangan, dan
              komunikasi yang transparan.
            </p>
            <ul className="space-y-3 sm:space-y-4">
              {[
                "Pendekatan profesional & sistematis",
                "Tim berpengalaman dan bersertifikat",
                "Laporan jelas & mudah dipahami",
                "Pendampingan hingga proyek selesai",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-[#A6FF00] rounded-full shrink-0" />
                  <span className="text-gray-700 text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {["Perencanaan", "Pengawasan", "Manajemen", "Pendampingan"].map(
              (item, i) => (
                <div
                  key={i}
                  className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gray-100 border-2 border-gray-300 p-3 sm:p-4 md:p-6 lg:p-8 hover:-translate-y-2 hover:shadow-lg hover:ring-2 hover:ring-[#A6FF00] hover:border-[#A6FF00] transition-all duration-300"
                >
                  <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2 text-gray-900">{item}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Layanan profesional sesuai standar dan kebutuhan proyek Anda.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ================= PROCESS ================= */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-10 lg:mb-16 text-gray-900">
            Cara Kami Bekerja
          </h2>

          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-10">
            {["Analisis", "Perencanaan", "Eksekusi", "Evaluasi"].map(
              (step, i) => (
                <div
                  key={i}
                  className="rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gray-50 border-2 border-gray-300 p-4 sm:p-6 lg:p-8 text-center hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-[#A6FF00] hover:border-[#A6FF00] transition-all duration-300"
                >
                  <div className="text-[#A6FF00] text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 lg:mb-4">
                    0{i + 1}
                  </div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-2 sm:mb-3 text-gray-900">{step}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Proses terstruktur untuk menjamin kualitas dan ketepatan
                    hasil.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ================= CLIENT LOGO CAROUSEL ================= */}
      {clients.length > 0 && (
        <section className="py-12 sm:py-16 md:py-20 lg:py-28 pb-16 sm:pb-24 lg:pb-36 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-10 lg:mb-16 text-gray-900">
              Klien Kami
            </h2>

            <div className="w-full">
              <Swiper
                modules={[Autoplay]}
                slidesPerView={3}
                loop={true}
                loopAdditionalSlides={3}
                autoplay={{ 
                  delay: 2000, 
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true 
                }}
                centeredSlides={false}
                className="py-6 sm:py-10"
                breakpoints={{
                  0: { 
                    slidesPerView: 2, 
                    spaceBetween: 10,
                    centeredSlides: false 
                  },
                  480: { 
                    slidesPerView: 3, 
                    spaceBetween: 15,
                    centeredSlides: false 
                  },
                  768: { 
                    slidesPerView: 3, 
                    spaceBetween: 20, 
                    centeredSlides: false 
                  },
                  1024: { 
                    slidesPerView: 3, 
                    spaceBetween: 20, 
                    centeredSlides: false 
                  },
                }}
              >
                {[...clients, ...clients, ...clients].map((client, i) => (
                  <SwiperSlide key={`${client.id}-${i}`} className="flex items-center justify-center">
                    <div className="flex items-center justify-center w-full h-16 sm:h-20 md:h-24 lg:h-32">
                      <Image
                        src={client.logo_url}
                        alt={client.name}
                        width={200}
                        height={110}
                        className="object-contain w-full h-full"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </section>
      )}

      {/* ================= MITRA KONTRAKTOR ================= */}
      {partners.length > 0 && (
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 lg:mb-8 text-gray-900">
              Mitra Kontraktor Kami
            </h2>
            <p className="text-gray-600 mb-8 sm:mb-10 lg:mb-12 max-w-2xl mx-auto text-sm sm:text-base">
              Bekerja sama dengan kontraktor terpercaya untuk hasil proyek yang maksimal
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((partner) => (
                <div 
                  key={partner.id}
                  className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#A6FF00]/10 to-[#A6FF00]/5 border-2 border-[#A6FF00]/30 p-6 sm:p-8 hover:shadow-2xl hover:-translate-y-2 hover:ring-4 hover:ring-[#A6FF00] hover:border-[#A6FF00] transition-all duration-300"
                >
                  <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    {partner.logo_url ? (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#A6FF00] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <Image
                          src={partner.logo_url}
                          alt={partner.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#AFF000] flex items-center justify-center flex-shrink-0">
                        <span className="text-xl sm:text-2xl font-bold text-gray-900">
                          {partner.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                      {partner.name}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {partner.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= CTA ================= */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto relative">
          <div className="relative rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#A6FF00] to-[#8FE600] p-6 sm:p-8 md:px-10 lg:px-12 md:py-8 lg:py-10 text-black shadow-2xl group">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full -ml-24 -mb-24 group-hover:scale-110 transition-transform duration-700"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 md:gap-8 lg:gap-10 relative z-10">
              {/* Mobile Image */}
              <div className="relative block md:hidden">
                <div className="relative mx-auto w-40 h-40 sm:w-48 sm:h-48 group-hover:scale-105 transition-transform duration-500">
                  <Image
                    src="/constr.png"
                    alt="Construction Consultant"
                    width={200}
                    height={200}
                    className="object-contain w-full h-full drop-shadow-2xl"
                  />
                </div>
              </div>

              {/* Text Content */}
              <div className="relative text-center md:text-left">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 leading-tight transition-all duration-300">
                  Saatnya Proyek Anda Berjalan Lebih Pasti
                </h2>

                <p className="text-xs sm:text-sm md:text-base text-gray-900/80 mb-4 sm:mb-6 leading-relaxed">
                  Tim profesional kami siap mendukung proyek Anda dari awal hingga
                  selesai dengan standar terbaik.
                </p>

                <a 
                  href={settings.hubungi_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block rounded-full bg-gray-900 text-white px-6 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm md:text-base font-semibold hover:bg-gray-800 hover:scale-105 hover:shadow-xl hover:ring-4 hover:ring-[#A6FF00] transition-all duration-300 cursor-pointer"
                >
                  Hubungi Kami Sekarang →
                </a>
              </div>

              {/* Desktop Image - 2.5D Effect - Outside parent but controlled */}
              <div className="relative hidden md:block h-full pointer-events-none">
                <div className="absolute right-0 bottom-0 w-[350px] h-[350px] lg:w-[480px] lg:h-[480px] group-hover:scale-[1.02] transition-all duration-500 pointer-events-auto" style={{ transform: 'translateX(30%) translateY(15%)' }}>
                  <Image
                    src="/constr.png"
                    alt="Construction Consultant"
                    width={480}
                    height={480}
                    className="object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.35)] group-hover:drop-shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}