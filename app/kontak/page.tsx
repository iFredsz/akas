"use client";

import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ContactData {
  id: string;
  company_name: string;
  hero_title: string;
  hero_subtitle: string;
  address: string;
  phone: string;
  email: string;
  office_hours: string;
  maps_url: string;
  address_url: string;
  whatsapp_url: string;
}

// Default data untuk instant render
const DEFAULT_DATA: ContactData = {
  id: 'default',
  company_name: 'CV Akas Brother Consultant',
  hero_title: 'Mari Mulai Proyek Anda',
  hero_subtitle: 'Tim profesional kami siap membantu mewujudkan visi proyek Anda dengan solusi konsultan terbaik.',
  address: 'Perumahan Griya Annisa Estate Blok B No 9 Jl Rusa Gg Bendo 2, Kel Sukamenanti Kec Kedaton, Bandar Lampung, Lampung, Indonesia',
  phone: '+62 812-3456-7890',
  email: 'info@akasbrotherconsultant.co.id',
  office_hours: 'Senin – Jumat\n08.00 – 17.00 WIB',
  maps_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3972.123456789012!2d105.2627345!3d-5.3979876!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNcKwMjInNTIuOCJTIDEwNcKwMTUnNDkuOCJF!5e0!3m2!1sid!2sid!4v1234567890',
  address_url: 'https://maps.app.goo.gl/your-address-url',
  whatsapp_url: 'https://wa.me/6281234567890'
};

// Skeleton Components
const CardSkeleton = () => (
  <div className="p-4 rounded-xl bg-white border-2 border-gray-200 shadow-md animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
      <div className="flex-1 min-h-[70px] flex flex-col justify-center space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  </div>
);

const MapSkeleton = () => (
  <div className="relative">
    <div className="absolute -inset-2 bg-linear-to-r from-gray-200/20 to-transparent rounded-3xl blur-2xl" />
    <div className="relative w-full h-[300px] sm:h-[350px] md:h-full min-h-[300px] md:min-h-[450px] rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg bg-gray-200 animate-pulse flex items-center justify-center">
      <MapPin className="w-12 h-12 text-gray-400" />
    </div>
  </div>
);

// Fungsi helper di luar component untuk menghindari hoisting issue
const generateMapsUrl = (address: string): string => {
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
};

export default function ContactPage() {
  const [contactData, setContactData] = useState<ContactData>(DEFAULT_DATA);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchContactData = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('contact_page')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (mounted) {
          if (!error && data) {
            // Jika address_url kosong, buat dari address
            const dataWithUrl = {
              ...data,
              address_url: data.address_url || generateMapsUrl(data.address)
            };
            setContactData(dataWithUrl);
          }
          // Jika error, tetap gunakan DEFAULT_DATA yang sudah di-set
          setIsInitialLoad(false);
        }
      } catch (err) {
        console.error('Error:', err);
        if (mounted) {
          setIsInitialLoad(false);
        }
      }
    };

    // Delay sedikit untuk memberikan waktu render UI dulu
    const timer = setTimeout(() => {
      fetchContactData();
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const formatWithBreaks = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const formatTitle = (title: string) => {
    if (title.includes('Proyek Anda')) {
      const parts = title.split('Proyek Anda');
      return (
        <>
          {parts[0]}
          <span className="text-[#A6FF00]">Proyek Anda</span>
          {parts[1]}
        </>
      );
    }
    return title;
  };

  return (
    <main className="bg-linear-to-br from-green-50 via-white to-emerald-50 text-gray-900 overflow-x-hidden">
      {/* Hero Section - Always rendered instantly */}
      <section className="relative min-h-[40vh] sm:min-h-[45vh] flex items-center justify-center px-4 sm:px-6 pt-28 sm:pt-32 pb-12 sm:pb-16">
        <div className="absolute inset-0 bg-linear-to-b from-[#A6FF00]/10 to-transparent" />
        
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            {formatTitle(contactData.hero_title)}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-4">
            {contactData.hero_subtitle}
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Left Column - Contact Cards */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">
                  {contactData.company_name}
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                  Hubungi kami untuk konsultasi proyek Anda
                </p>
              </div>

              {isInitialLoad ? (
                // Skeleton Loading State
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                // Actual Content
                <>
                  {/* Card Alamat */}
                  <a
                    href={contactData.address_url || generateMapsUrl(contactData.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-4 rounded-xl bg-white border-2 border-[#A6FF00]/30 hover:border-[#A6FF00] hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#A6FF00]/20 flex items-center justify-center shrink-0 group-hover:bg-[#A6FF00]/30 transition">
                        <MapPin className="w-5 h-5 text-[#A6FF00]" />
                      </div>
                      <div className="flex-1 min-h-[70px] flex flex-col justify-center">
                        <h3 className="text-base font-semibold mb-1 text-gray-900 group-hover:text-[#A6FF00] transition">
                          Alamat Kantor
                        </h3>
                        <p className="text-gray-600 text-xs leading-relaxed">
                          {formatWithBreaks(contactData.address)}
                        </p>
                      </div>
                    </div>
                  </a>

                  {/* Card WhatsApp */}
                  <a
                    href={contactData.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-4 rounded-xl bg-white border-2 border-[#A6FF00]/30 hover:border-[#A6FF00] hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#A6FF00]/20 flex items-center justify-center shrink-0 group-hover:bg-[#A6FF00]/30 transition">
                        <Phone className="w-5 h-5 text-[#A6FF00]" />
                      </div>
                      <div className="flex-1 min-h-[70px] flex flex-col justify-center">
                        <h3 className="text-base font-semibold mb-1 text-gray-900 group-hover:text-[#A6FF00] transition">
                          WhatsApp
                        </h3>
                        <p className="text-gray-600 text-xs">
                          {contactData.phone}
                        </p>
                      </div>
                    </div>
                  </a>

                  {/* Card Email */}
                  <a
                    href={`mailto:${contactData.email}`}
                    className="group block p-4 rounded-xl bg-white border-2 border-[#A6FF00]/30 hover:border-[#A6FF00] hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#A6FF00]/20 flex items-center justify-center shrink-0 group-hover:bg-[#A6FF00]/30 transition">
                        <Mail className="w-5 h-5 text-[#A6FF00]" />
                      </div>
                      <div className="flex-1 min-h-[70px] flex flex-col justify-center">
                        <h3 className="text-base font-semibold mb-1 text-gray-900 group-hover:text-[#A6FF00] transition">
                          Email
                        </h3>
                        <p className="text-gray-600 text-xs break-all">
                          {contactData.email}
                        </p>
                      </div>
                    </div>
                  </a>

                  {/* Card Jam Operasional */}
                  <div className="p-4 rounded-xl bg-white border-2 border-[#A6FF00]/30 shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#A6FF00]/20 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-[#A6FF00]" />
                      </div>
                      <div className="flex-1 min-h-[70px] flex flex-col justify-center">
                        <h3 className="text-base font-semibold mb-1 text-gray-900">
                          Jam Operasional
                        </h3>
                        <p className="text-gray-600 text-xs">
                          {formatWithBreaks(contactData.office_hours)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Column - Map */}
            {isInitialLoad ? (
              <MapSkeleton />
            ) : (
              <div className="relative">
                <div className="absolute -inset-2 bg-linear-to-r from-[#A6FF00]/20 to-transparent rounded-3xl blur-2xl" />
                <div className="relative w-full h-[300px] sm:h-[350px] md:h-full min-h-[300px] md:min-h-[450px] rounded-xl overflow-hidden border-2 border-[#A6FF00]/30 shadow-lg">
                  <iframe
                    title="Lokasi CV Akas Brother Consultant"
                    src={contactData.maps_url}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}