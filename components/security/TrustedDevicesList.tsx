"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface Device {
  id: number;
  label: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function TrustedDevicesList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/trusted-devices", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (id?: number) => {
    if (!id && !confirm("Revoke all trusted devices? Each will need 2FA on next sign-in.")) return;
    const res = await fetch("/api/auth/2fa/trusted-devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
    if (res.ok) {
      toast.success(id ? "Device revoked" : "All devices revoked");
      void load();
    } else {
      toast.error("Could not revoke");
    }
  };

  if (loading) {
    return <p className="text-xs text-gray-500">Loading devices…</p>;
  }
  if (!devices.length) {
    return <p className="text-xs text-gray-500">No trusted devices yet.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {devices.map((d) => (
          <li key={d.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-bold text-gray-900">{d.label || "Trusted device"}</p>
              <p className="text-[11px] text-gray-500">
                Last used {fmt(d.lastUsedAt)} · expires {fmt(d.expiresAt)}
              </p>
            </div>
            <button
              onClick={() => revoke(d.id)}
              className="px-3 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded transition"
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => revoke()}
        className="mt-3 w-full px-3 py-2 text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition"
      >
        Revoke all
      </button>
    </div>
  );
}
