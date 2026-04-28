import { AuthProvider } from "@/components/Providers";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
