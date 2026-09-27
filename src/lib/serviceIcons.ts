export const SERVICE_ICONS: Record<string, string> = {
  "Electrical Services": "⚡",
  "Plumbing Services": "💧",
  "Carpentry Services": "🔨",
  "Painting Services": "🖌️",
  "Cleaning Services": "✨",
  "Gardening & Landscaping": "🌿",
  "Driver Services": "🚗",
  "Technical & Appliance Services": "🔧",
  "Domestic Help Services": "🏠",
  "Caregiving Services": "❤️",
  "Masonry & Construction": "🏗️",
  "AC & Cooling Services": "❄️",
  "Laundry & Dry Cleaning": "👕",
  "Moving & Shifting": "📦",
  "Security Services": "🛡️",
  "Beauty & Personal Care": "💄",
  "Pest Control Services": "🐛",
  "Home Maintenance": "🔩",
  "Vehicle Services": "🚙",
  "Education & Tutoring": "📚",
  "Agricultural & Farm Services": "🌾",
  "Glass & Aluminium Services": "🪟",
  "Welding & Fabrication": "🔥",
  "Computer & Digital Services": "💻",
  "Sanitation & Waste Management": "♻️",
};

export function getServiceIcon(name: string): string {
  return SERVICE_ICONS[name] ?? "🔧";
}

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Electrical Services": { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  "Plumbing Services": { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  "Carpentry Services": { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "Painting Services": { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  "Cleaning Services": { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  "Gardening & Landscaping": { bg: "#dcfce7", text: "#14532d", border: "#86efac" },
  "Driver Services": { bg: "#e0f2fe", text: "#0c4a6e", border: "#7dd3fc" },
  "Technical & Appliance Services": { bg: "#ede9fe", text: "#4c1d95", border: "#c4b5fd" },
  "Domestic Help Services": { bg: "#fef3c7", text: "#78350f", border: "#fcd34d" },
  "Caregiving Services": { bg: "#fee2e2", text: "#7f1d1d", border: "#fca5a5" },
  "Masonry & Construction": { bg: "#f3f4f6", text: "#1f2937", border: "#d1d5db" },
  "AC & Cooling Services": { bg: "#cffafe", text: "#164e63", border: "#67e8f9" },
  "Laundry & Dry Cleaning": { bg: "#fae8ff", text: "#701a75", border: "#e879f9" },
  "Moving & Shifting": { bg: "#fff7ed", text: "#7c2d12", border: "#fdba74" },
  "Security Services": { bg: "#f0fdf4", text: "#14532d", border: "#86efac" },
  "Beauty & Personal Care": { bg: "#fdf2f8", text: "#831843", border: "#f0abfc" },
  "Pest Control Services": { bg: "#fefce8", text: "#713f12", border: "#fde047" },
  "Home Maintenance": { bg: "#f8fafc", text: "#334155", border: "#cbd5e1" },
  "Vehicle Services": { bg: "#e0f2fe", text: "#0c4a6e", border: "#7dd3fc" },
  "Education & Tutoring": { bg: "#ede9fe", text: "#4c1d95", border: "#c4b5fd" },
  "Agricultural & Farm Services": { bg: "#dcfce7", text: "#14532d", border: "#86efac" },
  "Glass & Aluminium Services": { bg: "#f0f9ff", text: "#0c4a6e", border: "#7dd3fc" },
  "Welding & Fabrication": { bg: "#fff7ed", text: "#7c2d12", border: "#fdba74" },
  "Computer & Digital Services": { bg: "#ede9fe", text: "#4c1d95", border: "#c4b5fd" },
  "Sanitation & Waste Management": { bg: "#f0fdf4", text: "#14532d", border: "#86efac" },
};

export function getCategoryColor(name: string) {
  return CATEGORY_COLORS[name] ?? { bg: "#f8fafc", text: "#334155", border: "#cbd5e1" };
}
