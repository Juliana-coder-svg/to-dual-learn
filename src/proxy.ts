import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

/** Обновляет access token Supabase в cookie на каждом запросе. Server Components
 *  не могут писать cookie, поэтому refresh живёт здесь (в Next 16 это proxy, бывший middleware). */
export async function proxy(request: NextRequest) {
  // Ссылка из письма Supabase ведёт на Site URL, если адрес приложения не добавлен в Redirect URLs.
  // Код обмена при этом приходит на главную: переносим его на /auth/callback, чтобы вход всё равно прошёл.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/auth/callback" && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const target = request.nextUrl.clone();
    target.pathname = "/auth/callback";
    return NextResponse.redirect(target);
  }

  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  // Сам вызов нужен ради побочного эффекта: при протухшем токене клиент обновит его через setAll.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
