"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SahakariEmblem from "@/components/SahakariEmblem";
import { ServiceCategory, SpecificService } from "@/lib/types";

// Standard guild scopes for electrical or generic trades
const DEFAULT_SPECIFIC_SERVICES = [
  { id: "svc-1", name: "Fan Repair & Installation", rate: "₹149 Base Rate", icon: "mode_fan" },
  { id: "svc-2", name: "Switchboard & MCB Wiring", rate: "₹199 Base Rate", icon: "toggle_on" },
  { id: "svc-3", name: "Inverter & Battery Wiring", rate: "₹299 Base Rate", icon: "battery_charging_full" },
  { id: "svc-4", name: "Appliance Power Point", rate: "₹179 Base Rate", icon: "power" },
  { id: "svc-5", name: "Wiring Audit & Diagnostic", rate: "₹499 Inspection", icon: "build" },
  { id: "svc-6", name: "Other Specific Issue", rate: "Custom Quote", icon: "edit_note" },
];

// Helpful suggestion chips (optional quick-fill choices for user)
const COMMON_ISSUE_CHIPS = [
  "Not turning on / No power",
  "Making unusual noise",
  "Sparking or burning smell",
  "Water leakage or pipe blockage",
  "Component replacement needed",
  "General checkup & diagnostic",
];

// Standard union cooperative service time windows
const TIME_WINDOWS = [
  { id: "morning", label: "Morning", time: "09:00 AM - 12:00 PM", icon: "wb_sunny", startHour: 9 },
  { id: "afternoon", label: "Afternoon", time: "12:00 PM - 03:00 PM", icon: "sunny", startHour: 12 },
  { id: "evening", label: "Evening", time: "03:00 PM - 06:00 PM", icon: "wb_twilight", startHour: 15 },
  { id: "night", label: "Late Evening", time: "06:00 PM - 08:30 PM", icon: "dark_mode", startHour: 18 },
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

  // Form Fields - Start empty by default as requested
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentAudioTime, setCurrentAudioTime] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState("");

  // In-App Camera Viewfinder state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");

  // Timing & Schedule State
  const [timingSlot, setTimingSlot] = useState<"immediate" | "planned">(
    initialEmergency ? "immediate" : "immediate"
  );

  // Default to tomorrow for planned bookings
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

  // Refs for media elements
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

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/services/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.categories) setCategories(d.categories);
      })
      .catch(() => {});
  }, []);

  // Fetch user profile to prefill customer's real registered address if available
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.profile) {
          const p = d.user.profile;
          if (p.address && !address) setAddress(p.address);
          if (p.city && !city) setCity(p.city);
          if (p.pincode && !pincode) setPincode(p.pincode);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch specific services for selected category
  useEffect(() => {
    if (categoryId) {
      fetch(`/api/services/specific?categoryId=${categoryId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.services && d.services.length > 0) {
            const formatted = d.services.map((s: SpecificService, idx: number) => ({
              id: s.id,
              name: s.name,
              rate: `₹${149 + idx * 50} Base Rate`,
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
      setSelectedServiceId(DEFAULT_SPECIFIC_SERVICES[0].id);
    }
  }, [categoryId]);

  // Clean up streams & audio elements on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, [audioBlobUrl, cameraStream]);

  // Connect camera stream to video element when camera modal is visible
  useEffect(() => {
    if (showCameraModal && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => {
        console.warn("Video play error:", err);
      });
    }
  }, [showCameraModal, cameraStream]);

  // ==========================================
  // 1. VOICE RECORDING & PLAYBACK
  // ==========================================

  const startRecording = async () => {
    setRecordingError("");
    try {
      // Clear any existing audio player state
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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioChunksRef.current = [];

      // Determine best supported audio format
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/aac",
        "",
      ];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (!m || (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))) {
          selectedMime = m;
          break;
        }
      }

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || selectedMime || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });

        // Create instantaneous object URL for high-fidelity playback
        const localBlobUrl = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(localBlobUrl);

        // Also convert to data URL for persistent upload
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioUrl(base64Audio);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Optional real-time speech recognition if supported
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-IN";
          recognition.onresult = (event: any) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript + " ";
              }
            }
            if (transcript.trim()) {
              setDescription((prev) => (prev ? prev + " " : "") + transcript.trim());
            }
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {}
      }
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setRecordingError("Microphone permission denied or not available. You can upload an audio file below.");
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
      // If at end, rewind to start
      if (
        audioPlayerRef.current.ended ||
        audioPlayerRef.current.currentTime >= (audioPlayerRef.current.duration || 0)
      ) {
        audioPlayerRef.current.currentTime = 0;
      }
      audioPlayerRef.current
        .play()
        .then(() => {
          setIsPlayingAudio(true);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          setIsPlayingAudio(false);
        });
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
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }
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
    const localUrl = URL.createObjectURL(file);
    setAudioBlobUrl(localUrl);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAudioUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ==========================================
  // 2. IN-APP LIVE CAMERA ("TAKE PHOTO")
  // ==========================================

  const openCamera = async (facing: "environment" | "user" = cameraFacingMode) => {
    setShowCameraModal(true);
    setCameraError("");

    // Stop existing camera stream if switching
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Live camera access failed:", err);
      setCameraError("Camera unavailable or blocked. Opening file camera instead...");
      setShowCameraModal(false);
      // Fallback: trigger standard capture file input
      if (fallbackCameraInputRef.current) {
        fallbackCameraInputRef.current.click();
      }
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

    setPhotos((prev) => {
      if (prev.length >= 4) return prev;
      return [...prev, dataUrl];
    });

    // Visual camera flash effect
    setCameraFlash(true);
    setTimeout(() => setCameraFlash(false), 180);

    // Auto-close if reached 4 photos
    if (photos.length + 1 >= 4) {
      closeCamera();
    }
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
          setPhotos((prev) => {
            if (prev.length >= 4) return prev;
            return [...prev, event.target!.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos(photos.filter((_, idx) => idx !== index));
  };

  // Quick Problem tag chips
  const handleChipClick = (chipText: string) => {
    setDescription((prev) => {
      if (!prev.trim()) return chipText;
      if (prev.includes(chipText)) return prev;
      return `${prev}. ${chipText}`;
    });
  };

  // ==========================================
  // 3. SERVICE SCHEDULING (CALENDAR & TIME SLOTS)
  // ==========================================

  const openCalendarPicker = () => {
    setTimingSlot("planned");
    try {
      datePickerInputRef.current?.showPicker();
    } catch {
      datePickerInputRef.current?.focus();
    }
  };

  // Generate 4 dynamic quick dates starting today
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

  // ==========================================
  // 4. BROADCAST & SUBMIT
  // ==========================================

  const handleBroadcast = async () => {
    if (!description.trim() && !audioUrl) {
      setError("Please describe the issue in writing or record a voice note.");
      return;
    }

    if (!address.trim()) {
      setError("Please enter your service address.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let finalCatId = categoryId;
      const validCategory = categories.find((c) => c.id === finalCatId);
      if (!validCategory && categories.length > 0) {
        const found = categories.find((c) =>
          c.name.toLowerCase().includes(categoryName.toLowerCase().split(" ")[0])
        );
        finalCatId = found ? found.id : categories[0].id;
      }

      // Package all media attachments (photos + audio note if recorded)
      const allMedia = [...photos];
      if (audioUrl) {
        allMedia.push(audioUrl);
      }

      // Construct preferred scheduled timestamp if planned
      let preferredTime: string | undefined = undefined;
      if (timingSlot === "planned") {
        const activeWindow = TIME_WINDOWS.find((w) => w.id === selectedTimeWindow) || TIME_WINDOWS[0];
        const [year, month, day] = scheduledDate.split("-").map(Number);
        const scheduleObj = new Date(year, month - 1, day, activeWindow.startHour, 0, 0);
        preferredTime = scheduleObj.toISOString();
      } else {
        preferredTime = new Date().toISOString();
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (bookingId) {
        router.push(`/customer/orders/${bookingId}`);
      } else {
        router.push("/customer/orders");
      }
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

  const selectedWindowObj = TIME_WINDOWS.find((w) => w.id === selectedTimeWindow) || TIME_WINDOWS[0];

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col pb-24">
      {/* Hidden Native Audio Player for rock-solid playback */}
      <audio
        ref={audioPlayerRef}
        src={audioBlobUrl || audioUrl || ""}
        preload="metadata"
        onEnded={() => {
          setIsPlayingAudio(false);
          setCurrentAudioTime(0);
        }}
        onPause={() => setIsPlayingAudio(false)}
        onPlay={() => setIsPlayingAudio(true)}
        onTimeUpdate={(e) => {
          setCurrentAudioTime(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => {
          if (e.currentTarget.duration && isFinite(e.currentTarget.duration)) {
            setAudioDuration(Math.round(e.currentTarget.duration));
          }
        }}
      />

      {/* Fixed Civic Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#d1ddd8] shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 max-w-md mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-on-surface hover:bg-[#f2f3ff] active:scale-95 transition-all"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <SahakariEmblem size={28} />
            <h1 className="text-[15px] font-bold text-on-surface truncate">Booking Formulation</h1>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#134e3f] text-white flex items-center justify-center text-[12px] font-bold shadow-xs">
            C
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-18">
        {/* Civic Flow Breadcrumb */}
        <div className="py-2 px-3 my-2 rounded-xl bg-[#f2f3ff] border border-[#d1ddd8] flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#707975] truncate">
              {categoryName}
            </span>
            <span className="material-symbols-outlined text-[14px] text-[#707975]">chevron_right</span>
            <span className="text-[11px] font-bold text-[#134e3f] truncate">Service Scope</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 bg-[#eaedff] px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fe932c]"></span>
            <span className="font-mono text-[10px] text-[#134e3f] font-bold">STEP 2 OF 3</span>
          </div>
        </div>

        {/* Protocol Standardized Banner */}
        <div className="civic-card p-3 mb-3 bg-[#f2f3ff] flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#134e3f] text-white flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-on-surface">Sahakari Federation Protocol</span>
              <span className="bg-[#b5efda] text-[#002018] font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                Standardized
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
              Zero commission platform. Verified member-technicians deliver transparent rate-card pricing.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#ffdad6] text-[#ba1a1a] text-[12px] flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {/* Specific Service Selection Grid */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[14px] font-bold text-on-surface">Select Specific Service Scope</h2>
            <span className="text-[11px] text-[#904d00] font-semibold">1 Required</span>
          </div>

          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {specificServices.map((svc) => {
              const isSelected = selectedServiceId === svc.id;
              return (
                <button
                  key={svc.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={`text-left p-3 rounded-xl transition-all duration-200 flex flex-col justify-between h-26 relative border ${
                    isSelected
                      ? "bg-[#134e3f] text-white border-[#00362a] shadow-md scale-[1.01]"
                      : "bg-white text-on-surface border-[#d1ddd8] hover:bg-[#f2f3ff]"
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-white/15 text-[#85f8c4]" : "bg-[#f2f3ff] text-[#134e3f]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{svc.icon}</span>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        isSelected ? "text-[#85f8c4]" : "text-[#bfc9c3]"
                      }`}
                    >
                      {isSelected ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] font-bold block leading-tight truncate">{svc.name}</span>
                    <span
                      className={`font-mono text-[10px] mt-0.5 block font-semibold ${
                        isSelected ? "text-[#b5efda]" : "text-[#707975]"
                      }`}
                    >
                      {svc.rate}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Problem Description & Voice Note Section */}
        <section className="civic-card p-3.5 mb-3">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="problem-desc" className="text-[13px] font-bold text-on-surface">
              Describe the problem clearly
            </label>
            <span className="font-mono text-[11px] text-[#707975]">{description.length}/400</span>
          </div>

          <textarea
            id="problem-desc"
            maxLength={400}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type your issue details (e.g., tap leaking, switchboard sparking, fan making noise, light installation)..."
            className="w-full bg-[#f2f3ff] rounded-xl p-3 text-[13px] text-on-surface placeholder:text-[#707975] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#134e3f]/20 border border-[#d1ddd8] transition-all resize-none shadow-inner"
          />

          {/* Quick Problem Choice Chips */}
          <div className="mt-2.5">
            <span className="text-[11px] font-semibold text-[#707975] block mb-1.5">
              Quick issue tags (tap to add):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ISSUE_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#eaedff] text-[#134e3f] hover:bg-[#d8e0ff] active:scale-95 transition-all border border-[#d1ddd8]"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-[#eaedff] flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] text-[#707975]">
              <span className="material-symbols-outlined text-[14px]">translate</span>
              <span>Visible to all cooperative technicians</span>
            </div>
            {description && (
              <button
                type="button"
                onClick={() => setDescription("")}
                className="text-[11px] text-[#ba1a1a] hover:underline font-semibold"
              >
                Clear text
              </button>
            )}
          </div>

          {/* Voice Note & Interactive Audio Player */}
          <div className="mt-3 pt-3 border-t border-[#eaedff]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#134e3f]">mic</span>
                Voice Note (Optional)
              </span>
              <span className="text-[10px] text-[#707975]">Any language / Voice description</span>
            </div>

            {recordingError && (
              <p className="text-[11px] text-[#ba1a1a] mb-2">{recordingError}</p>
            )}

            {/* Audio Recording in Progress UI */}
            {isRecording ? (
              <div className="p-3.5 rounded-xl bg-[#ffdad6] border border-[#ba1a1a] flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#ba1a1a] animate-ping shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-[#ba1a1a]">
                      Recording voice note... ({recordingSeconds}s)
                    </span>
                    <span className="text-[11px] text-[#ba1a1a]/80">Speak clearly near microphone</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3.5 py-1.5 bg-[#ba1a1a] text-white rounded-lg text-[12px] font-bold shadow-xs hover:bg-[#93000a] active:scale-95 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">stop</span>
                  Done / Stop
                </button>
              </div>
            ) : audioUrl || audioBlobUrl ? (
              /* Recorded / Selected Interactive Audio Player UI */
              <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#134e3f]/30 flex flex-col gap-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="w-10 h-10 rounded-full bg-[#134e3f] text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 hover:bg-[#00362a] transition-all"
                      aria-label={isPlayingAudio ? "Pause" : "Play"}
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {isPlayingAudio ? "pause" : "play_arrow"}
                      </span>
                    </button>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold text-on-surface truncate flex items-center gap-1.5">
                        <span>{isPlayingAudio ? "Playing Voice Note" : "Voice Note Ready"}</span>
                        {isPlayingAudio && (
                          <span className="flex items-center gap-0.5">
                            <span className="w-1 h-3 bg-[#134e3f] rounded-full animate-bounce" />
                            <span className="w-1 h-4 bg-[#134e3f] rounded-full animate-bounce [animation-delay:0.15s]" />
                            <span className="w-1 h-2 bg-[#134e3f] rounded-full animate-bounce [animation-delay:0.3s]" />
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-[#707975]">
                        {formatSeconds(currentAudioTime)} / {formatSeconds(audioDuration || 1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="text-[11px] text-[#134e3f] font-semibold hover:underline px-2 py-1 flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      Re-record
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAudio}
                      className="w-8 h-8 rounded-full text-[#ba1a1a] hover:bg-[#ffdad6] flex items-center justify-center transition-colors"
                      title="Delete audio note"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Audio Scrubber Bar */}
                <div className="w-full flex items-center gap-2 pt-1">
                  <input
                    type="range"
                    min={0}
                    max={audioDuration || 1}
                    step={0.1}
                    value={currentAudioTime}
                    onChange={(e) => handleAudioSeek(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#d1ddd8] rounded-lg appearance-none cursor-pointer accent-[#134e3f]"
                  />
                </div>
              </div>
            ) : (
              /* Default Voice Record & Audio Upload Buttons */
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className="py-2.5 px-3 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] border border-[#d1ddd8] text-on-surface flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <div className="w-6 h-6 rounded-full bg-[#134e3f] text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[14px]">mic</span>
                  </div>
                  <span className="text-[11px] font-bold">Record Voice</span>
                </button>

                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] border border-[#d1ddd8] text-on-surface flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <div className="w-6 h-6 rounded-full bg-white text-[#904d00] flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[14px]">audio_file</span>
                  </div>
                  <span className="text-[11px] font-bold">Choose Audio</span>
                </button>
              </div>
            )}

            {/* Hidden Audio File Input */}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioFileUpload}
              className="hidden"
            />
          </div>
        </section>

        {/* Inspection Media Upload */}
        <section className="civic-card p-3.5 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13px] font-bold text-on-surface">Inspection Photos</h2>
              <span className="bg-[#ffdcc3] text-[#904d00] font-mono text-[10px] px-2 py-0.2 rounded-full font-bold">
                {photos.length}/4 Added
              </span>
            </div>
            <span className="text-[11px] text-[#707975]">Optional</span>
          </div>

          {/* Hidden File & Fallback Camera Inputs */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <input
            ref={fallbackCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {photos.map((url, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-xl overflow-hidden bg-[#e2e7ff] border border-[#d1ddd8] shadow-xs group"
                >
                  <img
                    src={url}
                    alt={`Inspection photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center shadow-md hover:bg-black/80 transition-colors"
                    title="Remove photo"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}

              {photos.length < 4 && (
                <div className="aspect-square rounded-xl bg-[#f2f3ff] border border-dashed border-[#bfc9c3] flex flex-col items-center justify-center gap-1.5 p-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openCamera()}
                      className="w-8 h-8 rounded-full bg-[#134e3f] text-white flex items-center justify-center shadow-xs active:scale-95"
                      title="Take another photo"
                    >
                      <span className="material-symbols-outlined text-[16px]">camera_alt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-8 h-8 rounded-full bg-white text-[#134e3f] border border-[#d1ddd8] flex items-center justify-center shadow-xs active:scale-95"
                      title="Select from gallery"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_library</span>
                    </button>
                  </div>
                  <span className="text-[9px] font-bold text-[#707975] text-center leading-tight">Add Photo</span>
                </div>
              )}
            </div>
          ) : (
            /* Empty State with Choice to Browse Files or Open Live Camera */
            <div className="p-3 rounded-xl bg-[#f2f3ff] border border-dashed border-[#bfc9c3] text-center">
              <div className="w-10 h-10 rounded-full bg-white text-[#134e3f] flex items-center justify-center mx-auto mb-2 shadow-xs">
                <span className="material-symbols-outlined text-[22px]">photo_camera</span>
              </div>
              <p className="text-[12px] font-bold text-on-surface">No photos added yet</p>
              <p className="text-[10px] text-on-surface-variant mt-0.5 mb-2.5">
                Take a photo directly with camera or select from device files.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-[#d1ddd8] text-[#134e3f] text-[11px] font-bold hover:bg-[#eaedff] flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">photo_library</span>
                  Select from Photos
                </button>
                <button
                  type="button"
                  onClick={() => openCamera()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#134e3f] text-white text-[11px] font-bold hover:bg-[#00362a] flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">camera_alt</span>
                  Take Photo (Camera)
                </button>
              </div>
            </div>
          )}

          <p className="text-[10px] text-on-surface-variant mt-2">
            Photos help cooperative providers quote fair, accurate estimates without surprise markups.
          </p>
        </section>

        {/* Schedule & Location Card */}
        <section className="civic-card p-3.5 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[13px] font-bold text-on-surface">Service Schedule & Location</h2>
            <span className="font-mono text-[10px] text-[#059669] font-bold">Co-op Verified</span>
          </div>

          {/* Address Inputs */}
          <div className="p-2.5 rounded-xl bg-[#f2f3ff] border border-[#d1ddd8] mb-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-[#ffdcc3] flex items-center justify-center text-[#904d00] shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-[#707975] block">
                  Service Address (House/Flat, Street, Landmark)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 45 Pattom Road, Near Post Office"
                  className="w-full bg-white rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-on-surface border border-[#d1ddd8] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pl-9">
              <div>
                <label className="text-[9px] font-semibold text-[#707975] block">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full bg-white rounded-lg px-2 py-1 text-[11px] text-on-surface border border-[#d1ddd8] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-semibold text-[#707975] block">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                  className="w-full bg-white rounded-lg px-2 py-1 text-[11px] text-on-surface border border-[#d1ddd8] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Time Slot Main Selector Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setTimingSlot("immediate")}
              className={`p-3 rounded-xl border text-left transition-all ${
                timingSlot === "immediate"
                  ? "bg-[#134e3f] text-white border-[#00362a] shadow-xs"
                  : "bg-white text-on-surface border-[#d1ddd8] hover:bg-[#f2f3ff]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">Immediate</span>
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    timingSlot === "immediate" ? "text-[#fe932c]" : "text-[#707975]"
                  }`}
                >
                  bolt
                </span>
              </div>
              <span
                className={`text-[10px] block mt-1 ${
                  timingSlot === "immediate" ? "text-[#b5efda]" : "text-[#707975]"
                }`}
              >
                Today, within 2 hours
              </span>
            </button>

            <button
              type="button"
              onClick={openCalendarPicker}
              className={`p-3 rounded-xl border text-left transition-all ${
                timingSlot === "planned"
                  ? "bg-[#134e3f] text-white border-[#00362a] shadow-xs ring-2 ring-[#134e3f]/20"
                  : "bg-white text-on-surface border-[#d1ddd8] hover:bg-[#f2f3ff]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">Planned</span>
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    timingSlot === "planned" ? "text-[#85f8c4]" : "text-[#134e3f]"
                  }`}
                >
                  calendar_month
                </span>
              </div>
              <span
                className={`text-[10px] block mt-1 ${
                  timingSlot === "planned" ? "text-[#b5efda]" : "text-[#707975]"
                }`}
              >
                Tap to schedule date & time
              </span>
            </button>
          </div>

          {/* Interactive Planned Scheduling Box (Revealed when Planned is selected or calendar icon tapped) */}
          {timingSlot === "planned" ? (
            <div className="p-3 rounded-xl bg-[#eaedff] border border-[#134e3f]/30 space-y-3 animate-in fade-in duration-200">
              {/* Date Header & Custom Picker Button */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#134e3f]">event</span>
                  Select Date
                </span>

                {/* Calendar Icon Button with direct showPicker call */}
                <div className="relative">
                  <input
                    ref={datePickerInputRef}
                    type="date"
                    min={todayStr}
                    value={scheduledDate}
                    onChange={(e) => {
                      if (e.target.value) setScheduledDate(e.target.value);
                    }}
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                  />
                  <button
                    type="button"
                    onClick={openCalendarPicker}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#d1ddd8] text-[#134e3f] text-[11px] font-bold flex items-center gap-1 shadow-2xs hover:bg-[#d8e0ff] active:scale-95"
                    title="Open calendar to choose date"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#134e3f]">calendar_month</span>
                    Pick Calendar Date
                  </button>
                </div>
              </div>

              {/* Quick Date Pills */}
              <div className="grid grid-cols-4 gap-1.5">
                {getQuickDates().map((item) => {
                  const isSelected = scheduledDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setScheduledDate(item.dateStr)}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        isSelected
                          ? "bg-[#134e3f] text-white border-[#00362a] shadow-xs"
                          : "bg-white text-on-surface border-[#d1ddd8] hover:bg-[#f2f3ff]"
                      }`}
                    >
                      <span className="text-[11px] font-bold block">{item.dayName}</span>
                      <span
                        className={`text-[9px] block font-mono ${
                          isSelected ? "text-[#b5efda]" : "text-[#707975]"
                        }`}
                      >
                        {item.formatted}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Time Window Selector */}
              <div>
                <span className="text-[12px] font-bold text-on-surface block mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#134e3f]">schedule</span>
                  Preferred Time Window
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {TIME_WINDOWS.map((win) => {
                    const isSelected = selectedTimeWindow === win.id;
                    return (
                      <button
                        key={win.id}
                        type="button"
                        onClick={() => setSelectedTimeWindow(win.id)}
                        className={`p-2 rounded-xl border text-left flex items-start gap-2 transition-all ${
                          isSelected
                            ? "bg-[#134e3f] text-white border-[#00362a] shadow-xs"
                            : "bg-white text-on-surface border-[#d1ddd8] hover:bg-[#f2f3ff]"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[16px] mt-0.5 ${
                            isSelected ? "text-[#85f8c4]" : "text-[#904d00]"
                          }`}
                        >
                          {win.icon}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold block">{win.label}</span>
                          <span
                            className={`text-[9px] block leading-tight font-mono ${
                              isSelected ? "text-[#b5efda]" : "text-[#707975]"
                            }`}
                          >
                            {win.time}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Scheduled Summary Badge */}
              <div className="p-2.5 rounded-xl bg-white border border-[#134e3f]/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#134e3f] text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-on-surface block">
                      Scheduled for: {new Date(scheduledDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
                    </span>
                    <span className="text-[10px] text-[#707975]">
                      Window: {selectedWindowObj.time}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openCalendarPicker}
                  className="text-[11px] font-bold text-[#134e3f] hover:underline"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#b5efda]/20 border border-[#134e3f]/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#059669]">bolt</span>
              <p className="text-[11px] text-on-surface leading-tight">
                <strong>Immediate Priority:</strong> Assigned cooperative technician will arrive at your address within 2 hours.
              </p>
            </div>
          )}
        </section>

        {/* Cooperative Transparent Upfront Notice */}
        <div className="civic-card p-3 mb-4 bg-[#eaedff] flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#134e3f]/15 flex items-center justify-center text-[#134e3f] shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">handshake</span>
          </div>
          <div className="flex-1">
            <span className="text-[12px] font-bold text-on-surface block">Initial Quote Guarantee</span>
            <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
              Technicians submit initial estimates. Exact parts and labour final price will be confirmed on-site before work starts with mutual approval.
            </p>
          </div>
        </div>

        {/* Live Member Dispatch Signal & Master Action Button */}
        <div className="flex flex-col gap-2 pb-6">
          <div className="flex items-center justify-center gap-2 text-on-surface-variant text-[11px]">
            <div className="flex -space-x-1.5 overflow-hidden">
              <span className="w-5 h-5 rounded-full bg-[#134e3f] text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                R
              </span>
              <span className="w-5 h-5 rounded-full bg-[#904d00] text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                S
              </span>
              <span className="w-5 h-5 rounded-full bg-[#005036] text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                A
              </span>
            </div>
            <span>
              <strong>Certified Union Tradespeople</strong> nearby
            </span>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleBroadcast}
            className="w-full h-12 bg-[#134e3f] text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-md hover:bg-[#00362a] active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                <span>Connecting to Guild Specialists...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">sensors</span>
                <span>
                  {timingSlot === "immediate"
                    ? "Broadcast Immediate Dispatch"
                    : `Schedule for ${new Date(scheduledDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-3 text-[#707975] text-[10px]">
            <span className="flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px] text-[#904d00]">gavel</span>
              Zero commission markups
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px] text-[#904d00]">shield</span>
              Escrow secured
            </span>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* IN-APP CAMERA VIEWFINDER MODAL ("TAKE PHOTO")             */}
      {/* ======================================================== */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between items-center p-4 animate-in fade-in duration-200">
          {/* Header Controls */}
          <div className="w-full max-w-md flex items-center justify-between text-white pt-safe">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#85f8c4] animate-pulse" />
              <span className="text-[13px] font-bold tracking-wide">Live Camera Viewfinder</span>
            </div>

            <button
              type="button"
              onClick={closeCamera}
              className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label="Close camera"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Camera Viewport */}
          <div className="relative w-full max-w-md aspect-3/4 max-h-[60vh] rounded-3xl overflow-hidden bg-black border-2 border-white/20 shadow-2xl flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Flash Effect on capture */}
            {cameraFlash && (
              <div className="absolute inset-0 bg-white opacity-90 transition-opacity pointer-events-none" />
            )}

            {/* Viewfinder Grid Crosshairs */}
            <div className="absolute inset-4 pointer-events-none border border-white/20 rounded-2xl flex items-center justify-center">
              <div className="w-6 h-6 border-t-2 border-l-2 border-white/60 absolute top-2 left-2 rounded-tl-sm" />
              <div className="w-6 h-6 border-t-2 border-r-2 border-white/60 absolute top-2 right-2 rounded-tr-sm" />
              <div className="w-6 h-6 border-b-2 border-l-2 border-white/60 absolute bottom-2 left-2 rounded-bl-sm" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-white/60 absolute bottom-2 right-2 rounded-br-sm" />
            </div>

            {/* Badge showing current count */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white font-mono text-[11px] px-2.5 py-1 rounded-full font-bold border border-white/10">
              Photos: {photos.length}/4
            </div>
          </div>

          {/* Shutter & Controls Bottom Bar */}
          <div className="w-full max-w-md flex items-center justify-around pb-6 pt-2">
            {/* Flip Camera button */}
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
              title="Flip camera"
            >
              <span className="material-symbols-outlined text-[22px]">flip_camera_ios</span>
            </button>

            {/* Master Shutter Button */}
            <button
              type="button"
              onClick={capturePhoto}
              disabled={photos.length >= 4}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-90 transition-transform shadow-lg disabled:opacity-50"
              aria-label="Take picture"
            >
              <div className="w-full h-full rounded-full bg-white hover:bg-white/90 transition-colors" />
            </button>

            {/* Done button */}
            <button
              type="button"
              onClick={closeCamera}
              className="px-4 py-2 rounded-full bg-[#134e3f] text-white text-[12px] font-bold hover:bg-[#00362a] active:scale-95 transition-all shadow-md"
            >
              Done ({photos.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookServicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BookServiceContent />
    </Suspense>
  );
}
