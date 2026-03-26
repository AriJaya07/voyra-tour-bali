import type { UserProfile } from "@/types/profile";
import type { Booking } from "@/types/booking";

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch("/api/profile");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updateProfile(data: { name: string; phone: string | null }): Promise<UserProfile> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save profile");
  return res.json();
}

export async function uploadAvatar(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/profile/upload-avatar", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function fetchUserBookings(): Promise<Booking[]> {
  const res = await fetch("/api/bookings");
  if (!res.ok) throw new Error("Failed to fetch bookings");
  return res.json();
}
