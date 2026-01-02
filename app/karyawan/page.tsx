"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface User {
  id: string;
  email: string | null;
  role: string | null;
  full_name: string | null;
  position: string | null;
  birth_date: string | null;
  address: string | null;
}

export default function KaryawanPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [userData, setUserData] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
      } else {
        setUserData(data);
        setForm(data);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const saveProfile = async () => {
    if (!userData) return;

    const { error } = await supabase
      .from("users")
      .update({
        full_name: form.full_name,
        birth_date: form.birth_date,
        address: form.address,
      })
      .eq("id", userData.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profil berhasil diperbarui");
    setUserData({ ...userData, ...form });
    setEditMode(false);
  };

  if (loading) return null;
  if (!userData) return <p className="text-black">Data tidak ditemukan</p>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* CARD UTAMA */}
      <div className="bg-white border border-gray-300 rounded-lg p-6 text-black">
        {/* HEADER */}
        <div className="mb-6 border-b border-gray-200 pb-3">
          <h1 className="text-xl font-bold">
            Selamat datang, {userData.full_name || "Karyawan"}
          </h1>
          <p className="text-sm text-gray-600">
            Berikut adalah data profil Anda
          </p>
        </div>

        {/* ISI PROFIL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <ProfileField
            label="Nama Lengkap"
            value={form.full_name}
            editable={editMode}
            onChange={(v) => setForm({ ...form, full_name: v })}
          />

          <ProfileField label="Email" value={userData.email} />
          <ProfileField label="Role" value={userData.role} />
          <ProfileField label="Jabatan" value={userData.position} />

          <ProfileField
            label="Tanggal Lahir"
            value={form.birth_date}
            type="date"
            editable={editMode}
            onChange={(v) => setForm({ ...form, birth_date: v })}
          />

          <ProfileField
            label="Alamat"
            value={form.address}
            editable={editMode}
            onChange={(v) => setForm({ ...form, address: v })}
          />
        </div>

        {/* ACTION BUTTON */}
        <div className="mt-6 flex gap-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
            >
              Edit Profil
            </button>
          ) : (
            <>
              <button
                onClick={saveProfile}
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
              >
                Simpan
              </button>
              <button
                onClick={() => {
                  setForm(userData);
                  setEditMode(false);
                }}
                className="bg-gray-500 text-white px-4 py-1 rounded hover:bg-gray-600"
              >
                Batal
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  editable = false,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | null | undefined;
  editable?: boolean;
  onChange?: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <p className="mb-1 font-medium text-black">{label}</p>

      {editable ? (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 rounded p-2 text-black outline-none"
        />
      ) : (
        <div className="border border-gray-200 rounded p-2 bg-gray-50">
          {value || "-"}
        </div>
      )}
    </div>
  );
}
