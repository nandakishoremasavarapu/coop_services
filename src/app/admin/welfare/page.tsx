"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  HeartPulse,
  Award,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  ArrowRight,
  X,
  Check,
  Send,
  Download,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  Zap,
  Building,
  RefreshCw,
  Umbrella,
  HelpCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type TabType = "schemes" | "claims" | "members" | "relief";

interface Scheme {
  id: string;
  name: string;
  code: string;
  type: string;
  coverageAmount: string;
  coverageNum: number;
  monthlyDeduction: string;
  status: string;
  beneficiaries: number;
  insurer: string;
  description: string;
  features: string[];
}

interface Claim {
  id: string;
  providerName: string;
  trade: string;
  providerPhone: string;
  schemeId: string;
  schemeName: string;
  claimType: string;
  amount: number;
  dateSubmitted: string;
  incidentDate: string;
  hospital: string;
  diagnosis: string;
  evidenceFile: string;
  status: string;
  payoutMethod: string;
  societySteward: string;
}

interface Member {
  id: string;
  name: string;
  trade: string;
  phone: string;
  unionId: string;
  society: string;
  policyNumber: string;
  welfareContributed: number;
  coveredSchemes: string[];
  status: string;
  lastCheckup: string;
}

export default function AdminWelfarePage() {
  const [activeTab, setActiveTab] = useState<TabType>("schemes");
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data State
  const [stats, setStats] = useState({
    totalPoolCorpus: 348500,
    totalClaimsPaid: 95000,
    activeCoveredMembers: 48,
    monthlyInflow: 28400,
    emergencyReserve: 120000,
  });

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Filter State
  const [claimStatusFilter, setClaimStatusFilter] = useState("all");
  const [claimSearch, setClaimSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  // Modals
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [showReliefModal, setShowReliefModal] = useState(false);

  // New Claim Form State
  const [newClaimMember, setNewClaimMember] = useState("Suresh Kumar K.");
  const [newClaimScheme, setNewClaimScheme] = useState("scheme-health");
  const [newClaimAmount, setNewClaimAmount] = useState(15000);
  const [newClaimHospital, setNewClaimHospital] = useState("Ernakulam General Hospital");
  const [newClaimDiagnosis, setNewClaimDiagnosis] = useState("");

  // Relief Form State
  const [reliefMember, setReliefMember] = useState("Rajesh M. Nair");
  const [reliefAmount, setReliefAmount] = useState(5000);
  const [reliefReason, setReliefReason] = useState("Acute medical distress and work stoppage grant");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchWelfareData = async () => {
    try {
      const res = await fetch("/api/admin/welfare");
      const data = await res.json();
      if (data?.stats) setStats(data.stats);
      if (Array.isArray(data?.schemes)) setSchemes(data.schemes);
      if (Array.isArray(data?.claims)) setClaims(data.claims);
      if (Array.isArray(data?.members)) setMembers(data.members);
    } catch (err) {
      console.warn("Failed to fetch welfare data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWelfareData();
  }, []);

  const handleApproveClaim = async (claimId: string) => {
    try {
      const res = await fetch("/api/admin/welfare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_claim", claimId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Claim ${claimId} approved & disbursed!`);
        setSelectedClaim(null);
        fetchWelfareData();
      }
    } catch (err) {
      showToast("Error approving claim");
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    try {
      const res = await fetch("/api/admin/welfare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject_claim", claimId, reason: "Documentation audit required" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Claim ${claimId} returned for audit`);
        setSelectedClaim(null);
        fetchWelfareData();
      }
    } catch (err) {
      showToast("Error rejecting claim");
    }
  };

  const handleSubmitNewClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/welfare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "new_claim",
          providerName: newClaimMember,
          schemeId: newClaimScheme,
          amount: newClaimAmount,
          hospital: newClaimHospital,
          diagnosis: newClaimDiagnosis || "Emergency treatment and occupational injury claim",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("New welfare claim registered successfully!");
        setShowNewClaimModal(false);
        setNewClaimDiagnosis("");
        fetchWelfareData();
      }
    } catch (err) {
      showToast("Error registering claim");
    }
  };

  const handleDispatchRelief = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/welfare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "instant_relief",
          providerName: reliefMember,
          amount: reliefAmount,
          reason: reliefReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Instant distress grant dispatched!");
        setShowReliefModal(false);
        fetchWelfareData();
      }
    } catch (err) {
      showToast("Error dispatching relief");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={40} label="Loading Welfare & Insurance Registry..." />
      </div>
    );
  }

  const filteredClaims = claims.filter((c) => {
    const matchStatus = claimStatusFilter === "all" || c.status === claimStatusFilter;
    const matchSearch =
      !claimSearch ||
      c.providerName.toLowerCase().includes(claimSearch.toLowerCase()) ||
      c.id.toLowerCase().includes(claimSearch.toLowerCase()) ||
      c.schemeName.toLowerCase().includes(claimSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredMembers = members.filter((m) => {
    return (
      !memberSearch ||
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.unionId.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.trade.toLowerCase().includes(memberSearch.toLowerCase())
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm px-5 py-3 rounded-2xl shadow-xl animate-fade-in">
          <CheckCircle2 size={18} />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield size={12} className="text-emerald-600" />
              Sahakari Mutual Security
            </span>
            <span className="text-xs text-slate-400 font-medium">Kerala Labour Federation Chapter</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welfare & Insurance Administration</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Comprehensive member-owner health cover, emergency mutual aid, and retirement dividend oversight
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start lg:self-auto">
          <button
            onClick={() => setShowReliefModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Zap size={14} className="fill-white" />
            <span>Instant Distress Relief</span>
          </button>
          <button
            onClick={() => setShowNewClaimModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>File New Claim</span>
          </button>
        </div>
      </div>

      {/* KPI Corpus Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-15">
            <Umbrella size={70} />
          </div>
          <div className="text-xs font-semibold text-emerald-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Shield size={14} /> Total Welfare Pool
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            ₹{stats.totalPoolCorpus.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-emerald-100 mt-2 flex items-center gap-1">
            <span className="font-semibold">+₹{stats.monthlyInflow.toLocaleString("en-IN")}</span> monthly inflow from 3% levies
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-blue-600" /> Claims Disbursed (FY26)
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            ₹{stats.totalClaimsPaid.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            <strong className="text-blue-600 font-semibold">{claims.filter((c) => c.status === "disbursed").length} claims</strong> settled without paperwork delay
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Users size={14} className="text-indigo-600" /> Active Insured Members
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.activeCoveredMembers}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            <span className="text-emerald-600 font-semibold">100% active technicians</span> covered under group policies
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" /> Emergency Mutual Aid Pool
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            ₹{stats.emergencyReserve.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Disbursed instantly for accidents & tool losses
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-2xl shadow-sm">
        {[
          { id: "schemes" as TabType, label: "Insurance & Welfare Schemes", icon: Shield, count: schemes.length },
          { id: "claims" as TabType, label: "Live Claims & Disbursals", icon: FileText, count: claims.filter((c) => c.status === "pending").length, badgeColor: "bg-amber-100 text-amber-800" },
          { id: "members" as TabType, label: "Member Welfare Ledger", icon: Users, count: members.length },
          { id: "relief" as TabType, label: "Mutual Aid & Distress Fund", icon: HeartPulse },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all relative ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    tab.badgeColor || (isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE INSURANCE SCHEMES */}
      {/* ========================================================================= */}
      {activeTab === "schemes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {schemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                      {scheme.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">{scheme.code}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug">{scheme.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">{scheme.description}</p>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 mb-4 border border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Max Benefit:</span>
                      <span className="font-extrabold text-emerald-700 text-sm">{scheme.coverageAmount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Monthly Cost:</span>
                      <span className="font-medium text-slate-700">{scheme.monthlyDeduction}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Underwritten by:</span>
                      <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[170px]">
                        {scheme.insurer}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {scheme.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <Check size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    <strong className="text-slate-700">{scheme.beneficiaries}</strong> Members Covered
                  </span>
                  <button
                    onClick={() => setSelectedScheme(scheme)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <span>View Policy Details</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE CLAIMS & DISBURSALS */}
      {/* ========================================================================= */}
      {activeTab === "claims" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search claims by ID, member, scheme..."
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <Filter size={13} /> Status:
              </span>
              {["all", "pending", "approved", "disbursed", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setClaimStatusFilter(status)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold capitalize transition-all ${
                    claimStatusFilter === status
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Claims Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Claim ID</th>
                  <th className="px-5 py-3">Member & Trade</th>
                  <th className="px-5 py-3">Welfare Scheme</th>
                  <th className="px-5 py-3">Claim Amount</th>
                  <th className="px-5 py-3">Incident / Diagnosis</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                      No claims found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{claim.id}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{claim.providerName}</div>
                        <div className="text-slate-400 text-[11px]">{claim.trade}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{claim.schemeName}</div>
                        <div className="text-slate-400 text-[11px]">{claim.claimType}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-emerald-700 text-sm">
                          ₹{claim.amount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="text-slate-700 font-medium truncate">{claim.hospital}</div>
                        <div className="text-slate-400 text-[11px] truncate">{claim.diagnosis}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] capitalize inline-block ${
                            claim.status === "disbursed"
                              ? "bg-green-100 text-green-700"
                              : claim.status === "approved"
                              ? "bg-blue-100 text-blue-700"
                              : claim.status === "pending"
                              ? "bg-amber-100 text-amber-800 animate-pulse"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {claim.status === "pending" ? "● Pending Review" : claim.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
                        >
                          View & Process
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MEMBER WELFARE LEDGER */}
      {/* ========================================================================= */}
      {activeTab === "members" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search member passbook by name, union ID or trade..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{filteredMembers.length}</strong> active member passbooks
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Member-Owner</th>
                  <th className="px-5 py-3">Union Reg. Card</th>
                  <th className="px-5 py-3">Cooperative Society</th>
                  <th className="px-5 py-3">Master Policy No.</th>
                  <th className="px-5 py-3">Welfare Corpus Paid</th>
                  <th className="px-5 py-3">Coverage Status</th>
                  <th className="px-5 py-3 text-right">Passbook Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{member.name}</div>
                      <div className="text-slate-400 text-[11px]">{member.trade}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-blue-700">{member.unionId}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{member.society}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">{member.policyNumber}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-emerald-700">₹{member.welfareContributed.toLocaleString("en-IN")}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        {member.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => showToast(`Downloaded Sahakari Welfare Certificate for ${member.name}`)}
                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 ml-auto text-xs"
                      >
                        <Download size={13} />
                        <span>Policy Card</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MUTUAL AID & DISTRESS RELIEF */}
      {/* ========================================================================= */}
      {activeTab === "relief" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-amber-200 text-xs font-bold uppercase tracking-wider mb-2">
                <Zap size={16} /> Zero-Paperwork Rapid Distress Protocol
              </div>
              <h2 className="text-xl font-extrabold mb-2">Emergency Mutual Aid Reserve</h2>
              <p className="text-xs text-amber-100 leading-relaxed max-w-xl mb-4">
                The Sahakari Mutual Aid Fund provides instant, direct-to-UPI relief grants up to ₹10,000 for verified member-owners undergoing sudden occupational accidents, emergency ICU admissions, or critical equipment losses before formal hospital insurance paperwork can be filed.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowReliefModal(true)}
                  className="bg-white text-slate-900 font-bold text-xs px-5 py-2.5 rounded-xl shadow-md hover:bg-amber-50 transition-colors"
                >
                  Dispatch Emergency Relief Grant
                </button>
                <div className="text-xs text-amber-100">
                  Current Reserve: <strong>₹{stats.emergencyReserve.toLocaleString("en-IN")}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Cooperative Mutual Aid Principles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-800 mb-1">⚡ 2-Hour SLA Disbursement</div>
                  <p className="text-slate-500 leading-relaxed">
                    Emergency funds are directly transferred to the member's registered UPI ID within 120 minutes of Society Steward confirmation.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-800 mb-1">🤝 No Repayment Burden</div>
                  <p className="text-slate-500 leading-relaxed">
                    Distress grants are non-repayable grants funded collectively from the 3% platform welfare fee pool.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-800 mb-1">🏥 Cashless Hospitalization Guarantee</div>
                  <p className="text-slate-500 leading-relaxed">
                    Federation stewards issue immediate guarantee letters to empanelled hospitals to admit injured members without advance deposits.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-800 mb-1">🛠️ Tool Depot Replacement</div>
                  <p className="text-slate-500 leading-relaxed">
                    Damaged equipment can be immediately picked up from the district cooperative depot to prevent daily wage loss.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" /> Recent Mutual Aid Grants
              </h3>
              <div className="space-y-3">
                {claims
                  .filter((c) => c.status === "disbursed")
                  .slice(0, 3)
                  .map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="flex justify-between items-center font-bold text-slate-900 mb-1">
                        <span>{c.providerName}</span>
                        <span className="text-emerald-700">₹{c.amount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] mb-1">{c.claimType} • {c.hospital}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Disbursed on {c.dateSubmitted}</div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-center">
              <span className="text-[11px] text-slate-400">Audited by Kerala Cooperative Audit Wing</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SCHEME POLICY DETAILS */}
      {/* ========================================================================= */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedScheme.name}</h2>
                  <span className="text-xs text-blue-600 font-mono font-medium">{selectedScheme.code}</span>
                </div>
              </div>
              <button onClick={() => setSelectedScheme(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-600">
              <p className="text-sm leading-relaxed text-slate-700">{selectedScheme.description}</p>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-slate-400 font-medium">Coverage Limit</div>
                  <div className="text-base font-extrabold text-emerald-700 mt-0.5">{selectedScheme.coverageAmount}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Underwriter</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedScheme.insurer}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2">Key Policy Terms & Entitlements</h4>
                <div className="space-y-2">
                  {selectedScheme.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/60">
                      <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 leading-tight">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedScheme(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl text-xs"
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CLAIM DETAILS & DISBURSAL DESK */}
      {/* ========================================================================= */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedClaim.id}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">Claim Settlement & Audit Review</h2>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary:</span>
                  <strong className="text-slate-900">{selectedClaim.providerName} ({selectedClaim.trade})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Welfare Scheme:</span>
                  <strong className="text-slate-900">{selectedClaim.schemeName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Incident Date:</span>
                  <span className="text-slate-700 font-mono">{selectedClaim.incidentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hospital / Facility:</span>
                  <span className="text-slate-800 font-semibold">{selectedClaim.hospital}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-bold">Approved Claim Amount:</span>
                  <span className="text-base font-extrabold text-emerald-700">₹{selectedClaim.amount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Medical Diagnosis / Incident Record</label>
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 leading-relaxed">
                  {selectedClaim.diagnosis}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Disbursement Account & Routing</label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-medium">
                  {selectedClaim.payoutMethod}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {selectedClaim.status === "pending" ? (
                <>
                  <button
                    onClick={() => handleRejectClaim(selectedClaim.id)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                  >
                    Request Audit / Reject
                  </button>
                  <button
                    onClick={() => handleApproveClaim(selectedClaim.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs shadow-sm flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve & Disburse Funds</span>
                  </button>
                </>
              ) : (
                <div className="w-full flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-semibold">
                    Status: <strong className="text-emerald-700 capitalize">{selectedClaim.status}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedClaim(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold px-5 py-2 rounded-xl text-xs"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REGISTER NEW CLAIM */}
      {/* ========================================================================= */}
      {showNewClaimModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">File Member Welfare Claim</h2>
                  <p className="text-xs text-slate-400">Queue medical or tool replacement claim for verification</p>
                </div>
              </div>
              <button onClick={() => setShowNewClaimModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewClaim} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Beneficiary Member-Owner</label>
                <select
                  value={newClaimMember}
                  onChange={(e) => setNewClaimMember(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white font-medium"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.trade} - {m.unionId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Applicable Welfare Scheme</label>
                <select
                  value={newClaimScheme}
                  onChange={(e) => setNewClaimScheme(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white font-medium"
                >
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Max {s.coverageAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Claim Amount (₹)</label>
                <input
                  type="number"
                  value={newClaimAmount}
                  onChange={(e) => setNewClaimAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Hospital / Depot Inspection Facility</label>
                <input
                  type="text"
                  value={newClaimHospital}
                  onChange={(e) => setNewClaimHospital(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Incident Description & Treatment Notes</label>
                <textarea
                  rows={3}
                  value={newClaimDiagnosis}
                  onChange={(e) => setNewClaimDiagnosis(e.target.value)}
                  placeholder="Detail injury, illness or damaged equipment requiring fast-track cooperative settlement..."
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewClaimModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl shadow-sm"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: INSTANT EMERGENCY DISTRESS RELIEF */}
      {/* ========================================================================= */}
      {showReliefModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Zap size={20} className="fill-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Instant Mutual Aid Distress Relief</h2>
                  <p className="text-xs text-amber-800">Zero-paperwork direct emergency grant</p>
                </div>
              </div>
              <button onClick={() => setShowReliefModal(false)} className="p-2 hover:bg-amber-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDispatchRelief} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Technician in Distress</label>
                <select
                  value={reliefMember}
                  onChange={(e) => setReliefMember(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white font-medium"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.trade} - {m.society})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Distress Relief Amount</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[2000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setReliefAmount(amt)}
                      className={`py-2 rounded-xl font-bold border transition-all ${
                        reliefAmount === amt
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      ₹{amt.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Emergency Circumstance / Reason</label>
                <textarea
                  rows={3}
                  value={reliefReason}
                  onChange={(e) => setReliefReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                ⚡ Funds are disbursed immediately from the liquid ₹1,20,000 mutual aid reserve directly to the member's registered cooperative bank UPI ID.
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReliefModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2 rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Dispatch Immediate Relief</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
