import CloseIcon from "@/components/assets/dashboard/CloseIcon";

export function DestinationDetailModal({
    destination,
    onClose,
    onEdit,
  }: {
    destination: { id: string; title: string; description: string; price: number | string; categoryId: string | number };
    onClose: () => void;
    onEdit: () => void;
  }) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">Destination</p>
              <h2 className="text-xl font-bold text-white">{destination.title}</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors mt-0.5">
             <CloseIcon />
            </button>
          </div>
        </div>
  
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-slate-700 text-sm leading-relaxed">{destination.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Price</p>
              <p className="text-lg font-bold text-slate-900">
                ${Number(destination.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category ID</p>
              <p className="text-lg font-bold text-slate-900">{destination.categoryId}</p>
            </div>
          </div>
        </div>
  
        <div className="flex justify-end px-6 pb-6">
          <button onClick={onEdit} className="py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors w-[150px]">
            Edit
          </button>
        </div>
      </div>
    );
  }