import { AuthProvider } from "@/components/Providers";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
