"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path: string) => pathname === path;

  const lightPages = ["/tentang-kami", "/visi-misi", "/kontak", "/media"];
  const isLightPage = lightPages.includes(pathname);

  const menuItems = [
    { name: "Tentang Kami", path: "/tentang-kami" },
    { name: "Media", path: "/media" },
    { name: "Kontak", path: "/kontak" },
  ];

  const handleBrandClick = () => {
    setMenuOpen(false);
    router.push("/");
  };

  const handleMenuClick = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  const navbarLight = scrolled || isLightPage || menuOpen;

  const hiddenPages = [
    "/admin",
    "/admin/create-user",
    "/karyawan",
  ];

  const shouldHideNavbar = hiddenPages.some((p) => pathname.startsWith(p));
  if (shouldHideNavbar) return null;

  return (
    <>
      <header className="fixed top-0 w-full z-50 pointer-events-none">
        <div className="mx-auto mt-2 sm:mt-3 w-full px-3 sm:px-4 lg:px-6 pointer-events-auto">
          <div className="relative mx-auto max-w-7xl rounded-full px-3 sm:px-4 md:px-6 lg:px-8 transition-all duration-500">
            {/* Pill Background */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-500
                ${
                  navbarLight
                    ? "bg-white/95 backdrop-blur-md border border-gray-300 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)]"
                    : "bg-transparent border border-transparent shadow-none"
                }`}
            />
            {/* Content */}
            <div className="relative flex items-center py-2 sm:py-2.5 md:py-3">
              {/* Brand */}
              <button
                onClick={handleBrandClick}
                className="flex items-center gap-2 sm:gap-3 shrink-0 group bg-transparent z-[60]"
              >
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full overflow-hidden bg-white border-2 border-gray-300 shadow-sm group-hover:border-[#A6FF00] transition-all duration-300">
                  <Image
                    src="/logo.png"
                    alt="Logo CV Akas Brother Consultant"
                    fill
                    className="object-contain p-1 sm:p-1.5"
                    priority
                  />
                </div>
                <span
                  className={`text-xs sm:text-sm md:text-base font-black tracking-tight transition uppercase
                    ${
                      menuOpen
                        ? "text-gray-900"
                        : navbarLight
                        ? "text-gray-900"
                        : "text-white group-hover:text-[#A6FF00]"
                    }`}
                  style={{ fontFamily: "'Inter', 'Montserrat', sans-serif", letterSpacing: "0.02em" }}
                >
                  CV AKAS BROTHER CONSULTANT
                </span>
              </button>

              <div className="flex-1" />

              {/* Desktop Menu */}
              <nav className="hidden md:flex gap-4 lg:gap-8 items-center text-sm md:text-base">
                {menuItems.map((item) =>
                  item.name === "Kontak" ? (
                    <Link
                      key={item.path}
                      href={item.path}
                      className="relative inline-flex items-center justify-center rounded-full px-4 lg:px-6 py-2 lg:py-2.5 font-bold text-gray-900 overflow-hidden hover:scale-105 hover:shadow-lg transition-all duration-300"
                      style={{ fontFamily: "'Inter', 'Montserrat', sans-serif" }}
                    >
                      <span className="absolute inset-0 bg-[#A6FF00]" />
                      <span className="relative">{item.name}</span>
                    </Link>
                  ) : (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`relative transition-all duration-300 font-semibold
                        ${
                          isActive(item.path)
                            ? "text-[#A6FF00] font-bold"
                            : navbarLight
                            ? "text-gray-700 hover:text-[#A6FF00]"
                            : "text-gray-300 hover:text-white"
                        }`}
                      style={{ fontFamily: "'Inter', 'Montserrat', sans-serif" }}
                    >
                      {item.name}
                      <span
                        className={`absolute -bottom-1 left-0 h-[2px] bg-[#A6FF00] transition-all duration-300
                          ${isActive(item.path) ? "w-full" : "w-0 group-hover:w-full"}`}
                      />
                    </Link>
                  )
                )}
              </nav>

              {/* Mobile Button */}
              <button
                className={`md:hidden ml-2 sm:ml-3 p-2 sm:p-2.5 transition-all duration-300 rounded-full z-[60]
                  ${
                    menuOpen
                      ? "bg-[#A6FF00] text-gray-900 hover:bg-[#8FE600] hover:scale-110 shadow-lg"
                      : navbarLight
                      ? "text-gray-900 hover:text-[#A6FF00] hover:bg-[#A6FF00]/10"
                      : "text-white hover:text-[#A6FF00] hover:bg-[#A6FF00]/10"
                  }`}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <HiX className="w-6 h-6 sm:w-7 sm:h-7" /> : <HiMenu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ${
          menuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`absolute top-20 left-3 right-3 sm:left-4 sm:right-4 bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
            menuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
        >
          <nav className="py-4">
            {menuItems.map((item, index) => (
              <button
                key={item.path}
                onClick={() => handleMenuClick(item.path)}
                className={`w-full text-left px-6 py-4 transition-all duration-200 flex items-center justify-between group
                  ${isActive(item.path) ? "bg-[#A6FF00]/20" : "hover:bg-gray-50"}
                  ${index !== menuItems.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <span
                  className={`font-semibold text-base sm:text-lg transition-colors
                    ${isActive(item.path) ? "text-[#A6FF00] font-bold" : "text-gray-700 group-hover:text-[#A6FF00]"}`}
                  style={{ fontFamily: "'Inter', 'Montserrat', sans-serif" }}
                >
                  {item.name}
                </span>
                {item.name === "Kontak" && (
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#A6FF00] text-gray-900 text-sm font-bold">
                    →
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}