// TruCare API surface.
// Production data lives in secure MySQL, encrypted at rest and in transit.
// Never persist PII in browser/Supabase.
//
// Screens import ONLY from '@/lib/api'. Toggling /admin/settings from mock to
// real MySQL swaps the implementation without touching UI.

import { mockApi } from "./mock";
import { realApi } from "./client";

export * from "./types";

// Змінюємо тут: mockApi → realApi
export const api = realApi;