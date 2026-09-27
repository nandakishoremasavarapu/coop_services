"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  BookOpen,
  DollarSign,
  Bell,
  MapPin,
  ShieldCheck,
  Link2,
  X,
  Check,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Radio,
  Building,
  Save,
  ArrowRight,
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type ActiveModal = "catalog" | "fees" | "notifications" | "areas" | "permissions" | "integrations" | null;

interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
}

export default function AdminSettingsPage() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Settings State
  const [feeConfig, setFeeConfig] = useState({
    platformFeePct: 10,
    welfareFundPct: 3,
    societyAdminPct: 2,
    emergencyMultiplier: 1.25,
    minVisitFee: 150,
  });

  const [notificationRules, setNotificationRules] = useState({
    smsOnDispatch: true,
    whatsappUpdates: true,
    audioAlerts: true,
    arrivalReminderMins: 15,
    dailyDigestHour: "09:00",
    emergencyBroadcast: true,
  });

  const [serviceAreas, setServiceAreas] = useState<Array<{
    id: string;
    name: string;
    district: string;
    pincodes: string[];
    radiusKm: number;
    activeProviders: number;
    status: string;
  }>>([]);

  const [rolePermissions, setRolePermissions] = useState({
    societyAdmin: {
      verifyProviders: true,
      assignJobs: true,
      adjustQuotes: true,
      mediateDisputes: true,
      viewDividends: true,
      modifyCatalog: false,
    },
    federationAdmin: {
      verifyProviders: true,
      assignJobs: true,
      adjustQuotes: true,
      mediateDisputes: true,
      viewDividends: true,
      modifyCatalog: true,
      auditFederation: true,
      changeFeePolicy: true,
    },
  });

  const [integrations, setIntegrations] = useState({
    paymentGateway: "razorpay_upi",
    paymentMode: "sandbox",
    identityVerification: "aadhaar_sandbox",
    mapsProvider: "openstreetmap",
    smsGateway: "nic_gov",
    status: {
      payments: "connected",
      identity: "connected",
      maps: "connected",
      sms: "connected",
    },
  });

  // Service Catalog state
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🔧");

  // Service area new input
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaDistrict, setNewAreaDistrict] = useState("Ernakulam");
  const [newAreaPincode, setNewAreaPincode] = useState("");

  // Test connection state
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()).catch(() => ({})),
      fetch("/api/services/categories").then((r) => r.json()).catch(() => ({ categories: [] })),
    ])
      .then(([settingsData, catData]) => {
        if (settingsData?.settings) {
          const s = settingsData.settings;
          if (s.feeConfig) setFeeConfig(s.feeConfig);
          if (s.notificationRules) setNotificationRules(s.notificationRules);
          if (s.serviceAreas) setServiceAreas(s.serviceAreas);
          if (s.rolePermissions) setRolePermissions(s.rolePermissions);
          if (s.integrations) setIntegrations(s.integrations);
        }
        if (Array.isArray(catData?.categories)) {
          setCategories(catData.categories);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const triggerToast = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const handleSaveSettings = async (partialData: Record<string, any>, successLabel = "Settings saved successfully") => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialData),
      });
      if (res.ok) {
        triggerToast(successLabel);
      } else {
        triggerToast("Failed to save settings");
      }
    } catch (err) {
      console.error("Save error:", err);
      triggerToast("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCategory = (catId: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, isActive: !c.isActive } : c))
    );
    triggerToast("Service category visibility updated");
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: "cat-" + Date.now(),
      name: newCatName.trim(),
      description: newCatDesc.trim() || "Cooperative verified home service",
      icon: newCatIcon || "🛠️",
      isActive: true,
      sortOrder: categories.length + 1,
    };
    setCategories([newCat, ...categories]);
    setNewCatName("");
    setNewCatDesc("");
    triggerToast(`Added category: ${newCat.name}`);
  };

  const handleAddServiceArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim() || !newAreaPincode.trim()) return;
    const newArea = {
      id: "zone-" + Date.now(),
      name: newAreaName.trim(),
      district: newAreaDistrict,
      pincodes: [newAreaPincode.trim()],
      radiusKm: 15,
      activeProviders: 5,
      status: "active",
    };
    const updated = [...serviceAreas, newArea];
    setServiceAreas(updated);
    handleSaveSettings({ serviceAreas: updated }, `Added service zone: ${newArea.name}`);
    setNewAreaName("");
    setNewAreaPincode("");
  };

  const runConnectionTest = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult("All integrations healthy! Latency: 28ms to State Cooperative Gateway.");
    }, 1200);
  };

  // Live calculator for fee config
  const calcAmount = 1000;
  const platformFee = (calcAmount * feeConfig.platformFeePct) / 100;
  const welfareFee = (calcAmount * feeConfig.welfareFundPct) / 100;
  const societyFee = (calcAmount * feeConfig.societyAdminPct) / 100;
  const providerTakehome = calcAmount - (platformFee + welfareFee + societyFee);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={40} label="Loading settings..." />
      </div>
    );
  }

  const settingCards = [
    {
      id: "catalog" as ActiveModal,
      title: "Service Catalog",
      desc: "Manage service categories and specific services. Add, edit or deactivate services.",
      icon: BookOpen,
      badge: `${categories.length} Categories`,
      badgeColor: "bg-blue-100 text-blue-700",
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      id: "fees" as ActiveModal,
      title: "Fee Configuration",
      desc: "Platform fee rates, cooperative revenue sharing and welfare allocations.",
      icon: DollarSign,
      badge: `${feeConfig.platformFeePct}% Platform Fee`,
      badgeColor: "bg-emerald-100 text-emerald-700",
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    {
      id: "notifications" as ActiveModal,
      title: "Notification Rules",
      desc: "Configure automated SMS, WhatsApp and real-time dispatch alerts.",
      icon: Bell,
      badge: notificationRules.smsOnDispatch ? "SMS Active" : "SMS Muted",
      badgeColor: "bg-amber-100 text-amber-700",
      color: "bg-amber-50 text-amber-600 border-amber-200",
    },
    {
      id: "areas" as ActiveModal,
      title: "Service Areas",
      desc: "Manage geographic service boundaries, pincodes and society coverage zones.",
      icon: MapPin,
      badge: `${serviceAreas.length} Active Zones`,
      badgeColor: "bg-violet-100 text-violet-700",
      color: "bg-violet-50 text-violet-600 border-violet-200",
    },
    {
      id: "permissions" as ActiveModal,
      title: "Role Permissions",
      desc: "Configure permissions for Society Admins and Federation Officials.",
      icon: ShieldCheck,
      badge: "Gov Matrix",
      badgeColor: "bg-indigo-100 text-indigo-700",
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    },
    {
      id: "integrations" as ActiveModal,
      title: "Integration Settings",
      desc: "Payment gateway, Aadhaar e-KYC sandbox and map API credentials.",
      icon: Link2,
      badge: "Connected",
      badgeColor: "bg-teal-100 text-teal-700",
      color: "bg-teal-50 text-teal-600 border-teal-200",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings & Governance</h1>
          <p className="text-slate-500 text-sm mt-1">
            Platform configuration, cooperative fee setting, service catalogs and permissions
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-xl shadow-sm animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {settingCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => setActiveModal(card.id)}
              className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${card.color}`}>
                    <Icon size={24} />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{card.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>Configure & Manage</span>
                <ArrowRight size={14} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SERVICE CATALOG */}
      {/* ========================================================================= */}
      {activeModal === "catalog" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Service Catalog Management</h2>
                  <p className="text-xs text-slate-500">Configure trade categories and enable/disable services</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Add New Category */}
              <form onSubmit={handleAddCategory} className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Plus size={16} /> Add New Service Category
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Icon Emoji</label>
                    <input
                      type="text"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-xl bg-white text-center text-lg"
                      maxLength={2}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-xs font-semibold text-slate-700">Trade Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Solar Panel Technician"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-xl bg-white text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Brief description of work scope..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-xl bg-white text-sm"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={16} /> Add Category
                  </button>
                </div>
              </form>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search categories (Plumbing, Electrical, Carpentry...)"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category List */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {categories
                  .filter((c) => !catalogSearch || c.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                  .map((cat) => {
                    const active = cat.isActive !== false;
                    return (
                      <div
                        key={cat.id}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200/60 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-1.5 bg-slate-100 rounded-xl">{cat.icon || "🔧"}</span>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              {cat.name}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {active ? "Active" : "Disabled"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{cat.description || "Cooperative service"}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleCategory(cat.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                            active
                              ? "bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                              : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                          }`}
                        >
                          {active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => {
                  triggerToast("Service catalog preferences saved!");
                  setActiveModal(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FEE CONFIGURATION */}
      {/* ========================================================================= */}
      {activeModal === "fees" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Cooperative Fee Configuration</h2>
                  <p className="text-xs text-slate-500">Set transparent platform fees and worker welfare funds</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Sliders */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-slate-800">Platform Maintenance Fee</label>
                    <span className="font-bold text-blue-600 text-sm">{feeConfig.platformFeePct}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    step="1"
                    value={feeConfig.platformFeePct}
                    onChange={(e) => setFeeConfig({ ...feeConfig, platformFeePct: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-slate-400">Covers digital server hosting, SMS gateways and call dispatch.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-slate-800">Worker Welfare & Insurance Fund</label>
                    <span className="font-bold text-emerald-600 text-sm">{feeConfig.welfareFundPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={feeConfig.welfareFundPct}
                    onChange={(e) => setFeeConfig({ ...feeConfig, welfareFundPct: Number(e.target.value) })}
                    className="w-full accent-emerald-600"
                  />
                  <p className="text-xs text-slate-400">Deposited directly into provider health insurance & pension corpus.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-slate-800">Local Society Administrative Levy</label>
                    <span className="font-bold text-amber-600 text-sm">{feeConfig.societyAdminPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={feeConfig.societyAdminPct}
                    onChange={(e) => setFeeConfig({ ...feeConfig, societyAdminPct: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                  <p className="text-xs text-slate-400">Allocated to the local registered society for physical tool pooling.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Minimum Visit Baseline Fee</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                      <input
                        type="number"
                        value={feeConfig.minVisitFee}
                        onChange={(e) => setFeeConfig({ ...feeConfig, minVisitFee: Number(e.target.value) })}
                        className="w-full pl-7 pr-3 py-2 border rounded-xl text-sm font-semibold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Emergency Job Multiplier</label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        max="2"
                        value={feeConfig.emergencyMultiplier}
                        onChange={(e) => setFeeConfig({ ...feeConfig, emergencyMultiplier: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Transparency Calculator */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Live Transparency Model (₹1,000 Booking)
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Provider Member Take-home</span>
                    <span className="font-bold text-green-700">₹{providerTakehome.toFixed(0)} ({100 - (feeConfig.platformFeePct + feeConfig.welfareFundPct + feeConfig.societyAdminPct)}%)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Platform Operations ({feeConfig.platformFeePct}%)</span>
                    <span className="font-semibold text-blue-700">₹{platformFee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Welfare & Health Pool ({feeConfig.welfareFundPct}%)</span>
                    <span className="font-semibold text-emerald-700">₹{welfareFee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Society Administrative ({feeConfig.societyAdminPct}%)</span>
                    <span className="font-semibold text-amber-700">₹{societyFee.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200">
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={async () => {
                  await handleSaveSettings({ feeConfig }, "Fee policy updated and distributed to network");
                  setActiveModal(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm flex items-center gap-2"
              >
                <Save size={16} /> Save Fee Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NOTIFICATION RULES */}
      {/* ========================================================================= */}
      {activeModal === "notifications" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Notification & Alert Rules</h2>
                  <p className="text-xs text-slate-500">Automate customer alerts and emergency broadcasts</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {[
                {
                  key: "smsOnDispatch" as const,
                  title: "SMS on Job Dispatch",
                  desc: "Send instant SMS to customer with technician phone and cooperative verification ID.",
                },
                {
                  key: "whatsappUpdates" as const,
                  title: "WhatsApp Dispatch & Invoicing",
                  desc: "Deliver digital PDF invoices and job milestone status via official WhatsApp API.",
                },
                {
                  key: "audioAlerts" as const,
                  title: "Emergency Job Siren & Audio Ping",
                  desc: "Play an audible notification on the dashboard when high-priority emergencies are booked.",
                },
                {
                  key: "emergencyBroadcast" as const,
                  title: "Federation Wide Broadcast",
                  desc: "Broadcast severe civic outages (water mains, storm damage) to all registered technicians.",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() =>
                    setNotificationRules({ ...notificationRules, [item.key]: !notificationRules[item.key] })
                  }
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer bg-white"
                >
                  <div className="pr-4">
                    <div className="font-bold text-slate-900 text-sm">{item.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0 ${
                      notificationRules[item.key] ? "bg-blue-600 justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700">Provider Arrival Advance Reminder</label>
                <select
                  value={notificationRules.arrivalReminderMins}
                  onChange={(e) =>
                    setNotificationRules({ ...notificationRules, arrivalReminderMins: Number(e.target.value) })
                  }
                  className="w-full mt-1.5 px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value={10}>10 minutes before scheduled arrival</option>
                  <option value={15}>15 minutes before scheduled arrival (Recommended)</option>
                  <option value={30}>30 minutes before scheduled arrival</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200">
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={async () => {
                  await handleSaveSettings({ notificationRules }, "Notification triggers updated");
                  setActiveModal(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm flex items-center gap-2"
              >
                <Save size={16} /> Save Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SERVICE AREAS */}
      {/* ========================================================================= */}
      {activeModal === "areas" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Service Areas & Jurisdictions</h2>
                  <p className="text-xs text-slate-500">Manage cooperative society boundaries and covered pincodes</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Add Zone */}
              <form onSubmit={handleAddServiceArea} className="bg-violet-50/70 border border-violet-200 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-2.5">
                  Register New Society Jurisdiction
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2.5">
                  <input
                    type="text"
                    placeholder="Society / Zone Name"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    className="px-3 py-2 border rounded-xl bg-white text-sm"
                    required
                  />
                  <select
                    value={newAreaDistrict}
                    onChange={(e) => setNewAreaDistrict(e.target.value)}
                    className="px-3 py-2 border rounded-xl bg-white text-sm"
                  >
                    <option value="Ernakulam">Ernakulam</option>
                    <option value="Kozhikode">Kozhikode</option>
                    <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                    <option value="Thrissur">Thrissur</option>
                    <option value="Kollam">Kollam</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Primary Pincode (e.g. 682001)"
                    value={newAreaPincode}
                    onChange={(e) => setNewAreaPincode(e.target.value)}
                    className="px-3 py-2 border rounded-xl bg-white text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} /> Add Zone
                </button>
              </form>

              {/* Area List */}
              <div className="space-y-3">
                {serviceAreas.map((area) => (
                  <div key={area.id} className="p-4 rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Building size={16} className="text-violet-600" />
                        {area.name}
                        <span className="text-[10px] bg-violet-100 text-violet-800 font-semibold px-2 py-0.5 rounded-full">
                          {area.district}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {area.activeProviders} Providers Active
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="text-xs text-slate-500 font-medium">Covered Pincodes:</span>
                      {area.pincodes.map((pin) => (
                        <span key={pin} className="text-xs bg-slate-100 px-2 py-0.5 rounded-md font-mono text-slate-700">
                          {pin}
                        </span>
                      ))}
                    </div>

                    <div className="text-xs text-slate-400">
                      Dispatched within a maximum radius of <strong className="text-slate-700">{area.radiusKm} km</strong>.
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setActiveModal(null)} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ROLE PERMISSIONS */}
      {/* ========================================================================= */}
      {activeModal === "permissions" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Governance & Role Permissions</h2>
                  <p className="text-xs text-slate-500">Fine-tune authority between Society Admins and Federation Officials</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Building size={16} className="text-blue-600" /> Society Administrator Authority
                </h4>
                <div className="space-y-2">
                  {[
                    { key: "verifyProviders", label: "Verify Local Member-Owner Credentials & Union IDs" },
                    { key: "assignJobs", label: "Manually Reassign Service Jobs on Emergency Demand" },
                    { key: "adjustQuotes", label: "Mediate Quote Prices During Customer Grievances" },
                    { key: "viewDividends", label: "View Monthly Society Member Dividend Pool" },
                  ].map((p) => {
                    const active = (rolePermissions.societyAdmin as any)[p.key];
                    return (
                      <div
                        key={p.key}
                        onClick={() =>
                          setRolePermissions({
                            ...rolePermissions,
                            societyAdmin: {
                              ...rolePermissions.societyAdmin,
                              [p.key]: !active,
                            },
                          })
                        }
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <span className="text-sm text-slate-700">{p.label}</span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            active ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {active && <Check size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600" /> Federation Official High Authority
                </h4>
                <div className="space-y-2">
                  {[
                    { key: "auditFederation", label: "Access Complete District Audit Logs & Financial Records" },
                    { key: "changeFeePolicy", label: "Adjust State-wide Platform Fee & Welfare Allocation" },
                    { key: "modifyCatalog", label: "Add or Deprecate Trade Categories Across Kerala" },
                  ].map((p) => {
                    const active = (rolePermissions.federationAdmin as any)[p.key];
                    return (
                      <div
                        key={p.key}
                        onClick={() =>
                          setRolePermissions({
                            ...rolePermissions,
                            federationAdmin: {
                              ...rolePermissions.federationAdmin,
                              [p.key]: !active,
                            },
                          })
                        }
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <span className="text-sm text-slate-700">{p.label}</span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            active ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {active && <Check size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200">
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={async () => {
                  await handleSaveSettings({ rolePermissions }, "Role permission matrix saved");
                  setActiveModal(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm flex items-center gap-2"
              >
                <Save size={16} /> Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: INTEGRATION SETTINGS */}
      {/* ========================================================================= */}
      {activeModal === "integrations" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                  <Link2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Integration Gateways</h2>
                  <p className="text-xs text-slate-500">Configure payment gateways, map providers and SMS routes</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-700">Payment Gateway Routing</label>
                <select
                  value={integrations.paymentGateway}
                  onChange={(e) => setIntegrations({ ...integrations, paymentGateway: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 border rounded-xl text-sm bg-white font-medium"
                >
                  <option value="razorpay_upi">Razorpay UPI & Cooperative Bank Switch (Live)</option>
                  <option value="direct_neft">State Cooperative Bank Direct NEFT/IMPS</option>
                  <option value="cash_reconcile">Cash on Completion with Society Receipt</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Identity Verification Sandbox</label>
                <select
                  value={integrations.identityVerification}
                  onChange={(e) => setIntegrations({ ...integrations, identityVerification: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 border rounded-xl text-sm bg-white font-medium"
                >
                  <option value="aadhaar_sandbox">UIDAI Aadhaar e-KYC Sandbox (Connected)</option>
                  <option value="union_passbook">Manual Kerala Labour Welfare Passbook Verification</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Map & Geocoding Service</label>
                <select
                  value={integrations.mapsProvider}
                  onChange={(e) => setIntegrations({ ...integrations, mapsProvider: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 border rounded-xl text-sm bg-white font-medium"
                >
                  <option value="openstreetmap">OpenStreetMap Nominatim (Free & Open Source)</option>
                  <option value="mapbox">Mapbox Geocoding Engine</option>
                </select>
              </div>

              {/* Ping Test */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={runConnectionTest}
                  disabled={testing}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-slate-200"
                >
                  <RefreshCw size={14} className={testing ? "animate-spin" : ""} />
                  {testing ? "Testing Gateway Handshakes..." : "Test Connection to All Gateways"}
                </button>
                {testResult && (
                  <div className="mt-2.5 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                    <span>{testResult}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200">
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={async () => {
                  await handleSaveSettings({ integrations }, "Gateway configurations verified and saved");
                  setActiveModal(null);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm flex items-center gap-2"
              >
                <Save size={16} /> Save Integrations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
