import { redirect } from "@tanstack/react-router";
import { api } from "@/lib/api";

const ADMIN_TOKEN_KEY = "trucare.admin.session";

export async function adminBeforeLoad() {
  if (typeof window === "undefined") return;

  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) {
    throw redirect({ to: "/admin/login" });
  }

  try {
    await api.getStats();
  } catch {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    throw redirect({ to: "/admin/login" });
  }
}
