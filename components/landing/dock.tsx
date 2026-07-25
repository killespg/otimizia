"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { Clock, Filter, LayoutGrid, User } from "lucide-react";
import { cn } from "@/lib/utils";

type DockItem = {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
};

const items: DockItem[] = [
  { label: "Dashboard", icon: LayoutGrid, iconBg: "var(--od-accent-tint)", iconColor: "var(--od-accent)" },
  { label: "Contatos", icon: User, iconBg: "var(--od-muted-surface)", iconColor: "var(--od-text-2)" },
  { label: "Funil", icon: Filter, iconBg: "var(--od-muted-surface)", iconColor: "var(--od-text-2)" },
  { label: "Lembretes", icon: Clock, iconBg: "var(--od-muted-surface)", iconColor: "var(--od-text-2)" },
];

function DockIcon({ item, mouseX }: { item: DockItem; mouseX: MotionValue<number> }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const Icon = item.icon;

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return Infinity;
    return val - (bounds.left + bounds.width / 2);
  });

  const sizeTransform = useTransform(distance, [-120, 0, 120], [44, 60, 44]);
  const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 200, damping: 14 });
  const liftTransform = useTransform(distance, [-120, 0, 120], [0, -8, 0]);
  const lift = useSpring(liftTransform, { mass: 0.1, stiffness: 200, damping: 14 });

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div
        ref={ref}
        style={{ width: size, height: size, y: lift, background: item.iconBg }}
        className="flex items-center justify-center rounded-xl"
      >
        <Icon className="size-5" strokeWidth={2} style={{ color: item.iconColor }} />
      </motion.div>
      <span className="text-[10px] text-od-text-3">{item.label}</span>
    </div>
  );
}

/** macOS-style magnifying dock: hover scales the nearest icon and its neighbors. */
export function Dock({ className }: { className?: string }) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className={cn("flex justify-center rounded-xl bg-od-muted-surface p-8", className)}>
      <div
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end gap-2.5 rounded-[20px] border border-od-border bg-od-surface px-3.5 py-2.5 shadow-od-card-hover"
      >
        {items.map((item) => (
          <DockIcon key={item.label} item={item} mouseX={mouseX} />
        ))}
      </div>
    </div>
  );
}
