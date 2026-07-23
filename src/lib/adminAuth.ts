import { api } from "@/lib/api";

const ADMIN_TOKEN_KEY = "trucare.admin.session";

export async function adminBeforeLoad() {
  if (typeof window === "undefined") return;

  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) {
    return;
  }

  try {
    await api.getStats();
  } catch {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}
