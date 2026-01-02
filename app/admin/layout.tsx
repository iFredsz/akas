"use client";
import { ReactNode, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { HiMenu, HiX, HiHome, HiUser, HiPhotograph, HiMail, HiLogout, HiViewGrid } from "react-icons/hi";

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: HiViewGrid },
    { href: "/admin/manage-home", label: "Manage Home", icon: HiHome },
    { href: "/admin/manage-profile", label: "Manage Profile", icon: HiUser },
    { href: "/admin/manage-media", label: "Manage Media", icon: HiPhotograph },
    { href: "/admin/manage-contact", label: "Manage Contact", icon: HiMail },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-gradient-to-b from-[#A6FF00] to-[#95e600] text-gray-900
          flex flex-col p-6 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-gray-700 mt-1">Kelola Website</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <HiX className="text-2xl" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 p-3 rounded-xl font-medium
                  transition-all duration-200
                  ${active 
                    ? "bg-white text-gray-900 shadow-md" 
                    : "hover:bg-white/20 text-gray-800"
                  }
                `}
              >
                <Icon className="text-xl flex-shrink-0" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-6 flex items-center gap-3 w-full bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
        >
          <HiLogout className="text-xl" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiMenu className="text-2xl text-gray-900" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Main Content Area */}
        <main className="flex-1 bg-white overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}