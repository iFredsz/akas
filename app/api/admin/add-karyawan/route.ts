import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

type AddKaryawanBody = {
  email?: string;
  password?: string;
  full_name?: string;
  position?: string | null;
  birth_date?: string | null;
  address?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    /* ======================================================
     * 1. Ambil user yang memanggil API (session)
     * ====================================================== */
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const {
      data: { user },
      error: authUserError,
    } = await supabaseUser.auth.getUser();

    if (authUserError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ======================================================
     * 2. Supabase SERVICE ROLE client
     * ====================================================== */
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /* ======================================================
     * 3. Cek role pemanggil API
     * ====================================================== */
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      roleError ||
      !roleData ||
      !["admin", "super_admin"].includes(roleData.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* ======================================================
     * 4. Ambil & validasi body
     * ====================================================== */
    const body = (await req.json()) as AddKaryawanBody;

    const { email, password, full_name, position, birth_date, address } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Email, password, dan full_name wajib" },
        { status: 400 }
      );
    }

    /* ======================================================
     * 5. Buat user Auth
     * ====================================================== */
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Gagal membuat auth user" },
        { status: 400 }
      );
    }

    /* ======================================================
     * 6. Insert ke tabel users
     * ====================================================== */
    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role: "karyawan",
        position: position ?? null,
        birth_date: birth_date ?? null,
        address: address ?? null,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    /* ======================================================
     * 7. Sukses
     * ====================================================== */
    return NextResponse.json({
      message: "Karyawan berhasil ditambahkan",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server";

    console.error("Add karyawan error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
