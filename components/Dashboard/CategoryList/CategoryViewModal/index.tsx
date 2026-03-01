import CloseIcon from "@/components/assets/dashboard/CloseIcon";
import { Category } from "@/utils/service/category.service";

export function CategoryViewModal({
    category,
    onClose,
    onEdit,
  }: {
    category: Category;
    onClose: () => void;
    onEdit: () => void;
  }) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-widest mb-0.5">Category</p>
            <h2 className="text-xl font-bold text-white">{category.name}</h2>
            <span className="mt-1 inline-block font-mono text-emerald-200 text-xs">/{category.slug}</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors cursor-pointer">
            <CloseIcon />
          </button>
        </div>
  
        <div className="p-6 space-y-4">
          {category.description && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-slate-700 text-sm leading-relaxed">{category.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Destinations</p>
              <p className="text-2xl font-bold text-blue-600">{category._count?.destinations ?? 0}</p>
            </div>
            <div className="bg-violet-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">Packages</p>
              <p className="text-2xl font-bold text-violet-600">{category._count?.packages ?? 0}</p>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Created {new Date(category.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
  
        <div className="flex justify-end px-6 pb-6">
          <button onClick={onEdit} className="py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium transition-colors w-[150px]">
            Edit
          </button>
        </div>
      </div>
    );
  }