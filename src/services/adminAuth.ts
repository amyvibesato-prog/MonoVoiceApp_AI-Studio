export async function logoutAdmin(): Promise<{ success: boolean }> {
  try {
    const res = await fetch("/api/admin/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function checkAdminSession(): Promise<{ authenticated: boolean; expiresAt?: number }> {
  try {
    const res = await fetch("/api/admin/session", { cache: "no-store" });
    if (!res.ok) return { authenticated: false };
    return await res.json();
  } catch (e) {
    return { authenticated: false };
  }
}
