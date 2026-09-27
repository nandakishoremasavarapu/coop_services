import React from "react";
import {
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  Sparkles,
  Leaf,
  Car,
  Wrench,
  Home,
  Heart,
  Building2,
  Wind,
  WashingMachine,
  Truck,
  Shield,
  Scissors,
  Bug,
  Square,
  CarFront,
  BookOpen,
  Tractor,
  Flame,
  Monitor,
  Trash2,
  type LucideIcon,
} from "lucide-react";

/** Unified service-category icon system (Lucide). */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  "Electrical Services": Zap,
  "Plumbing Services": Droplets,
  "Carpentry Services": Hammer,
  "Painting Services": Paintbrush,
  "Cleaning Services": Sparkles,
  "Gardening & Landscaping": Leaf,
  "Driver Services": Car,
  "Technical & Appliance Services": Wrench,
  "Domestic Help Services": Home,
  "Caregiving Services": Heart,
  "Masonry & Construction": Building2,
  "AC & Cooling Services": Wind,
  "Laundry & Dry Cleaning": WashingMachine,
  "Moving & Shifting": Truck,
  "Security Services": Shield,
  "Beauty & Personal Care": Scissors,
  "Pest Control Services": Bug,
  "Home Maintenance": Wrench,
  "Vehicle Services": CarFront,
  "Education & Tutoring": BookOpen,
  "Agricultural & Farm Services": Tractor,
  "Glass & Aluminium Services": Square,
  "Welding & Fabrication": Flame,
  "Computer & Digital Services": Monitor,
  "Sanitation & Waste Management": Trash2,
};

export function getServiceIconComponent(name: string): LucideIcon {
  return SERVICE_ICONS[name] ?? Wrench;
}

interface ServiceIconProps {
  category?: string | null;
  className?: string;
  size?: number;
}

/** Renders the Lucide icon for a service category name. */
export function ServiceIcon({ category, className, size = 20 }: ServiceIconProps) {
  const Icon = getServiceIconComponent(category ?? "");
  return React.createElement(Icon, { className, size, "aria-hidden": true });
}
