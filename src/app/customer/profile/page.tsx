"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronRight,
  Handshake,
  Headset,
  Languages,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircleQuestion,
  Phone,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { PageContainer } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { LoadingBlock, Toast } from "@/components/ui/states";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Textarea, Switch } from "@/components/ui/form";
import { Brand } from "@/components/shells/brand";

type SettingsId = "details" | "notifications" | "privacy" | "language" | "support" | null;

const LANGUAGES = [
  { id: "English", native: "English", hint: "Standard English interface" },
  { id: "Telugu", native: "తెలుగు (Telugu)", hint: "ఆంధ్రప్రదేశ్ మరియు తెలంగాణ ప్రాంతీయ భాష" },
  { id: "Hindi", native: "हिन्दी (Hindi)", hint: "राष्ट्रीय भाषा इंटरफ़ेस" },
];

export default function CustomerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    profileName: string;
    phone: string;
    email?: string | null;
    profile?: { address?: string | null; city?: string | null; pincode?: string | null } | null;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeModal, setActiveModal] = useState<SettingsId>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Details state
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Visakhapatnam");
  const [pincode, setPincode] = useState("530026");

  // Notification prefs
  const [notifService, setNotifService] = useState(true);
  const [notifQuotes, setNotifQuotes] = useState(true);
  const [notifSms, setNotifSms] = useState(true);

  // Language
  const [selectedLang, setSelectedLang] = useState("English");

  // Support
  const [supportText, setSupportText] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState("");

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.user);
        if (d.user) {
          setFullName(d.user.profileName ?? "");
          setAddress(d.user.profile?.address ?? "");
          setCity(d.user.profile?.city ?? "Visakhapatnam");
          setPincode(d.user.profile?.pincode ?? "530026");
          // local device overrides
          try {
            const saved = window.localStorage.getItem(`ss.profile.${d.user.phone}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.fullName) setFullName(parsed.fullName);
              if (parsed.address) setAddress(parsed.address);
              if (parsed.city) setCity(parsed.city);
              if (parsed.pincode) setPincode(parsed.pincode);
            }
            const prefs = window.localStorage.getItem(`ss.prefs.${d.user.phone}`);
            if (prefs) {
              const parsed = JSON.parse(prefs);
              if (typeof parsed.notifService === "boolean") setNotifService(parsed.notifService);
              if (typeof parsed.notifQuotes === "boolean") setNotifQuotes(parsed.notifQuotes);
              if (typeof parsed.notifSms === "boolean") setNotifSms(parsed.notifSms);
              if (parsed.lang) setSelectedLang(parsed.lang);
            }
          } catch {
            /* localStorage unavailable */
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const persistLocal = (key: string, value: unknown) => {
    if (!profile?.phone) return;
    try {
      window.localStorage.setItem(`${key}.${profile.phone}`, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  };

  const saveDetails = () => {
    persistLocal("ss.profile", { fullName, address, city, pincode });
    setActiveModal(null);
    showToast("Details updated on this device");
  };

  const savePrefs = () => {
    persistLocal("ss.prefs", { notifService, notifQuotes, notifSms, lang: selectedLang });
    setActiveModal(null);
    showToast("Preferences saved");
  };

  const submitTicket = () => {
    const ticketId = "RES-" + Math.floor(100000 + Math.random() * 900000);
    persistLocal("ss.support.latest", { ticketId, message: supportText, at: new Date().toISOString() });
    setTicketSuccess(`Ticket ${ticketId} logged with the society desk. A coordinator will call you shortly.`);
    setTimeout(() => {
      setTicketSuccess("");
      setSupportText("");
      setActiveModal(null);
      showToast(`Support ticket ${ticketId} submitted`);
    }, 2200);
  };

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (!loaded) {
    return <LoadingBlock label="Loading your profile…" className="py-24" />;
  }

  const SETTINGS: Array<{
    id: Exclude<SettingsId, null>;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: "details",
      title: "Personal & address details",
      description: "Your name and default service location",
      icon: <UserRound className="size-5" />,
      badge: city,
    },
    {
      id: "notifications",
      title: "Notification preferences",
      description: "Quote alerts, arrival updates and receipts",
      icon: <MessageCircleQuestion className="size-5" />,
      badge: notifSms ? "SMS on" : "SMS off",
    },
    {
      id: "privacy",
      title: "Privacy & cooperative data",
      description: "How your data is used across the platform",
      icon: <LockKeyhole className="size-5" />,
    },
    {
      id: "language",
      title: "Language",
      description: "Choose English, Telugu or Hindi",
      icon: <Languages className="size-5" />,
      badge: selectedLang,
    },
    {
      id: "support",
      title: "Help & support desk",
      description: "Dispute mediation, grievances and helpline",
      icon: <Headset className="size-5" />,
      badge: "24/7",
    },
  ];

  return (
    <PageContainer width="narrow" className="pt-0">
      {/* ---------- Identity header ---------- */}
      <div className="-mx-4 sm:mx-0 sm:rounded-3xl bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 text-white px-5 sm:px-8 pt-8 pb-16 relative overflow-hidden">
        <div className="absolute -right-10 -top-12 size-48 rounded-full bg-brand-700/40 blur-2xl" aria-hidden />
        <p className="text-sm text-brand-200/90">My account</p>
        <h1 className="text-xl font-extrabold mt-0.5">Resident profile</h1>
      </div>

      <Card className="-mt-10 mx-4 sm:mx-2 p-5 relative">
        <div className="flex items-center gap-4">
          <Avatar name={fullName || "Customer"} size="xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-ink-900 truncate">{fullName || "Customer"}</h2>
            <p className="text-sm text-ink-500 inline-flex items-center gap-1.5 mt-0.5">
              <Phone className="size-3.5" aria-hidden />
              <span className="tabular-nums">{profile?.phone}</span>
            </p>
            <Badge intent="success" dot={false} className="mt-2">
              <BadgeCheck className="size-3 mr-1" aria-hidden />
              Verified resident
            </Badge>
          </div>
        </div>
        {address && (
          <p className="mt-4 pt-3.5 border-t border-line text-sm text-ink-600 flex items-start gap-2">
            <MapPin className="size-4 text-accent-600 mt-0.5 shrink-0" aria-hidden />
            <span>
              {address}, {city} — {pincode}
            </span>
          </p>
        )}
      </Card>

      {/* ---------- Settings ---------- */}
      <section aria-label="Account settings" className="px-4 sm:px-2 mt-6 space-y-2">
        {SETTINGS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveModal(item.id)}
            className="w-full flex items-center gap-3.5 rounded-2xl border border-line bg-panel p-4 text-left hover:shadow-raised hover:border-brand-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 group"
          >
            <span
              className="size-10.5 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 group-hover:bg-brand-700 group-hover:text-white transition-colors"
              aria-hidden
            >
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
          </button>
        ))}

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

      {/* ---------- Cooperative transparency ---------- */}
      <div className="px-4 sm:px-2 mt-6">
        <div className="rounded-2xl border border-success-200 bg-success-50/60 p-5 text-center">
          <Handshake className="size-7 mx-auto text-success-700" aria-hidden />
          <p className="mt-2 text-sm font-bold text-success-800">Fair trade, worker-owned platform</p>
          <p className="mt-1 text-xs text-success-800/80 leading-relaxed max-w-sm mx-auto">
            Platform fees flow directly into fair technician remuneration and the cooperative welfare fund.
          </p>
          <p className="mt-3 text-2xs text-success-800/60 inline-flex items-center gap-1.5 justify-center">
            <Brand compact size={14} className="text-success-800/60" />
            Shram Setu — व श्रमिक सहकार
          </p>
        </div>
      </div>

      {/* ======================================================= Modals */}
      {/* 1 — Personal & address */}
      <Modal
        open={activeModal === "details"}
        onClose={() => setActiveModal(null)}
        title="Personal & address details"
        description="Used to prefill service requests near you"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button onClick={saveDetails}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name" htmlFor="p-fullname">
            <Input id="p-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Service address" hint="Flat, building, colony" htmlFor="p-address">
            <Textarea id="p-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" htmlFor="p-city">
              <Input id="p-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="Pincode" htmlFor="p-pin">
              <Input id="p-pin" inputMode="numeric" value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>

      {/* 2 — Notification preferences */}
      <Modal
        open={activeModal === "notifications"}
        onClose={() => setActiveModal(null)}
        title="Notification preferences"
        description="Control what reaches your phone"
        footer={
          <Button className="w-full" onClick={savePrefs}>
            Save preferences
          </Button>
        }
      >
        <div className="space-y-2.5">
          <PreferenceRow label="Arrival & live status updates" description="When your specialist is on the way and on site" checked={notifService} onCheckedChange={setNotifService} />
          <PreferenceRow label="Quote alerts" description="Instant notifications when new quotes arrive" checked={notifQuotes} onCheckedChange={setNotifQuotes} />
          <PreferenceRow label="SMS receipts & updates" description="Payment bills and booking confirmations via SMS" checked={notifSms} onCheckedChange={setNotifSms} />
        </div>
      </Modal>

      {/* 3 — Privacy */}
      <Modal
        open={activeModal === "privacy"}
        onClose={() => setActiveModal(null)}
        title="Privacy & data protection"
        description="Cooperative transparent data charter"
        footer={
          <Button className="w-full" onClick={() => setActiveModal(null)}>
            Understood
          </Button>
        }
      >
        <div className="rounded-2xl bg-success-50 border border-success-100 p-4">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-success-800">
            <BadgeCheck className="size-4.5" aria-hidden />
            Zero commercial data reselling
          </p>
          <p className="mt-1.5 text-xs text-success-900/80 leading-relaxed">
            As a cooperative society platform, your phone number, address and media attachments are never sold to
            third-party advertisers. They are shared only with your chosen technician during active bookings.
          </p>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-xl border border-line p-3.5">
            <p className="font-semibold text-ink-900">Private chat channel</p>
            <p className="text-xs text-ink-500 mt-0.5">Voice notes and photos travel over the cooperative messaging channel only.</p>
          </li>
          <li className="rounded-xl border border-line p-3.5">
            <p className="font-semibold text-ink-900">Explicit confirmations</p>
            <p className="text-xs text-ink-500 mt-0.5">Escrow release and work completion always require your confirmation.</p>
          </li>
        </ul>
      </Modal>

      {/* 4 — Language */}
      <Modal
        open={activeModal === "language"}
        onClose={() => setActiveModal(null)}
        title="Language"
        description="Select your preferred regional language"
        footer={
          <Button className="w-full" onClick={savePrefs}>
            Apply language
          </Button>
        }
      >
        <div role="radiogroup" aria-label="Language" className="space-y-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              type="button"
              role="radio"
              aria-checked={selectedLang === lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={cn(
                "w-full flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors",
                selectedLang === lang.id ? "border-brand-600 bg-brand-50" : "border-line bg-panel hover:border-brand-300"
              )}
            >
              <span>
                <span className="block text-sm font-bold text-ink-900">{lang.native}</span>
                <span className="block text-xs text-ink-500 mt-0.5">{lang.hint}</span>
              </span>
              <span
                className={cn(
                  "size-4.5 rounded-full border-2 shrink-0 inline-flex items-center justify-center",
                  selectedLang === lang.id ? "border-brand-700" : "border-ink-300"
                )}
                aria-hidden
              >
                {selectedLang === lang.id && <span className="size-2 rounded-full bg-brand-700" />}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {/* 5 — Support */}
      <Modal
        open={activeModal === "support"}
        onClose={() => setActiveModal(null)}
        title="Help & support desk"
        description="Direct support from your local society admin"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <a href="tel:9000000001" className="rounded-xl border border-success-200 bg-success-50 p-3.5 text-sm font-bold text-success-800 hover:bg-success-100 transition-colors inline-flex items-center gap-2">
            <Phone className="size-4.5" aria-hidden />
            Society desk
          </a>
          <a href="tel:18004198800" className="rounded-xl border border-line bg-panel p-3.5 text-sm font-bold text-brand-800 hover:bg-brand-50 transition-colors inline-flex items-center gap-2">
            <Headset className="size-4.5" aria-hidden />
            24/7 helpline
          </a>
        </div>

        {ticketSuccess ? (
          <div className="mt-4 rounded-xl bg-success-100 text-success-800 p-5 text-center">
            <BadgeCheck className="size-7 mx-auto" aria-hidden />
            <p className="mt-2 text-sm font-bold leading-relaxed">{ticketSuccess}</p>
          </div>
        ) : (
          <div className="mt-4">
            <Field label="Describe your issue or question" htmlFor="support-text">
              <Textarea
                id="support-text"
                rows={3}
                value={supportText}
                onChange={(e) => setSupportText(e.target.value)}
                placeholder="e.g. Technician missed the scheduled slot…"
              />
            </Field>
            <Button className="w-full mt-3" disabled={!supportText.trim()} onClick={submitTicket}>
              Submit ticket
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Sign out of Shram Setu?"
        description="You can sign back in anytime with your mobile number and password."
        confirmLabel="Sign out"
        destructive
      />

      {toastMsg && <Toast message={toastMsg} onDismiss={() => setToastMsg("")} />}
    </PageContainer>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3.5 min-h-11">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} label={label} />
    </div>
  );
}
