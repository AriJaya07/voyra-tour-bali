"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HiSparkles } from "react-icons/hi2";
import {
  useFamilySeats,
  useInviteFamilySeatMutation,
  useRevokeFamilySeatMutation,
} from "@/utils/hooks/useAiWallet";

/**
 * Founder-only panel shown on /profile/ai. Lists existing seats, lets the
 * owner invite by email or revoke. Hidden when GET returns 402 FEATURE_LOCKED.
 */
export default function FamilySeatsPanel() {
  const seatsQ = useFamilySeats(true);
  const inviteMut = useInviteFamilySeatMutation();
  const revokeMut = useRevokeFamilySeatMutation();
  const [inviteEmail, setInviteEmail] = useState("");

  // 402 / 401 → not a Founder, hide the whole panel.
  if (seatsQ.error) return null;
  if (seatsQ.isLoading) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
      </section>
    );
  }

  const data = seatsQ.data;
  if (!data || data.maxSeats <= 0) return null;

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    try {
      const res = await inviteMut.mutateAsync(email);
      toast.success(
        res.autoAccepted
          ? `${email} now has access — already a Voyra user.`
          : `Invite sent to ${email}.`
      );
      setInviteEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    }
  }

  async function onRevoke(id: number, label: string | null) {
    if (!window.confirm(`Revoke seat for ${label ?? "this user"}?`)) return;
    try {
      await revokeMut.mutateAsync(id);
      toast.success("Seat revoked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed");
    }
  }

  const remaining = data.maxSeats - data.used;

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
            <HiSparkles className="h-3 w-3" /> Founder
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-900">Family seats</h2>
          <p className="mt-1 text-xs text-slate-600">
            {data.used} of {data.maxSeats} used · {remaining} remaining
          </p>
        </div>
      </div>

      {data.seats.length > 0 ? (
        <ul className="mt-4 divide-y divide-amber-100 rounded-xl border border-amber-100 bg-white">
          {data.seats.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">
                  {s.memberName ?? s.memberEmail ?? "Pending"}
                </div>
                <div className="text-xs text-slate-500">
                  {s.memberEmail ?? s.inviteEmail}
                  {!s.accepted ? " · awaiting accept" : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRevoke(s.id, s.memberName ?? s.memberEmail)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {remaining > 0 ? (
        <form onSubmit={onInvite} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="someone@example.com"
            className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={inviteMut.isPending}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {inviteMut.isPending ? "Inviting…" : "Invite seat"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          All seats used. Revoke an existing seat to free a slot.
        </p>
      )}
    </section>
  );
}
