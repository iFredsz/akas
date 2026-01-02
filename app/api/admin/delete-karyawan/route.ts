import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function DELETE(req: NextRequest) {
  try {
    /* ======================================================
     * 1. Ambil user yang memanggil API (dari session)
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
     * 2. Supabase SERVICE ROLE (admin)
     * ====================================================== */
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /* ======================================================
     * 3. Cek role user (admin / super_admin)
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
     * 4. Ambil ID target yang mau dihapus
     * ====================================================== */
    const body = (await req.json()) as { id?: string };
    const targetUserId = body.id;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "ID target wajib" },
        { status: 400 }
      );
    }

    /* ======================================================
     * 5. Hapus user target
     *    (auth → users)
     * ====================================================== */
    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteAuthError) {
      return NextResponse.json(
        { error: deleteAuthError.message },
        { status: 400 }
      );
    }

    const { error: deleteDbError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", targetUserId);

    if (deleteDbError) {
      return NextResponse.json(
        { error: deleteDbError.message },
        { status: 400 }
      );
    }

    /* ======================================================
     * 6. Sukses
     * ====================================================== */
    return NextResponse.json({
      message: "Akun perusahaan berhasil dihapus",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server";

    console.error("Delete user error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
