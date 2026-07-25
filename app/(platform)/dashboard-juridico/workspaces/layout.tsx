import { PlatformShell } from "@/components/platform/platform-shell";

export default function WorkspacesLayout({ children }: { children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
