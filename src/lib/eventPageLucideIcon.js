import {
  Clock,
  Heart,
  Users,
  MessageCircle,
  LineChart,
  Layers,
  Gift,
} from "lucide-react";

const MAP = {
  Clock,
  Heart,
  Users,
  MessageCircle,
  LineChart,
  Layers,
  Gift,
};

export function getEventPageLucideIcon(key) {
  return MAP[key] || LineChart;
}

export const EVENT_PAGE_ICON_KEYS = Object.keys(MAP);
