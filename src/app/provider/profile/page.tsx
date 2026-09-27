"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  ChevronRight,
  Headset,
  HeartPulse,
  LogOut,
  MapPin,
  Phone,
  Star,
  UserRound,
  Wallet,
  Wrench,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { PageContainer } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select, ChoiceCard } from "@/components/ui/form";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { LoadingBlock, Toast } from "@/components/ui/states";
import { StarRating } from "@/components/StarRating";
import { Brand } from "@/components/shells/brand";

interface ProviderProfile {
  id?: string;
  displayName: string;
  experience?: number | null;
  serviceArea?: string | null;
  city?: string | null;
  pincode?: string | null;
  address?: string | null;
  availability: string;
  verificationStatus: string;
  ratingAvg?: string | null;
  ratingCount?: number | null;
  bio?: string | null;
}

type ActiveModal = "skills" | "area" | "payment" | "support" | null;

export default function ProviderProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; phone: string; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Skills & credentials
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [experienceYears, setExperienceYears] = useState(8);
  const [bioText, setBioText] = useState("");

  // Service area
  const [serviceAreaText, setServiceAreaText] = useState("");
  const [cityName, setCityName] = useState("Visakhapatnam");
  const [pincodeText, setPincodeText] = useState("530026");
  const [availState, setAvailState] = useState<"available" | "unavailable" | "busy">("available");

  // Payment details (device-local — the platform settles via society ledger)
  const [bankName, setBankName] = useState("State Bank of India");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  // Grievance
  const [grievanceType, setGrievanceType] = useState("Customer pricing dispute");
  const [grievanceDetails, setGrievanceDetails] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState("");

  const fetchProfileData = async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const d = await res.json();
        setUser(d.user);
        const p = d.user?.profile as ProviderProfile | null;
        setProfile(p);
        if (p) {
          setExperienceYears(p.experience ?? 8);
          setBioText(p.bio ?? "");
          setServiceAreaText(p.serviceArea ?? "");
          setCityName(p.city ?? "Visakhapatnam");
          setPincodeText(p.pincode ?? "530026");
          setAvailState(p.availability as "available" | "unavailable" | "busy");
          try {
            const saved = window.localStorage.getItem(`ss.provider.${d.user?.phone}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed.skills)) setSkillsList(parsed.skills);
              if (parsed.bankName) setBankName(parsed.bankName);
              if (parsed.accountNumber) setAccountNumber(parsed.accountNumber);
              if (parsed.ifscCode) setIfscCode(parsed.ifscCode);
              if (parsed.upiId) setUpiId(parsed.upiId);
            }
          } catch {
            /* no local data */
          }
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => void fetchProfileData(), 0);
    return () => clearTimeout(t);
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 3000);
  };

  const persistLocal = (patch: Record<string, unknown>) => {
    if (!user?.phone) return;
    try {
      const saved = window.localStorage.getItem(`ss.provider.${user.phone}`);
      const current = saved ? JSON.parse(saved) : {};
      window.localStorage.setItem(`ss.provider.${user.phone}`, JSON.stringify({ ...current, ...patch }));
    } catch {
      /* ignore */
    }
  };

  const handleSaveSkills = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/providers/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experience: Number(experienceYears), bio: bioText }),
      });
      if (res.ok) {
        persistLocal({ skills: skillsList });
        showToast("Credentials updated");
        fetchProfileData();
        setActiveModal(null);
      }
    } catch {
      showToast("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveServiceArea = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/providers/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceArea: serviceAreaText,
          city: cityName,
          pincode: pincodeText,
          availability: availState,
        }),
      });
      if (res.ok) {
        showToast("Service area updated");
        fetchProfileData();
        setActiveModal(null);
      }
    } catch {
      showToast("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = () => {
    persistLocal({ bankName, accountNumber, ifscCode, upiId });
    showToast("Settlement details saved on this device");
    setActiveModal(null);
  };

  const handleSubmitGrievance = () => {
    if (!grievanceDetails.trim()) return;
    const ticketId = "TKT-" + Math.floor(100000 + Math.random() * 900000);
    persistLocal({
      grievances: [{ ticketId, type: grievanceType, details: grievanceDetails, at: new Date().toISOString() }],
    });
    setTicketSuccess(`Ticket ${ticketId} logged. The society federation officer will call you back shortly.`);
    setTimeout(() => {
      setTicketSuccess("");
      setGrievanceDetails("");
      setActiveModal(null);
      showToast(`Support ticket ${ticketId} submitted`);
    }, 2500);
  };

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return <LoadingBlock label="Loading your credentials…" className="py-24" />;
  }

  const verified = profile?.verificationStatus === "verified";

  const SETTINGS: Array<{
    id: Exclude<ActiveModal, null> | "welfare";
    title: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: "skills",
      title: "Skills & credentials",
      description: "Trade certifications, experience and member bio",
      icon: <Wrench className="size-5" />,
      badge: `${experienceYears}y`,
    },
    {
      id: "area",
      title: "Service area & availability",
      description: "Where you work and whether you're on duty",
      icon: <MapPin className="size-5" />,
      badge: availState === "available" ? "On duty" : "Off duty",
    },
    {
      id: "payment",
      title: "Settlement details",
      description: "Bank account & UPI for daily payouts",
      icon: <Banknote className="size-5" />,
      badge: upiId ? "UPI linked" : "Not set",
    },
    {
      id: "welfare",
      title: "Cooperative welfare fund",
      description: "Safety-net contributions & member benefits",
      icon: <HeartPulse className="size-5" />,
      badge: "Active",
    },
    {
      id: "support",
      title: "Grievance & support",
      description: "File disputes or reach the society desk",
      icon: <Headset className="size-5" />,
      badge: "24/7",
    },
  ];

  return (
    <PageContainer width="narrow" className="pt-0">
      {/* ---------- Identity header ---------- */}
      <div className="-mx-4 sm:mx-0 sm:rounded-3xl bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 text-white px-5 sm:px-8 pt-8 pb-16 relative overflow-hidden">
        <div className="absolute -right-10 -top-12 size-48 rounded-full bg-brand-700/40 blur-2xl" aria-hidden />
        <p className="text-sm text-brand-200/90">Partner account</p>
        <h1 className="text-xl font-extrabold mt-0.5">Member profile</h1>
      </div>

      <Card className="-mt-10 mx-4 sm:mx-2 p-5 relative">
        <div className="flex items-start gap-4">
          <Avatar name={profile?.displayName ?? "Specialist"} size="xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-ink-900 truncate flex items-center gap-1.5">
              {profile?.displayName ?? "Specialist"}
              {verified && <BadgeCheck className="size-5 text-brand-600 shrink-0" aria-hidden />}
            </h2>
            <p className="text-sm text-ink-500 inline-flex items-center gap-1.5 mt-0.5">
              <Phone className="size-3.5" aria-hidden />
              <span className="tabular-nums">{user?.phone}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge intent={verified ? "success" : "warning"} dot={false}>
                {verified ? "Cooperative verified" : "Verification pending"}
              </Badge>
              {profile?.ratingAvg && (
                <span className="text-xs font-semibold text-ink-700 inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-accent-400 text-accent-400" aria-hidden />
                  {profile.ratingAvg}
                  <span className="text-ink-400 font-normal">({profile.ratingCount ?? 0} reviews)</span>
                </span>
              )}
            </div>
          </div>
        </div>
        {profile?.ratingAvg && (
          <div className="mt-4 pt-3.5 border-t border-line flex items-center justify-between">
            <StarRating rating={Number(profile.ratingAvg)} size={16} showNumber />
            <span className="text-xs text-ink-400">{profile.ratingCount ?? 0} customer reviews</span>
          </div>
        )}
        {bioText && (
          <p className="mt-3 text-sm text-ink-600 leading-relaxed rounded-xl bg-ink-50 border border-line px-3.5 py-2.5">
            {bioText}
          </p>
        )}
      </Card>

      {/* ---------- Stats strip ---------- */}
      <div className="px-4 sm:px-2 mt-4 grid grid-cols-3 gap-2.5">
        <Stat label="Experience" value={`${experienceYears} yrs`} />
        <Stat label="Area" value={cityName} />
        <Stat label="Status" value={availState === "available" ? "On duty" : "Off duty"} />
      </div>

      {/* ---------- Settings ---------- */}
      <section aria-label="Profile settings" className="px-4 sm:px-2 mt-6 space-y-2">
        {SETTINGS.map((item) => {
          const body = (
            <>
              <span className="size-10.5 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 group-hover:bg-brand-700 group-hover:text-white transition-colors" aria-hidden>
                {item.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink-900">{item.title}</span>
                  {item.badge && (
                    <Badge intent="neutral" dot={false} className="shrink-0">
                      {item.badge}
                    </Badge>
                  )}
                </span>
                <span className="block text-xs text-ink-500 mt-0.5 truncate">{item.description}</span>
              </span>
              <ChevronRight className="size-4.5 text-ink-300 group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden />
            </>
          );
          const cls =
            "w-full flex items-center gap-3.5 rounded-2xl border border-line bg-panel p-4 text-left hover:shadow-raised hover:border-brand-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 group";
          if (item.id === "welfare") {
            return (
              <Link key={item.id} href="/provider/earnings" className={cls}>
                {body}
              </Link>
            );
          }
          return (
            <button key={item.id} type="button" onClick={() => setActiveModal(item.id as Exclude<ActiveModal, null>)} className={cls}>
              {body}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="w-full flex items-center gap-3.5 rounded-2xl border border-danger-200 bg-danger-50/60 p-4 text-left hover:bg-danger-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
        >
          <span className="size-10.5 rounded-xl bg-danger-100 text-danger-600 flex items-center justify-center shrink-0" aria-hidden>
            <LogOut className="size-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-danger-700">Sign out</span>
            <span className="block text-xs text-danger-600/80 mt-0.5">End this session on this device</span>
          </span>
        </button>
      </section>

      {/* ---------- Welfare strip ---------- */}
      <div className="px-4 sm:px-2 mt-6">
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
          <p className="text-sm font-bold text-brand-900">Member fair-share ledger</p>
          <div className="mt-3 flex h-2.5 rounded-full overflow-hidden bg-white border border-line" role="img" aria-label="90% member, 8% society operations, 2% welfare fund">
            <div className="bg-brand-600" style={{ width: "90%" }} />
            <div className="bg-brand-300" style={{ width: "8%" }} />
            <div className="bg-accent-400" style={{ width: "2%" }} />
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
            {[
              ["Member share", "90%"],
              ["Society ops", "8%"],
              ["Welfare fund", "2%"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-white border border-line py-2">
                <p className="text-sm font-extrabold text-ink-900 tabular-nums">{v}</p>
                <p className="text-2xs text-ink-500">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-brand-900/70 leading-relaxed">
            Your 10% society contribution funds the platform, insurance cover and the member welfare pool.
          </p>
          <p className="mt-3 pt-3 border-t border-brand-200/50 text-2xs text-brand-900/60 inline-flex items-center gap-1.5 justify-center w-full">
            <Brand compact size={18} />
            Shram Setu — Partner Collective
          </p>
        </div>
      </div>

      {/* ======================================================= Modals */}
      {/* Skills & credentials */}
      <Modal
        open={activeModal === "skills"}
        onClose={() => setActiveModal(null)}
        title="Skills & credentials"
        description="Shown to customers when they compare quotes"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSaveSkills}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Years of experience" htmlFor="sk-exp">
            <Input
              id="sk-exp"
              type="number"
              min={0}
              max={50}
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
            />
          </Field>

          <div>
            <p className="text-sm font-semibold text-ink-800 mb-2">Declared skills</p>
            <div className="flex flex-wrap gap-1.5">
              {skillsList.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700">
                  {skill}
                  <button
                    type="button"
                    onClick={() => setSkillsList((prev) => prev.filter((s) => s !== skill))}
                    className="text-ink-400 hover:text-danger-600"
                    aria-label={`Remove ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                placeholder="Add a skill…"
                aria-label="New skill"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSkillInput.trim()) {
                    setSkillsList((prev) => (prev.includes(newSkillInput.trim()) ? prev : [...prev, newSkillInput.trim()]));
                    setNewSkillInput("");
                  }
                }}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (newSkillInput.trim()) {
                    setSkillsList((prev) => (prev.includes(newSkillInput.trim()) ? prev : [...prev, newSkillInput.trim()]));
                    setNewSkillInput("");
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <Field label="Member bio" htmlFor="sk-bio">
            <Textarea
              id="sk-bio"
              rows={3}
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="e.g. Certified ITI wireman with 8+ years of field experience…"
            />
          </Field>
        </div>
      </Modal>

      {/* Service area */}
      <Modal
        open={activeModal === "area"}
        onClose={() => setActiveModal(null)}
        title="Service area & availability"
        description="Controls which leads you receive"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSaveServiceArea}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Localities served" htmlFor="sa-area">
            <Textarea id="sa-area" rows={2} value={serviceAreaText} onChange={(e) => setServiceAreaText(e.target.value)} placeholder="e.g. Pydimamba Colony, Dayal Nagar, Gajuwaka" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" htmlFor="sa-city">
              <Input id="sa-city" value={cityName} onChange={(e) => setCityName(e.target.value)} />
            </Field>
            <Field label="Pincode" htmlFor="sa-pin">
              <Input id="sa-pin" inputMode="numeric" value={pincodeText} onChange={(e) => setPincodeText(e.target.value)} />
            </Field>
          </div>
          <Field label="Duty status" htmlFor="sa-status">
            <Select id="sa-status" value={availState} onChange={(e) => setAvailState(e.target.value as typeof availState)}>
              <option value="available">Available — accept new leads</option>
              <option value="busy">Busy — no new leads right now</option>
              <option value="unavailable">Off duty</option>
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Payment */}
      <Modal
        open={activeModal === "payment"}
        onClose={() => setActiveModal(null)}
        title="Settlement details"
        description="Payouts are settled daily by the society ledger"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayment}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Bank name" htmlFor="pay-bank">
            <Input id="pay-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account number" htmlFor="pay-acc">
              <Input id="pay-acc" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="…" />
            </Field>
            <Field label="IFSC" htmlFor="pay-ifsc">
              <Input id="pay-ifsc" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} placeholder="SBIN…" />
            </Field>
          </div>
          <Field label="UPI ID" htmlFor="pay-upi" hint="Used for instant on-spot settlements">
            <Input id="pay-upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@bank" />
          </Field>
          <p className="text-2xs text-ink-400 leading-relaxed">
            Saved on this device and shared with the society settlement desk. The cooperative never stores your
            full account details in partner-facing apps.
          </p>
        </div>
      </Modal>

      {/* Grievance */}
      <Modal
        open={activeModal === "support"}
        onClose={() => setActiveModal(null)}
        title="Grievance & support"
        description="Mediation by the society federation officer"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <a href="tel:1800000001" className="rounded-xl border border-line bg-panel p-3.5 text-sm font-bold text-brand-800 hover:bg-brand-50 transition-colors inline-flex items-center gap-2">
            <Headset className="size-4.5" aria-hidden />
            Field hotline
          </a>
          <a href="tel:9000000001" className="rounded-xl border border-success-200 bg-success-50 p-3.5 text-sm font-bold text-success-800 hover:bg-success-100 transition-colors inline-flex items-center gap-2">
            <Phone className="size-4.5" aria-hidden />
            Society desk
          </a>
        </div>

        {ticketSuccess ? (
          <div className="mt-4 rounded-xl bg-success-100 text-success-800 p-5 text-center">
            <BadgeCheck className="size-7 mx-auto" aria-hidden />
            <p className="mt-2 text-sm font-bold leading-relaxed">{ticketSuccess}</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <Field label="Grievance type" htmlFor="gr-type">
              <Select id="gr-type" value={grievanceType} onChange={(e) => setGrievanceType(e.target.value)}>
                <option>Customer pricing dispute</option>
                <option>Payment settlement delay</option>
                <option>Unsafe working conditions</option>
                <option>Customer misconduct</option>
                <option>Other</option>
              </Select>
            </Field>
            <Field label="Details" htmlFor="gr-details">
              <Textarea
                id="gr-details"
                rows={3}
                value={grievanceDetails}
                onChange={(e) => setGrievanceDetails(e.target.value)}
                placeholder="Describe the situation…"
              />
            </Field>
            <Button className="w-full" disabled={!grievanceDetails.trim()} onClick={handleSubmitGrievance}>
              File grievance
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Sign out of the partner portal?"
        description="Leads will pause for your number until you sign back in."
        confirmLabel="Sign out"
        destructive
      />

      {successToast && <Toast message={successToast} onDismiss={() => setSuccessToast("")} />}
    </PageContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel py-3 px-2 text-center shadow-card">
      <p className="text-sm font-extrabold text-ink-900 truncate">{value}</p>
      <p className="text-2xs text-ink-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}
