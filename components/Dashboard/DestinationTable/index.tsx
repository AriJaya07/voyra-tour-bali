"use client";

interface Destination {
  id: string;
  title: string;
  description: string;
  price: number | string;
  categoryId: string | number;
}

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
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-slate-600 font-semibold text-base">No destinations yet</p>
        <p className="text-slate-400 text-sm mt-1">Click "Add Destination" to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Table Header */}
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
            {/* Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {dest.title.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="font-semibold text-slate-800 text-sm truncate">{dest.title}</span>
            </div>

            {/* Description */}
            <p className="text-slate-500 text-sm truncate">{dest.description}</p>

            {/* Price */}
            <span className="text-sm font-semibold text-slate-800">
              ${Number(dest.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>

            {/* Category */}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium w-fit">
              #{dest.categoryId}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* View */}
              <ActionButton
                onClick={() => onView(dest)}
                title="View"
                color="text-slate-500 hover:bg-slate-100"
                icon={
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                }
              />
              {/* Edit */}
              <ActionButton
                onClick={() => onEdit(dest)}
                title="Edit"
                color="text-blue-500 hover:bg-blue-50"
                icon={
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                }
              />
              {/* Delete */}
              <ActionButton
                onClick={() => onDelete(dest.id)}
                title="Delete"
                color="text-red-400 hover:bg-red-50"
                icon={
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer count */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-600">{destinations.length}</span> destination{destinations.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  title,
  color,
  icon,
}: {
  onClick: () => void;
  title: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${color}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon}
      </svg>
    </button>
  );
}