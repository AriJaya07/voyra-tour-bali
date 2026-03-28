interface StatCardProps {
  value: string;
  label: string;
  icon: string;
}

export default function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className="p-3 text-center">
      <span className="text-xl mb-2 block">{icon}</span>
      <p className="text-xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
