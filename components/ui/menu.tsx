"use client";

import * as React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  isSeparator?: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

interface UserProfileSidebarProps {
  user: UserProfile;
  navItems: NavItem[];
  logoutItem: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const sidebarVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.055 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 120, damping: 18 } },
};

export const UserProfileSidebar = React.forwardRef<HTMLDivElement, UserProfileSidebarProps>(
  ({ user, navItems, logoutItem, className }, ref) => (
    <motion.aside
      ref={ref}
      className={cn("flex h-full w-full flex-col text-white", className)}
      initial="hidden"
      animate="visible"
      variants={sidebarVariants}
      aria-label="Menu da conta"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-3 pb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatarUrl} alt={`Foto de ${user.name}`} className="size-10 rounded-full object-cover grayscale-[20%]" />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-white/72">{user.name}</span>
          <span className="mt-1 block truncate text-[9px] text-white/28">{user.email}</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="border-t border-white/[0.07]" />

      <nav className="flex-1 py-4" aria-label="Seções da conta">
        {navItems.map((item) => (
          <React.Fragment key={item.label}>
            {item.isSeparator ? <motion.div variants={itemVariants} className="h-4" /> : null}
            <motion.div variants={itemVariants}>
              <Link href={item.href} className="group flex min-h-10 items-center border-l border-transparent px-3 text-[11px] font-medium text-white/36 transition-colors hover:border-violet-400 hover:bg-white/[0.02] hover:text-white/70">
                <span className="mr-3 grid size-4 place-items-center text-white/26 group-hover:text-violet-300/75">{item.icon}</span>
                <span>{item.label}</span>
                <ChevronRight className="ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-60" />
              </Link>
            </motion.div>
          </React.Fragment>
        ))}
      </nav>

      <motion.div variants={itemVariants} className="border-t border-white/[0.07] pt-3">
        <button type="button" onClick={logoutItem.onClick} className="group flex min-h-10 w-full items-center px-3 text-[11px] font-medium text-white/34 transition-colors hover:text-white/68">
          <span className="mr-3 grid size-4 place-items-center text-white/25 group-hover:text-violet-300/70">{logoutItem.icon}</span>
          <span>{logoutItem.label}</span>
        </button>
      </motion.div>
    </motion.aside>
  )
);

UserProfileSidebar.displayName = "UserProfileSidebar";
