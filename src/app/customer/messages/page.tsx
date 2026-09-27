"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SahakariEmblem from "@/components/SahakariEmblem";
import CustomerNav from "@/app/customer/CustomerNav";
import { apiFetch } from "@/lib/api";

interface OtherParticipant {
  id: string;
  role: string;
  displayName: string;
  photoUrl: string | null;
  ratingAvg: string;
  trade: string;
  phone: string;
}

interface BookingContext {
  id: string;
  status: string;
  serviceDescription: string;
  categoryName: string;
  preferredTime?: string | null;
  isEmergency?: boolean | null;
  address?: string | null;
}

interface LastMessage {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  senderId: string;
  isRead: boolean;
  createdAt: string;
}

interface ConversationItem {
  id: string;
  bookingId: string | null;
  createdAt: string;
  otherParticipant: OtherParticipant;
  booking: BookingContext | null;
  lastMessage: LastMessage | null;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  mediaUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const QUICK_ACTIONS = [
  { label: "⏱️ What is your ETA?", text: "Hi, what is your estimated time of arrival?" },
  { label: "🚪 Gate security instructions", text: "I have informed the society security gate. Please mention flat 402." },
  { label: "🔧 Do you need spare parts?", text: "Do you have the necessary replacement parts in your kit, or should I arrange anything?" },
  { label: "📸 Sharing photo of the issue", text: "I'm sending a close-up picture of the damaged area for pre-inspection." },
];

function CustomerMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");
  const providerIdParam = searchParams.get("providerId");
  const conversationIdParam = searchParams.get("conversationId");

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "quotes">("all");

  // Media attachments
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Fetch conversations list
  const fetchConversations = async (targetBookingId?: string, targetProviderId?: string) => {
    try {
      let url = "/api/conversations";
      if (targetBookingId && targetProviderId) {
        url += `?bookingId=${encodeURIComponent(targetBookingId)}&providerId=${encodeURIComponent(targetProviderId)}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        const convList: ConversationItem[] = data.conversations || [];
        setConversations(convList);

        // Auto-select if requested
        if (conversationIdParam) {
          const matched = convList.find((c) => c.id === conversationIdParam);
          if (matched) setActiveConversation(matched);
        } else if (targetBookingId && targetProviderId) {
          const matched = convList.find(
            (c) => c.bookingId === targetBookingId && c.otherParticipant.id === targetProviderId
          ) || convList[0];
          if (matched) setActiveConversation(matched);
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(bookingIdParam || undefined, providerIdParam || undefined);
  }, [bookingIdParam, providerIdParam, conversationIdParam]);

  // 2. Fetch messages for active conversation
  const fetchMessages = async (convId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await apiFetch(`/api/messages?conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedMessages: ChatMessage[] = data.messages || [];
        // Remove repeated IDs if overlapping polling requests return the same message.
        setMessages(Array.from(new Map(fetchedMessages.map((message) => [message.id, message])).values()));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      // Auto-poll messages every 4 seconds when in active chat
      const interval = setInterval(() => {
        fetchMessages(activeConversation.id, true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // 3. Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    const media = photoPreview || audioUrl || null;

    if (!activeConversation || (!text.trim() && !media)) return;

    setSending(true);
    const tempId = "temp-" + Date.now();
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: "me",
      content: text.trim() || (audioUrl ? "Voice Note" : "Photo Attachment"),
      mediaUrl: media,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText("");
    setPhotoPreview(null);
    setAudioUrl(null);

    try {
      setIsTyping(true);
      const res = await apiFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          content: text.trim() || undefined,
          mediaUrl: media || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace optimistic message and append auto-reply if present
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          // Polling may already have included this message.
          const updated = [...filtered.filter((message) => message.id !== data.message.id), data.message];
          if (data.autoReply) {
            setTimeout(() => {
              setIsTyping(false);
              setMessages((current) => current.some((message) => message.id === data.autoReply.id) ? current : [...current, data.autoReply]);
            }, 1000);
          } else {
            setIsTyping(false);
          }
          return updated;
        });

        // Refresh conversation list preview
        fetchConversations();
      } else {
        setIsTyping(false);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setIsTyping(false);
    } finally {
      setSending(false);
    }
  };

  // 4. Voice Recording logic
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert("Microphone permission required to record audio note.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setAudioUrl(null);
    }
  };

  // 5. Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Filter conversations for the list view
  const filteredConversations = conversations.filter((c) => {
    if (activeTab === "active" && c.booking?.status === "completed") return false;
    if (activeTab === "quotes" && c.booking?.status !== "submitted" && c.booking?.status !== "quoted") return false;
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      c.otherParticipant.displayName.toLowerCase().includes(q) ||
      c.otherParticipant.trade.toLowerCase().includes(q) ||
      (c.booking?.categoryName && c.booking.categoryName.toLowerCase().includes(q)) ||
      (c.booking?.serviceDescription && c.booking.serviceDescription.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans">
      {/* =========================================================================
          VIEW A: ACTIVE CHAT CONVERSATION ROOM (Single Provider View)
          ========================================================================= */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col h-screen max-w-md md:max-w-4xl lg:max-w-5xl mx-auto w-full bg-white md:my-6 md:rounded-2xl md:border md:border-[#d1ddd8] md:shadow-lg relative overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#eaedff] px-3.5 py-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setActiveConversation(null);
                  router.push("/customer/messages");
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f2f3ff] text-[#131b2e] -ml-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </button>

              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#134e3f] text-white flex items-center justify-center font-bold text-[14px] overflow-hidden border border-[#d1ddd8]">
                  {activeConversation.otherParticipant.photoUrl ? (
                    <img
                      src={activeConversation.otherParticipant.photoUrl}
                      alt={activeConversation.otherParticipant.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    activeConversation.otherParticipant.displayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#059669] ring-2 ring-white"></span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[14px] font-bold text-[#131b2e] truncate leading-tight">
                    {activeConversation.otherParticipant.displayName}
                  </h1>
                  <span className="material-symbols-outlined text-[14px] text-[#059669]" title="Verified Cooperative Specialist">
                    verified
                  </span>
                </div>
                <p className="text-[11px] text-[#707975] truncate flex items-center gap-1">
                  <span>{activeConversation.otherParticipant.trade}</span>
                  <span>•</span>
                  <span className="text-[#904d00] font-semibold flex items-center">
                    ★ {activeConversation.otherParticipant.ratingAvg}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={`tel:${activeConversation.otherParticipant.phone}`}
                className="w-9 h-9 rounded-xl bg-[#f2f3ff] text-[#134e3f] flex items-center justify-center hover:bg-[#eaedff] transition-colors border border-[#d1ddd8]"
                title="Call Specialist"
              >
                <span className="material-symbols-outlined text-[20px]">call</span>
              </a>

              {activeConversation.bookingId && (
                <Link
                  href={`/customer/orders/${activeConversation.bookingId}`}
                  className="w-9 h-9 rounded-xl bg-[#f2f3ff] text-[#707975] flex items-center justify-center hover:bg-[#eaedff] transition-colors border border-[#d1ddd8]"
                  title="View Booking Order"
                >
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </Link>
              )}
            </div>
          </header>

          {/* Pinned Booking Context Pill */}
          {activeConversation.booking && (
            <div className="bg-[#f2f3ff] border-b border-[#eaedff] px-3.5 py-1.5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                <span className="font-bold text-[#134e3f]">{activeConversation.booking.categoryName}</span>
                <span className="text-[#707975] truncate">
                  • {activeConversation.booking.serviceDescription}
                </span>
              </div>
              <Link
                href={`/customer/orders/${activeConversation.booking.id}`}
                className="text-[#904d00] font-bold text-[10px] uppercase tracking-wider shrink-0 hover:underline flex items-center gap-0.5 ml-2"
              >
                Order #{activeConversation.booking.id.slice(0, 5).toUpperCase()}
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              </Link>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#faf8ff]">
            {/* Conversation Start Banner */}
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-1.5 bg-white border border-[#d1ddd8] px-3 py-1 rounded-full text-[10px] text-[#707975] shadow-2xs">
                <span className="material-symbols-outlined text-[13px] text-[#059669]">shield</span>
                Official Sahakari End-to-End Encrypted Cooperative Channel
              </div>
              <p className="text-[10px] text-[#707975] mt-1 font-mono">
                {new Date(activeConversation.createdAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {loadingMessages ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-6 h-6 border-2 border-[#134e3f] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[11px] text-[#707975]">Syncing message quorum...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-[#707975]">
                <span className="material-symbols-outlined text-[36px] text-[#d1ddd8]">chat</span>
                <p className="text-[12px] mt-1">Start a conversation with your cooperative specialist.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isCustomer = msg.senderId !== activeConversation.otherParticipant.id;
                const isAudio = msg.mediaUrl && (msg.mediaUrl.startsWith("data:audio") || /\.(mp3|wav|ogg|webm|m4a)/i.test(msg.mediaUrl));
                const isImage = msg.mediaUrl && !isAudio;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCustomer ? "items-end" : "items-start"} max-w-[85%] ${
                      isCustomer ? "ml-auto" : "mr-auto"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 shadow-2xs relative ${
                        isCustomer
                          ? "bg-[#134e3f] text-white rounded-br-xs"
                          : "bg-white text-[#131b2e] border border-[#eaedff] rounded-bl-xs"
                      }`}
                    >
                      {/* Image Preview if present */}
                      {isImage && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-black/10">
                          <img
                            src={msg.mediaUrl!}
                            alt="Attachment"
                            className="w-full max-h-48 object-cover rounded-lg cursor-pointer"
                            onClick={() => window.open(msg.mediaUrl!, "_blank")}
                          />
                        </div>
                      )}

                      {/* Audio Note Player if present */}
                      {isAudio && (
                        <div className={`flex items-center gap-2 p-2 rounded-xl mb-1.5 ${isCustomer ? "bg-[#00362a]" : "bg-[#f2f3ff]"}`}>
                          <button
                            type="button"
                            onClick={() => {
                              const audioEl = document.getElementById(`audio-${msg.id}`) as HTMLAudioElement;
                              if (audioEl) {
                                if (playingAudioId === msg.id) {
                                  audioEl.pause();
                                  setPlayingAudioId(null);
                                } else {
                                  audioEl.play();
                                  setPlayingAudioId(msg.id);
                                }
                              }
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isCustomer ? "bg-white text-[#134e3f]" : "bg-[#134e3f] text-white"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {playingAudioId === msg.id ? "pause" : "play_arrow"}
                            </span>
                          </button>
                          <audio
                            id={`audio-${msg.id}`}
                            src={msg.mediaUrl!}
                            onEnded={() => setPlayingAudioId(null)}
                            className="hidden"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="w-1 h-3 rounded-full bg-current animate-pulse"></span>
                              <span className="w-1 h-5 rounded-full bg-current animate-pulse delay-75"></span>
                              <span className="w-1 h-2 rounded-full bg-current animate-pulse delay-150"></span>
                              <span className="w-1 h-4 rounded-full bg-current animate-pulse"></span>
                              <span className="w-1 h-6 rounded-full bg-current animate-pulse delay-100"></span>
                              <span className="w-1 h-3 rounded-full bg-current animate-pulse"></span>
                            </div>
                            <span className={`text-[10px] font-mono mt-0.5 block ${isCustomer ? "text-[#b5efda]" : "text-[#707975]"}`}>
                              Voice Note
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Text Content */}
                      {msg.content && <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                      {/* Timestamp & Status Check */}
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono ${
                          isCustomer ? "text-[#b5efda]" : "text-[#707975]"
                        }`}
                      >
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isCustomer && (
                          <span className="material-symbols-outlined text-[13px] text-[#b5efda]">
                            {msg.isRead ? "done_all" : "done"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Simulated Live Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 mr-auto max-w-[80%]">
                <div className="bg-white border border-[#eaedff] px-3.5 py-2.5 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#134e3f] animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-[#134e3f] animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-[#134e3f] animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] text-[#707975] ml-1.5">Specialist is typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="bg-white border-t border-[#eaedff] px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_ACTIONS.map((qa, qIdx) => (
              <button
                key={qIdx}
                type="button"
                onClick={() => handleSendMessage(qa.text)}
                disabled={sending}
                className="whitespace-nowrap bg-[#f2f3ff] hover:bg-[#eaedff] active:scale-95 text-[#134e3f] border border-[#d1ddd8] px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 disabled:opacity-50"
              >
                {qa.label}
              </button>
            ))}
          </div>

          {/* Media Staging Preview */}
          {(photoPreview || audioUrl) && (
            <div className="bg-[#f2f3ff] border-t border-[#d1ddd8] px-3.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {photoPreview && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#d1ddd8]">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-0 right-0 bg-black/60 text-white rounded-full p-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </div>
                )}
                {audioUrl && (
                  <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-[#d1ddd8]">
                    <span className="material-symbols-outlined text-[16px] text-[#059669]">mic</span>
                    <span className="text-[11px] font-mono text-[#134e3f]">Voice Note Ready</span>
                    <button type="button" onClick={() => setAudioUrl(null)} className="text-[#ba1a1a]">
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[#707975]">Attached & ready to broadcast</span>
            </div>
          )}

          {/* Voice Recording Active Bar */}
          {isRecording && (
            <div className="bg-[#ffdad6] border-t border-[#ba1a1a] px-3.5 py-2.5 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2 text-[#93000a]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] animate-ping"></span>
                <span className="text-[12px] font-bold">Recording Voice Note...</span>
                <span className="font-mono text-[12px] font-bold">00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="px-2 py-1 bg-white text-[#ba1a1a] rounded-lg text-[11px] font-semibold border border-[#ba1a1a]/30"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="px-3 py-1 bg-[#ba1a1a] text-white rounded-lg text-[11px] font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <footer className="bg-white border-t border-[#eaedff] p-2.5 flex items-center gap-1.5 shadow-lg">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#707975] hover:text-[#131b2e] hover:bg-[#f2f3ff] transition-colors"
              title="Attach Photo"
            >
              <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
            </button>

            <button
              type="button"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isRecording ? "bg-[#ffdad6] text-[#ba1a1a]" : "text-[#707975] hover:text-[#131b2e] hover:bg-[#f2f3ff]"
              }`}
              title="Record Voice Note"
            >
              <span className="material-symbols-outlined text-[20px]">mic</span>
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type message or ask technician..."
              className="flex-1 bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[13px] text-[#131b2e] placeholder:text-[#707975] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={sending || (!inputText.trim() && !photoPreview && !audioUrl)}
              className="w-10 h-10 rounded-xl bg-[#134e3f] text-white flex items-center justify-center shadow-xs hover:bg-[#00362a] active:scale-95 disabled:opacity-40 transition-all shrink-0"
              title="Send Message"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </footer>
        </div>
      ) : (
        /* =========================================================================
            VIEW B: CONVERSATION THREADS INBOX (List View)
            ========================================================================= */
        <div className="flex-1 flex flex-col pb-20 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto w-full">
          {/* Top Brand & Title Bar */}
          <header className="sticky top-0 md:top-16 z-30 bg-white/95 backdrop-blur-md border-b border-[#eaedff] px-4 pt-12 md:pt-4 pb-3.5 shadow-2xs md:rounded-2xl md:mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <SahakariEmblem size={32} />
                <div>
                  <h1 className="text-[17px] font-bold text-[#131b2e] leading-tight">Messages & Dispatch</h1>
                  <p className="text-[11px] text-[#707975]">Active chat with cooperative technicians</p>
                </div>
              </div>
              <span className="bg-[#b5efda] text-[#002018] font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>
                Live Quorum
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#707975] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search technician name, trade or request..."
                className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl pl-9 pr-3 py-2 text-[12px] text-[#131b2e] placeholder:text-[#707975] focus:outline-none focus:ring-1 focus:ring-[#134e3f]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  activeTab === "all"
                    ? "bg-[#134e3f] text-white"
                    : "bg-[#f2f3ff] text-[#707975] hover:bg-[#eaedff]"
                }`}
              >
                All Messages ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  activeTab === "active"
                    ? "bg-[#134e3f] text-white"
                    : "bg-[#f2f3ff] text-[#707975] hover:bg-[#eaedff]"
                }`}
              >
                Active Orders
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("quotes")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  activeTab === "quotes"
                    ? "bg-[#134e3f] text-white"
                    : "bg-[#f2f3ff] text-[#707975] hover:bg-[#eaedff]"
                }`}
              >
                Quotes Under Review
              </button>
            </div>
          </header>

          {/* Conversation List Content */}
          <main className="flex-1 p-3.5 space-y-2.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <div className="w-7 h-7 border-2 border-[#134e3f] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[12px] text-[#707975]">Loading active conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-[#eaedff] text-center my-6 space-y-3 shadow-xs">
                <div className="w-14 h-14 bg-[#f2f3ff] text-[#134e3f] rounded-2xl mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">forum</span>
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#131b2e]">No Conversations Matching Filter</h2>
                  <p className="text-[12px] text-[#707975] mt-1 max-w-xs mx-auto">
                    When you raise a service or receive quotes, direct chat channels with certified cooperative specialists will appear here.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/customer/book"
                    className="inline-flex items-center gap-1.5 bg-[#134e3f] text-white px-4 py-2 rounded-xl text-[12px] font-bold shadow-xs hover:bg-[#00362a]"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    Request a Service
                  </Link>
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const hasUnread = conv.unreadCount > 0;
                return (
                  <article
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`bg-white rounded-2xl p-3.5 border transition-all cursor-pointer hover:border-[#134e3f] hover:shadow-xs active:scale-[0.99] flex items-start gap-3 relative ${
                      hasUnread ? "border-[#134e3f] bg-[#f2f3ff]/40" : "border-[#eaedff]"
                    }`}
                  >
                    {/* Avatar with Online Badge */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-12 h-12 rounded-xl bg-[#134e3f] text-white flex items-center justify-center font-bold text-[15px] overflow-hidden border border-[#d1ddd8]">
                        {conv.otherParticipant.photoUrl ? (
                          <img
                            src={conv.otherParticipant.photoUrl}
                            alt={conv.otherParticipant.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          conv.otherParticipant.displayName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#059669] ring-2 ring-white"></span>
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <h3 className="text-[14px] font-bold text-[#131b2e] truncate">
                            {conv.otherParticipant.displayName}
                          </h3>
                          <span className="material-symbols-outlined text-[13px] text-[#059669]">verified</span>
                        </div>
                        <span className="text-[10px] text-[#707975] font-mono shrink-0">
                          {conv.lastMessage
                            ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : new Date(conv.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      {/* Service Category & Booking ID */}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#707975]">
                        <span className="font-semibold text-[#904d00]">
                          {conv.booking?.categoryName || conv.otherParticipant.trade}
                        </span>
                        {conv.bookingId && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px]">#BK-{conv.bookingId.slice(0, 5).toUpperCase()}</span>
                          </>
                        )}
                      </div>

                      {/* Last Message Preview */}
                      <p
                        className={`text-[12px] mt-1.5 truncate leading-snug ${
                          hasUnread ? "font-bold text-[#131b2e]" : "text-[#707975]"
                        }`}
                      >
                        {conv.lastMessage?.content || (conv.lastMessage?.mediaUrl ? "📎 Attachment shared" : "Tap to open chat...")}
                      </p>

                      {/* Quick Action Badges */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f2f3ff]">
                        <div className="flex items-center gap-1 text-[10px] text-[#059669] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>
                          <span>Coop Member • ★ {conv.otherParticipant.ratingAvg}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <a
                            href={`tel:${conv.otherParticipant.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 h-7 rounded-lg bg-[#f2f3ff] text-[#134e3f] flex items-center justify-center hover:bg-[#eaedff]"
                            title="Call"
                          >
                            <span className="material-symbols-outlined text-[15px]">call</span>
                          </a>
                          <span className="px-2 py-0.5 rounded-lg bg-[#134e3f] text-white text-[10px] font-bold">
                            Chat
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Unread Pill */}
                    {hasUnread && (
                      <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
                    )}
                  </article>
                );
              })
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default function CustomerMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8ff] flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-3 border-[#134e3f] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[12px] font-semibold text-[#707975]">Opening Cooperative Messages...</p>
        </div>
      }
    >
      <CustomerMessagesContent />
    </Suspense>
  );
}
