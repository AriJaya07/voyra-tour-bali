"use client";

import { toast } from "sonner";

interface Props {
  codes: string[];
  onConfirm?: () => void;
  confirmLabel?: string;
}

export default function BackupCodesPanel({ codes, onConfirm, confirmLabel = "I've saved them" }: Props) {
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Backup codes copied");
    } catch {
      toast("Long-press to copy", { duration: 6000 });
    }
  };

  const download = () => {
    const blob = new Blob(
      [
        "Voyra Backup Codes\n==================\n",
        "Each code is single-use. Keep them somewhere safe.\n\n",
        codes.join("\n"),
        `\n\nGenerated: ${new Date().toISOString()}\n`,
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voyra-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 mb-3 text-xs">
        <strong>Important:</strong> Save these codes now. You won&apos;t see them again. Each code works once and lets you sign in if you lose access to your authenticator.
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-gray-50 border border-gray-200 rounded-xl p-4">
        {codes.map((c) => (
          <div key={c} className="text-center tracking-widest text-gray-900">
            {c}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={copyAll}
          className="flex-1 px-3 py-2 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg transition"
        >
          Copy all
        </button>
        <button
          onClick={download}
          className="flex-1 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          Download .txt
        </button>
      </div>
      {onConfirm ? (
        <button
          onClick={onConfirm}
          className="block w-full mt-4 px-4 py-3 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-xl transition"
        >
          {confirmLabel}
        </button>
      ) : null}
    </div>
  );
}
