import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Columns3,
  Download,
  Gauge,
  GripVertical,
  Image as ImageIcon,
  LogOut,
  MessageCircle,
  Mic,
  Paperclip,
  Phone,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  Users,
  WalletCards,
  X,
  Clock3,
  type LucideIcon,
} from "lucide-react";

export type IconProps = { className?: string };

function icon(Component: LucideIcon) {
  return function DesignSystemIcon({ className }: IconProps) {
    return <Component className={className} strokeWidth={1.8} aria-hidden="true" />;
  };
}

export const IconGauge = icon(Gauge);
export const IconColumns = icon(Columns3);
export const IconChartBar = icon(BarChart3);
export const IconUsers = icon(Users);
export const IconBell = icon(Bell);
export const IconPhone = icon(Phone);
export const IconBot = icon(Bot);
export const IconSearch = icon(Search);
export const IconMessage = icon(MessageCircle);
export const IconPaperclip = icon(Paperclip);
export const IconMic = icon(Mic);
export const IconCheck = icon(Check);
export const IconCheckCircle = icon(CheckCircle2);
export const IconClock = icon(Clock3);
export const IconAlert = icon(AlertTriangle);
export const IconWallet = icon(WalletCards);
export const IconArrowRight = icon(ArrowRight);
export const IconArrowUpRight = icon(ArrowUpRight);
export const IconDownload = icon(Download);
export const IconPlus = icon(Plus);
export const IconTrash = icon(Trash2);
export const IconX = icon(X);
export const IconSettings = icon(Settings);
export const IconChevronRight = icon(ChevronRight);
export const IconLogout = icon(LogOut);
export const IconGrip = icon(GripVertical);
export const IconCalendar = icon(CalendarDays);
export const IconBuilding = icon(Building2);
export const IconImage = icon(ImageIcon);

export function IconStar({ className, filled = false }: IconProps & { filled?: boolean }) {
  return <Star className={className} strokeWidth={1.8} fill={filled ? "currentColor" : "none"} aria-hidden="true" />;
}
