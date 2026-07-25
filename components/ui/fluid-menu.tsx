"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface MenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  showChevron?: boolean;
}

export function Menu({ trigger, children, align = "left", showChevron = true }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="inline-flex cursor-pointer items-center" aria-haspopup="menu" aria-expanded={isOpen}>
        {trigger}
        {showChevron ? <ChevronDown className={`ml-2 size-4 text-white/35 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" /> : null}
      </button>
      {isOpen ? <div className={`absolute ${align === "right" ? "right-0" : "left-0"} z-50 mt-2 w-56 bg-[#19161e] py-1 shadow-[0_16px_40px_rgba(0,0,0,.28)]`} role="menu">{children}</div> : null}
    </div>
  );
}

interface MenuItemProps {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
  label?: string;
}

export function MenuItem({ children, onClick, disabled = false, icon, isActive = false, label }: MenuItemProps) {
  return (
    <button
      type="button"
      className={`group relative grid size-full place-items-center text-center transition-colors ${disabled ? "cursor-not-allowed text-white/20" : "text-white/48 hover:text-violet-200"} ${isActive ? "bg-violet-500 text-white" : ""}`}
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <span className="grid size-6 place-items-center transition-transform duration-200 group-hover:scale-105">{icon}{children}</span>
    </button>
  );
}

interface MenuContainerProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left";
  label?: string;
  appearance?: "brand" | "quiet";
}

export function MenuContainer({ children, direction = "down", label = "Menu de atalhos", appearance = "brand" }: MenuContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const childrenArray = React.Children.toArray(children);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsExpanded(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsExpanded(false);
    }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const offsetDirection = direction === "up" ? -1 : 1;

  return (
    <div ref={rootRef} className="relative size-14" data-expanded={isExpanded} role="menu" aria-label={label}>
      <div className="relative">
        <div className={`relative z-50 size-14 cursor-pointer rounded-full transition-colors ${appearance === "quiet" && !isExpanded ? "bg-transparent hover:bg-white/[0.035]" : "bg-[#7146dc]"}`} onClick={() => setIsExpanded((expanded) => !expanded)}>
          {childrenArray[0]}
        </div>
        {childrenArray.slice(1).map((child, index) => (
          <div
            key={index}
            className="absolute left-0 top-0 size-14 rounded-full bg-[#1b1720] will-change-transform"
            onClick={() => setIsExpanded(false)}
            style={{
              transform: direction === "left"
                ? `translateX(${isExpanded ? -(index + 1) * 44 : 0}px)`
                : `translateY(${isExpanded ? offsetDirection * (index + 1) * 44 : 0}px)`,
              opacity: isExpanded ? 1 : 0,
              pointerEvents: isExpanded ? "auto" : "none",
              zIndex: 40 - index,
              transition: `transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${isExpanded ? "250ms" : "180ms"}`,
              backfaceVisibility: "hidden",
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
