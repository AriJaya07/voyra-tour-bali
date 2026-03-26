interface StatCardProps {
  value: string;
  label: string;
  icon: string;
}

export default function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow">
      <span className="text-3xl mb-2 block">{icon}</span>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
