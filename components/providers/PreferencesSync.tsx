"use client";

import { usePreferencesSync } from "@/utils/hooks/useUserPreferences";

export default function PreferencesSync() {
  usePreferencesSync();
  return null;
}
