"use client";

import EyesIcon from "@/components/assets/dashboard/EyesIcon";
import LocationIcon from "@/components/assets/dashboard/LocationIcon";
import PencilIcon from "@/components/assets/dashboard/PencilIcon";
import TrashIcon from "@/components/assets/dashboard/TrashIcon";
import { ActionButton } from "@/components/common/InputForm";
import { Destination } from "@/utils/service/destination.service";


interface DestinationTableProps {
  destinations: Destination[];
  onView: (destination: Destination) => void;
  onEdit: (destination: Destination) => void;
  onDelete: (id: string) => void;
}

export default function DestinationTable({
  destinations,
  onView,
  onEdit,
  onDelete,
}: DestinationTableProps) {
  if (destinations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
         <LocationIcon />
        </div>
        <p className="text-slate-600 font-semibold text-base">No destinations yet</p>
        <p className="text-slate-400 text-sm mt-1">Click "Add Destination" to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      <div className="grid grid-cols-[2fr_3fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
        {["Title", "Description", "Price", "Category", "Actions"].map((h) => (
          <p key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {h}
          </p>
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-slate-100">
        {destinations.map((dest) => (
          <div
            key={dest.id}
            className="grid grid-cols-[2fr_3fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {dest.title.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="font-semibold text-slate-800 text-sm truncate">{dest.title}</span>
            </div>

            <p className="text-slate-500 text-sm truncate">{dest.description}</p>

            <span className="text-sm font-semibold text-slate-800">
              ${Number(dest.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium w-fit">
              #{dest.categoryId}
            </span>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionButton
                onClick={() => onView(dest)}
                title="View"
                color="text-slate-500 hover:bg-slate-100"
                icon={
                  <EyesIcon />
                }
              />
              <ActionButton
                onClick={() => onEdit(dest)}
                title="Edit"
                color="text-blue-500 hover:bg-blue-50"
                icon={
                  <PencilIcon />
                }
              />
              <ActionButton
                onClick={() => onDelete(dest.id)}
                title="Delete"
                color="text-red-400 hover:bg-red-50"
                icon={
                  <TrashIcon />
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-600">{destinations.length}</span> destination{destinations.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}