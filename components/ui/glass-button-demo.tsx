import { Zap } from "lucide-react";

import { GlassButton } from "@/components/ui/glass-button";

export function GlassButtonDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 p-10">
      <GlassButton size="sm">Small</GlassButton>
      <GlassButton contentClassName="gap-2">
        <span>Generate</span>
        <Zap aria-hidden="true" className="h-5 w-5" />
      </GlassButton>
      <GlassButton size="lg">Submit</GlassButton>
      <GlassButton size="icon" aria-label="Generate">
        <Zap aria-hidden="true" className="h-5 w-5" />
      </GlassButton>
    </div>
  );
}
