import DashboardThemeProvider from "@/components/Dashboard/ThemeProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardThemeProvider>{children}</DashboardThemeProvider>;
}
