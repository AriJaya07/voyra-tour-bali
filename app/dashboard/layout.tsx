import DashboardThemeProvider from "@/components/Dashboard/ThemeProvider";
import Sidebar from "@/components/Dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardThemeProvider>
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </DashboardThemeProvider>
  );
}
