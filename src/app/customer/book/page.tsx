"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic,
  MicOff,
  Upload,
  Camera,
  Image as ImageIcon,
  X,
  Play,
  Pause,
  Trash2,
  RefreshCcw,
  Zap,
  CalendarDays,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  MapPin,
  ShieldCheck,
  Radio,
  Check,
  ImagePlus,
  AlarmClock,
  SwitchCamera,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ServiceIcon } from "@/lib/serviceIcons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { Field, Input, Textarea, ChoiceCard } from "@/components/ui/form";
import { ErrorNotice } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import type { ServiceCategory, SpecificService } from "@/lib/types";

const DEFAULT_SPECIFIC_SERVICES = [
  { id: "svc-1", name: "Fan Repair & Installation", rate: "₹149 base", icon: "fan" },
  { id: "svc-2", name: "Switchboard & MCB Wiring", rate: "₹199 base", icon: "wiring" },
  { id: "svc-3", name: "Inverter & Battery Wiring", rate: "₹299 base", icon: "battery" },
  { id: "svc-4", name: "Appliance Power Point", rate: "₹179 base", icon: "power" },
  { id: "svc-5", name: "Wiring Audit & Diagnostic", rate: "₹499 inspection", icon: "audit" },
  { id: "svc-6", name: "Other Specific Issue", rate: "Custom quote", icon: "other" },
];

const COMMON_ISSUE_CHIPS = [
  "Not turning on / No power",
  "Making unusual noise",
  "Sparking or burning smell",
  "Water leakage or pipe blockage",
  "Component replacement needed",
  "General checkup & diagnostic",
];

const TIME_WINDOWS = [
  { id: "morning", label: "Morning", time: "9:00 – 12:00", icon: Sunrise, startHour: 9 },
  { id: "afternoon", label: "Afternoon", time: "12:00 – 15:00", icon: Sun, startHour: 12 },
  { id: "evening", label: "Evening", time: "15:00 – 18:00", icon: Sunset, startHour: 15 },
  { id: "night", label: "Late Evening", time: "18:00 – 20:30", icon: Moon, startHour: 18 },
];

function BookServiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get("categoryId");
  const categoryName = searchParams.get("categoryName") || "Electrical Services";
  const initialEmergency = searchParams.get("emergency") === "true";

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [specificServices, setSpecificServices] = useState<any[]>(DEFAULT_SPECIFIC_SERVICES);
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentAudioTime, setCurrentAudioTime] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState("");

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");

  const [timingSlot, setTimingSlot] = useState<"immediate" | "planned">("immediate");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const [scheduledDate, setScheduledDate] = useState<string>(tomorrowStr);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<string>(TIME_WINDOWS[0].id);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const datePickerInputRef = useRef<HTMLInputElement | null>(null);

  // ---- data: categories
  useEffect(() => {
    apiFetch("/api/services/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.categories) setCategories(d.categories);
      })
      .catch(() => {});
  }, []);

  // ---- data: prefill address from profile
  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) return;
        // Profile-page edits saved on this device take precedence.
        try {
          const saved = window.localStorage.getItem(`ss.profile.${d.user.phone}`);
          if (saved) {
            const local = JSON.parse(saved);
            if (local.address && !address) setAddress(local.address);
            if (local.city && !city) setCity(local.city);
            if (local.pincode && !pincode) setPincode(local.pincode);
            return;
          }
        } catch {
          /* fall through to server profile */
        }
        if (d.user.profile) {
          const p = d.user.profile;
          if (p.address && !address) setAddress(p.address);
          if (p.city && !city) setCity(p.city);
          if (p.pincode && !pincode) setPincode(p.pincode);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- data: specific services per category
  useEffect(() => {
    if (categoryId) {
      apiFetch(`/api/services/specific?categoryId=${categoryId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.services && d.services.length > 0) {
            const formatted = d.services.map((s: SpecificService, idx: number) => ({
              id: s.id,
              name: s.name,
              rate: `₹${149 + idx * 50} base`,
              icon: DEFAULT_SPECIFIC_SERVICES[idx % DEFAULT_SPECIFIC_SERVICES.length].icon,
            }));
            setSpecificServices(formatted);
            setSelectedServiceId(formatted[0].id);
          } else {
            setSelectedServiceId(DEFAULT_SPECIFIC_SERVICES[0].id);
          }
        })
        .catch(() => {
          setSelectedServiceId(DEFAULT_SPECIFIC_SERVICES[0].id);
        });
    } else {
      // No category yet — defer the reset out of the effect body.
      const t = window.setTimeout(() => setSelectedServiceId(DEFAULT_SPECIFIC_SERVICES[0].id), 0);
      return () => clearTimeout(t);
    }
  }, [categoryId]);

  // ---- cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
      if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, [audioBlobUrl, cameraStream]);

  // ---- attach camera stream to <video>
  useEffect(() => {
    if (showCameraModal && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [showCameraModal, cameraStream]);

  /* ============================ Voice recording ============================ */
  const startRecording = async () => {
    setRecordingError("");
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
        setAudioBlobUrl(null);
      }
      setAudioUrl(null);
      setIsPlayingAudio(false);
      setCurrentAudioTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      audioChunksRef.current = [];
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", "audio/aac", ""];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (!m || (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))) {
          selectedMime = m;
          break;
        }
      }

      const recorder = selectedMime ? new MediaRecorder(stream, { mimeType: selectedMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || selectedMime || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
        const localBlobUrl = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(localBlobUrl);

        const reader = new FileReader();
        reader.onloadend = () => setAudioUrl(reader.result as string);
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => setRecordingSeconds((prev) => prev + 1), 1000);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-IN";
          recognition.onresult = (event: any) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) transcript += event.results[i][0].transcript + " ";
            }
            if (transcript.trim()) {
              setDescription((prev) => (prev ? prev + " " : "") + transcript.trim());
            }
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {}
      }
    } catch {
      setRecordingError("Microphone permission denied or unavailable — you can upload an audio file below.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    setAudioDuration(recordingSeconds || 1);
    setIsRecording(false);
  };

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      if (audioPlayerRef.current.ended || audioPlayerRef.current.currentTime >= (audioPlayerRef.current.duration || 0)) {
        audioPlayerRef.current.currentTime = 0;
      }
      audioPlayerRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
    }
  };

  const handleAudioSeek = (newTime: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = newTime;
      setCurrentAudioTime(newTime);
    }
  };

  const handleDeleteAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    setAudioBlobUrl(null);
    setAudioUrl(null);
    setIsPlayingAudio(false);
    setCurrentAudioTime(0);
    setAudioDuration(0);
    setRecordingSeconds(0);
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    setAudioBlobUrl(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) setAudioUrl(event.target.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ============================ Camera ============================ */
  const openCamera = async (facing: "environment" | "user" = cameraFacingMode) => {
    setShowCameraModal(true);
    setCameraError("");
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError("Camera unavailable or blocked. Opening file camera instead…");
      setShowCameraModal(false);
      fallbackCameraInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhotos((prev) => (prev.length >= 4 ? prev : [...prev, dataUrl]));
    setCameraFlash(true);
    setTimeout(() => setCameraFlash(false), 180);
    if (photos.length + 1 >= 4) closeCamera();
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextFacing);
    openCamera(nextFacing);
  };

  /* ============================ Photos ============================ */
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remainingSlots = 4 - photos.length;
    if (remainingSlots <= 0) return;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    filesToProcess.forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        setError("Photos must be under 8MB each.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => (prev.length >= 4 ? prev : [...prev, event.target!.result as string]));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  /* ============================ Scheduling helpers ============================ */
  const openCalendarPicker = () => {
    setTimingSlot("planned");
    try {
      datePickerInputRef.current?.showPicker();
    } catch {
      datePickerInputRef.current?.focus();
    }
  };

  const getQuickDates = () => {
    const dates = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
      const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dates.push({ dateStr, dayName, formatted });
    }
    return dates;
  };

  /* ============================ Submit ============================ */
  const handleBroadcast = async () => {
    if (!description.trim() && !audioUrl) {
      setError("Please describe the issue in writing, or record a voice note.");
      document.getElementById("problem-desc")?.focus();
      return;
    }
    if (!address.trim()) {
      setError("Please enter your service address.");
      document.getElementById("address")?.focus();
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let finalCatId = categoryId;
      const validCategory = categories.find((c) => c.id === finalCatId);
      if (!validCategory && categories.length > 0) {
        const found = categories.find((c) => c.name.toLowerCase().includes(categoryName.toLowerCase().split(" ")[0]));
        finalCatId = found ? found.id : categories[0].id;
      }

      const allMedia = [...photos];
      if (audioUrl) allMedia.push(audioUrl);

      let preferredTime: string | undefined;
      if (timingSlot === "planned") {
        const activeWindow = TIME_WINDOWS.find((w) => w.id === selectedTimeWindow) || TIME_WINDOWS[0];
        const [year, month, day] = scheduledDate.split("-").map(Number);
        const scheduleObj = new Date(year, month - 1, day, activeWindow.startHour, 0, 0);
        preferredTime = scheduleObj.toISOString();
      } else {
        preferredTime = new Date().toISOString();
      }

      const res = await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          categoryId: finalCatId,
          serviceId: selectedServiceId.startsWith("svc-") ? undefined : selectedServiceId,
          serviceDescription: description.trim() || (audioUrl ? "Voice note attached by customer" : "Service request"),
          address: address.trim(),
          city: city.trim() || undefined,
          pincode: pincode.trim() || undefined,
          isEmergency: timingSlot === "immediate",
          preferredTime,
          mediaUrls: allMedia,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to broadcast request. Please try again.");
        setSubmitting(false);
        return;
      }
      const bookingId = data.booking?.id;
      if (bookingId) router.push(`/customer/orders/${bookingId}`);
      else router.push("/customer/orders");
    } catch {
      setError("Network connection issue. Please check your connection.");
      setSubmitting(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  const selectedService = specificServices.find((s) => s.id === selectedServiceId);
  const selectedWindowObj = TIME_WINDOWS.find((w) => w.id === selectedTimeWindow) || TIME_WINDOWS[0];

  return (
    <PageContainer width="default" className="max-w-5xl">
      {/* Hidden audio element for playback */}
      <audio
        ref={audioPlayerRef}
        src={audioBlobUrl || audioUrl || undefined}
        preload="metadata"
        onEnded={() => {
          setIsPlayingAudio(false);
          setCurrentAudioTime(0);
        }}
        onPause={() => setIsPlayingAudio(false)}
        onPlay={() => setIsPlayingAudio(true)}
        onTimeUpdate={(e) => setCurrentAudioTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (e.currentTarget.duration && isFinite(e.currentTarget.duration)) {
            setAudioDuration(Math.round(e.currentTarget.duration));
          }
        }}
      />

      <PageHeader
        backHref="/customer"
        title="Book a service"
        description="Describe the job once — certified cooperative members nearby respond with fair estimates."
        meta={
          <>
            <Badge intent="brand" dot={false}>
              <ServiceIcon category={categoryName} size={13} className="mr-0.5" />
              {categoryName}
            </Badge>
            {timingSlot === "immediate" && (
              <Badge intent="warning" dot={false}>
                <Zap className="size-3 mr-0.5" aria-hidden />
                Immediate dispatch
              </Badge>
            )}
          </>
        }
      />

      {error && <ErrorNotice message={error} className="mb-5" onRetry={() => setError("")} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ================================================= Left: steps */}
        <div className="lg:col-span-2 space-y-5">
          {/* Step 1 — service scope */}
          <Card className="p-5 sm:p-6">
            <SectionHeading number="1" title="What exactly do you need?" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4" role="radiogroup" aria-label="Specific service">
              {specificServices.map((svc) => (
                <ChoiceCard
                  key={svc.id}
                  selected={selectedServiceId === svc.id}
                  onClick={() => setSelectedServiceId(svc.id)}
                  title={svc.name}
                  description={<span className="font-mono text-2xs">{svc.rate}</span>}
                />
              ))}
            </div>
          </Card>

          {/* Step 2 — describe problem */}
          <Card className="p-5 sm:p-6">
            <SectionHeading number="2" title="Describe the problem" aside={`${description.length}/400`} />
            <Field>
              <Textarea
                id="problem-desc"
                maxLength={400}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Kitchen tap keeps dripping, the handle is loose and water pools under the sink…"
                aria-label="Problem description"
                className="mt-4"
              />
            </Field>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {COMMON_ISSUE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setDescription((prev) => {
                      if (!prev.trim()) return chip;
                      if (prev.includes(chip)) return prev;
                      return `${prev}. ${chip}`;
                    })
                  }
                  className="rounded-full border border-line bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-800 hover:bg-brand-50 transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {/* Voice note */}
            <div className="mt-5 pt-5 border-t border-line">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink-900 flex items-center gap-2">
                  <Mic className="size-4 text-brand-700" aria-hidden />
                  Voice note <span className="font-medium text-ink-400">(optional)</span>
                </p>
                <span className="text-xs text-ink-400">Speak in any language</span>
              </div>

              {recordingError && <p className="text-xs text-danger-600 mt-2" role="alert">{recordingError}</p>}

              <div className="mt-3">
                {isRecording ? (
                  <div className="rounded-2xl bg-danger-50 border border-danger-200 p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="size-3 rounded-full bg-danger-500 animate-ping shrink-0" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-danger-700">Recording… {formatSeconds(recordingSeconds)}</p>
                        <p className="text-xs text-danger-600/80">Speech is transcribed into your description</p>
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={stopRecording}>
                      <MicOff className="size-4" aria-hidden />
                      Stop
                    </Button>
                  </div>
                ) : audioUrl || audioBlobUrl ? (
                  <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
                    <div className="flex items-center gap-3">
                      <Button variant="primary" size="icon" className="rounded-full shrink-0" onClick={togglePlayAudio} aria-label={isPlayingAudio ? "Pause voice note" : "Play voice note"}>
                        {isPlayingAudio ? <Pause className="size-4.5" /> : <Play className="size-4.5 ml-0.5" />}
                      </Button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink-900">{isPlayingAudio ? "Playing voice note…" : "Voice note ready"}</p>
                        <p className="text-xs text-ink-500 font-mono tabular-nums">
                          {formatSeconds(currentAudioTime)} / {formatSeconds(audioDuration || 1)}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={startRecording} aria-label="Re-record">
                        <RefreshCcw className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={handleDeleteAudio} aria-label="Delete voice note" className="text-danger-600 hover:bg-danger-50">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 1}
                      step={0.1}
                      value={currentAudioTime}
                      onChange={(e) => handleAudioSeek(parseFloat(e.target.value))}
                      aria-label="Seek voice note"
                      className="w-full h-1.5 mt-3 bg-brand-100 rounded-lg appearance-none cursor-pointer accent-brand-700"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button variant="secondary" onClick={startRecording}>
                      <Mic className="size-4" aria-hidden />
                      Record voice
                    </Button>
                    <Button variant="outline" onClick={() => audioInputRef.current?.click()}>
                      <Upload className="size-4" aria-hidden />
                      Upload audio
                    </Button>
                  </div>
                )}
                <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioFileUpload} className="hidden" />
              </div>
            </div>
          </Card>

          {/* Step 3 — photos */}
          <Card className="p-5 sm:p-6">
            <SectionHeading number="3" title="Add inspection photos" aside={`${photos.length}/4 · optional`} />
            <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
            <input ref={fallbackCameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />

            {photos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-4">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-line bg-ink-100 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Inspection photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      aria-label={`Remove photo ${idx + 1}`}
                      className="absolute top-1.5 right-1.5 size-7 rounded-full bg-ink-950/60 text-white flex items-center justify-center hover:bg-ink-950/80 transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < 4 && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-line-strong bg-ink-50 flex flex-col items-center justify-center gap-1.5 text-ink-400 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50/50 transition-colors"
                  >
                    <ImagePlus className="size-5" aria-hidden />
                    <span className="text-2xs font-bold">Add photo</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-line-strong bg-ink-50 p-6 text-center">
                <Camera className="size-6 text-ink-400 mx-auto" aria-hidden />
                <p className="text-sm font-bold text-ink-800 mt-2">No photos added yet</p>
                <p className="text-xs text-ink-400 mt-0.5 mb-4">Photos help providers quote accurately — no surprise markups.</p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Button variant="primary" size="sm" onClick={() => openCamera()}>
                    <Camera className="size-4" aria-hidden />
                    Take photo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                    <ImageIcon className="size-4" aria-hidden />
                    Choose from device
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Step 4 — schedule & location */}
          <Card className="p-5 sm:p-6">
            <SectionHeading number="4" title="When &amp; where" />

            {/* Timing selector */}
            <div className="grid grid-cols-2 gap-2.5 mt-4" role="radiogroup" aria-label="Timing">
              <ChoiceCard
                selected={timingSlot === "immediate"}
                onClick={() => setTimingSlot("immediate")}
                icon={<Zap />}
                title="Immediate"
                description="Today, within ~2 hours"
              />
              <ChoiceCard
                selected={timingSlot === "planned"}
                onClick={() => setTimingSlot("planned")}
                icon={<CalendarDays />}
                title="Planned"
                description="Pick a date & time window"
              />
            </div>

            {timingSlot === "planned" && (
              <div className="mt-4 rounded-2xl bg-ink-50 border border-line p-4 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink-800">Pick a day</p>
                  <div className="relative">
                    <input
                      ref={datePickerInputRef}
                      type="date"
                      min={todayStr}
                      value={scheduledDate}
                      onChange={(e) => e.target.value && setScheduledDate(e.target.value)}
                      aria-label="Choose date"
                      className="absolute opacity-0 pointer-events-none size-0"
                    />
                    <Button variant="outline" size="sm" onClick={openCalendarPicker}>
                      <CalendarDays className="size-4" aria-hidden />
                      Calendar
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {getQuickDates().map((item) => {
                    const selected = scheduledDate === item.dateStr;
                    return (
                      <button
                        key={item.dateStr}
                        type="button"
                        onClick={() => setScheduledDate(item.dateStr)}
                        aria-pressed={selected}
                        className={cn(
                          "rounded-xl border px-1.5 py-2 text-center transition-colors",
                          selected ? "bg-brand-700 text-white border-brand-700 shadow-xs" : "bg-white border-line hover:border-line-strong"
                        )}
                      >
                        <span className="text-xs font-bold block">{item.dayName}</span>
                        <span className={cn("text-2xs block mt-0.5 font-mono", selected ? "text-brand-100" : "text-ink-400")}>{item.formatted}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <p className="text-sm font-bold text-ink-800 mb-2">Preferred time window</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TIME_WINDOWS.map((win) => {
                      const selected = selectedTimeWindow === win.id;
                      return (
                        <button
                          key={win.id}
                          type="button"
                          onClick={() => setSelectedTimeWindow(win.id)}
                          aria-pressed={selected}
                          className={cn(
                            "rounded-xl border px-3.5 py-2.5 flex items-center gap-3 text-left transition-colors",
                            selected ? "bg-brand-700 text-white border-brand-700 shadow-xs" : "bg-white border-line hover:border-line-strong"
                          )}
                        >
                          <win.icon className={cn("size-4.5 shrink-0", selected ? "text-accent-300" : "text-accent-600")} aria-hidden />
                          <span className="min-w-0">
                            <span className="text-sm font-bold block">{win.label}</span>
                            <span className={cn("text-2xs font-mono block mt-0.5", selected ? "text-brand-100" : "text-ink-400")}>{win.time}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Address */}
            <div className="mt-5 pt-5 border-t border-line">
              <Field label="Service address" required hint="House/flat, street, landmark">
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 size-4.5 text-accent-600" aria-hidden />
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 45 Pattom Road, near post office"
                    className="pl-10.5"
                  />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="City">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </Field>
                <Field label="Pincode">
                  <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" inputMode="numeric" />
                </Field>
              </div>
            </div>
          </Card>
        </div>

        {/* ================================================= Right: summary */}
        <div className="lg:sticky lg:top-20 space-y-4">
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-400">Request summary</p>
            <dl className="mt-4 space-y-3.5 text-sm">
              <div className="flex items-start gap-3">
                <span className="size-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0" aria-hidden>
                  <ServiceIcon category={categoryName} size={16} />
                </span>
                <div className="min-w-0">
                  <dt className="text-ink-400 text-xs">Service</dt>
                  <dd className="font-bold text-ink-900 leading-snug">{selectedService?.name ?? categoryName}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="size-8 rounded-lg bg-accent-50 text-accent-700 flex items-center justify-center shrink-0" aria-hidden>
                  <AlarmClock size={16} />
                </span>
                <div className="min-w-0">
                  <dt className="text-ink-400 text-xs">Timing</dt>
                  <dd className="font-bold text-ink-900 leading-snug">
                    {timingSlot === "immediate"
                      ? "Immediate • within ~2 hours"
                      : `${new Date(scheduledDate + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} • ${selectedWindowObj.label}`}
                  </dd>
                </div>
              </div>
              {(photos.length > 0 || audioUrl) && (
                <div className="flex items-start gap-3">
                  <span className="size-8 rounded-lg bg-ink-100 text-ink-600 flex items-center justify-center shrink-0" aria-hidden>
                    <ImagePlus size={16} />
                  </span>
                  <div>
                    <dt className="text-ink-400 text-xs">Attachments</dt>
                    <dd className="font-bold text-ink-900">
                      {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? "s" : ""}` : ""}
                      {photos.length > 0 && audioUrl ? " · " : ""}
                      {audioUrl ? "1 voice note" : ""}
                    </dd>
                  </div>
                </div>
              )}
            </dl>

            <div className="mt-5 rounded-xl bg-brand-50 border border-brand-100 p-3.5 flex gap-2.5">
              <ShieldCheck className="size-4.5 text-brand-700 shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-brand-900/90 leading-relaxed">
                <strong>Fair-price guarantee:</strong> estimates follow cooperative benchmarks. The final
                price is confirmed on-site with your approval before work begins.
              </p>
            </div>

            <Button
              onClick={handleBroadcast}
              loading={submitting}
              size="lg"
              className="w-full mt-5"
            >
              {!submitting && <Radio className="size-4.5" aria-hidden />}
              {submitting
                ? "Broadcasting to members…"
                : timingSlot === "immediate"
                  ? "Broadcast request now"
                  : "Schedule request"}
            </Button>
            <p className="mt-3 text-2xs text-ink-400 text-center leading-relaxed">
              Zero commission markups · Escrow-secured payment · Society-audited members
            </p>
          </Card>
        </div>
      </div>

      {/* ================================================= Camera modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-100 bg-ink-950/90 backdrop-blur-sm flex flex-col justify-between items-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Camera">
          <div className="w-full max-w-md flex items-center justify-between text-white pt-safe">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-success-400 animate-pulse" aria-hidden />
              <span className="text-sm font-bold">Camera</span>
            </div>
            <button
              type="button"
              onClick={closeCamera}
              aria-label="Close camera"
              className="size-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="relative w-full max-w-md aspect-[3/4] max-h-[60dvh] rounded-3xl overflow-hidden bg-black border border-white/20 shadow-overlay">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {cameraFlash && <div className="absolute inset-0 bg-white opacity-90 pointer-events-none" />}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-mono font-bold px-2.5 py-1 rounded-full">
              {photos.length}/4 photos
            </div>
            {cameraError && <div className="absolute top-3 inset-x-3 text-center text-danger-300 text-xs">{cameraError}</div>}
          </div>

          <div className="w-full max-w-md flex items-center justify-around pb-6 pt-2">
            <button
              type="button"
              onClick={toggleCameraFacing}
              aria-label="Flip camera"
              className="size-12 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 active:scale-95 transition-all"
            >
              <SwitchCamera className="size-5.5" />
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              disabled={photos.length >= 4}
              aria-label="Take picture"
              className="size-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-90 transition-transform shadow-raised disabled:opacity-50"
            >
              <span className="w-full h-full rounded-full bg-white" />
            </button>
            <Button variant="secondary" onClick={closeCamera} className="rounded-full">
              <Check className="size-4" aria-hidden />
              Done
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function SectionHeading({ number, title, aside }: { number: string; title: React.ReactNode; aside?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-ink-900 flex items-center gap-2.5">
        <span aria-hidden className="size-6.5 rounded-full bg-brand-700 text-white text-xs font-extrabold flex items-center justify-center">
          {number}
        </span>
        {title}
      </h2>
      {aside && <span className="text-xs text-ink-400 font-medium shrink-0">{aside}</span>}
    </div>
  );
}

export default function BookServicePage() {
  return (
    <Suspense fallback={<div className="min-h-[60dvh]" />}>
      <BookServiceContent />
    </Suspense>
  );
}
