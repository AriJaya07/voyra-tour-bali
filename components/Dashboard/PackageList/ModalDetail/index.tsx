import CloseIcon from "@/components/assets/dashboard/CloseIcon";
import { Package } from "@/utils/service/package.service";

export function PackageViewModal({
    pkg,
    onClose,
    onEdit,
  }: {
    pkg: Package;
    onClose: () => void;
    onEdit: () => void;
  }) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-0.5">Package</p>
            <h2 className="text-xl font-bold text-white">{pkg.title}</h2>
            <p className="text-violet-200 text-sm mt-1">
              ${Number(pkg.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <CloseIcon />
          </button>
        </div>
  
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-slate-700 text-sm leading-relaxed">{pkg.description}</p>
          </div>
  
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-violet-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Category</p>
              <p className="text-sm font-bold text-violet-700">{pkg.category?.name ?? "—"}</p>
            </div>
            <div className="bg-sky-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">Destination</p>
              <p className="text-sm font-bold text-sky-700">{pkg.destination?.title ?? "—"}</p>
            </div>
          </div>
  
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Price</p>
            <p className="text-2xl font-bold text-emerald-700">
              ${Number(pkg.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
  
          <p className="text-xs text-slate-400">
            Created {new Date(pkg.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
  
        <div className="flex justify-end px-6 pb-6">
          <button onClick={onEdit} className="py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-sm font-medium transition-colors w-[150px]">
            Edit
          </button>
        </div>
      </div>
    );
  }