export type ModalMode = "create" | "edit" | "view" | null;

export function ActionButton({
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
        {icon}
      </button>
    );
  }

export function Field({
    label,
    error,
    required,
    children,
  }: {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
  }) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {children}
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
  
export function inputClass(hasError: boolean) {
    return `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
      hasError
        ? "border-red-300 bg-red-50 focus:ring-red-400"
        : "border-slate-200 focus:ring-blue-500"
    }`;
  }