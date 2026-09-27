"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  ImagePlus,
  Mic,
  Phone,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  X,
  MessagesSquare,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { bookingRef, formatDate, formatTime } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { SegmentedTabs } from "@/components/ui/tabs";

/* ------------------------------------------------------------------ Types */
export interface OtherParticipant {
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

export interface ConversationItem {
  id: string;
  bookingId: string | null;
  createdAt: string;
  otherParticipant: OtherParticipant;
  booking: BookingContext | null;
  lastMessage: LastMessage | null;
  unreadCount: number;
  displayTimestamp?: string | null;
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

export interface QuickAction {
  label: string;
  text: string;
}

export const CUSTOMER_QUICK_ACTIONS: QuickAction[] = [
  { label: "What is your ETA?", text: "Hi, what is your estimated time of arrival?" },
  { label: "Gate security instructions", text: "I have informed the society security gate. Please mention flat 402." },
  { label: "Do you need spare parts?", text: "Do you have the necessary replacement parts in your kit, or should I arrange anything?" },
  { label: "Sharing photo of the issue", text: "I'm sending a close-up picture of the damaged area for pre-inspection." },
];

export const PROVIDER_QUICK_ACTIONS: QuickAction[] = [
  { label: "On my way", text: "I have started, I will reach the address shortly." },
  { label: "Share entry details", text: "Please share any gate, floor or entry instructions for your address." },
  { label: "Need approval for parts", text: "A replacement part is required. I will share the price revision for your approval." },
  { label: "Work completed", text: "The work is completed. Please verify and confirm on the app." },
];

/* ================================================================== Chat */
export function ChatWorkspace({
  role,
  quickActions,
  messagesHref,
  orderLink,
}: {
  role: "customer" | "provider";
  quickActions: QuickAction[];
  /** base href of the portal's messages page, used to clear the selection */
  messagesHref: string;
  /** link builder for the pinned booking order */
  orderLink: (bookingId: string) => string;
}) {
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

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tempIdRef = useRef(0);

  /* ------------------------------------------------------------ fetching */
  const fetchConversations = async (targetBookingId?: string, targetProviderId?: string) => {
    try {
      let url = "/api/conversations";
      if (targetBookingId && targetProviderId) {
        url += `?bookingId=${encodeURIComponent(targetBookingId)}&providerId=${encodeURIComponent(targetProviderId)}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        const now = Date.now();
        const convList: ConversationItem[] = (data.conversations || []).map((c: ConversationItem) => ({
          ...c,
          displayTimestamp: computeTimestamp(c, now),
        }));
        setConversations(convList);
        if (conversationIdParam) {
          const matched = convList.find((c) => c.id === conversationIdParam);
          if (matched) setActiveConversation(matched);
        } else if (targetBookingId && targetProviderId) {
          const matched =
            convList.find((c) => c.bookingId === targetBookingId && c.otherParticipant.id === targetProviderId) ||
            convList[0];
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
    const t = setTimeout(() => void fetchConversations(bookingIdParam || undefined, providerIdParam || undefined), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingIdParam, providerIdParam, conversationIdParam]);

  const fetchMessages = async (convId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await apiFetch(`/api/messages?conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedMessages: ChatMessage[] = data.messages || [];
        setMessages(Array.from(new Map(fetchedMessages.map((message) => [message.id, message])).values()));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    const start = setTimeout(() => void fetchMessages(convId), 0);
    const interval = setInterval(() => void fetchMessages(convId, true), 4000);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* -------------------------------------------------------------- sending */
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    const media = photoPreview || audioUrl || null;
    if (!activeConversation || (!text.trim() && !media)) return;

    setSending(true);
    tempIdRef.current += 1;
    const tempId = `temp-${tempIdRef.current}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: "me",
      content: text.trim() || (audioUrl ? "Voice note" : "Photo attachment"),
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
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          const updated = [...filtered.filter((message) => message.id !== data.message.id), data.message];
          if (data.autoReply) {
            setTimeout(() => {
              setIsTyping(false);
              setMessages((current) =>
                current.some((message) => message.id === data.autoReply.id) ? current : [...current, data.autoReply]
              );
            }, 1000);
          } else {
            setIsTyping(false);
          }
          return updated;
        });
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

  /* ---------------------------------------------------------- voice + photo */
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setAudioUrl(reader.result as string);
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      alert("Microphone permission is required to record a voice note.");
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* ---------------------------------------------------------------- list */
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

  const conversationList = (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-4 space-y-3 border-b border-line">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-400 pointer-events-none" aria-hidden />
          <input
            type="search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search name, trade or request…"
            aria-label="Search conversations"
            className="w-full rounded-xl border border-line bg-ink-50 pl-9 pr-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-600/25 focus:border-brand-500"
          />
        </div>
        <SegmentedTabs
          aria-label="Filter conversations"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "all", label: "All", count: conversations.length },
            { value: "active", label: "Active" },
            { value: "quotes", label: "Quotes" },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {loading ? (
          <div className="p-1 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <EmptyState
            icon={<MessagesSquare />}
            title="No conversations"
            description={
              role === "customer"
                ? "When you book a service or receive quotes, chat channels with specialists appear here."
                : "When you quote a request or get assigned a job, the customer channel appears here."
            }
            className="py-10"
          />
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            const hasUnread = conv.unreadCount > 0;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveConversation(conv)}
                aria-current={isActive}
                className={cn(
                  "w-full text-left rounded-xl p-3 flex items-start gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                  isActive ? "bg-brand-50 border border-brand-200" : "border border-transparent hover:bg-ink-50"
                )}
              >
                <Avatar name={conv.otherParticipant.displayName} src={conv.otherParticipant.photoUrl ?? undefined} size="lg" online />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-ink-900 truncate">{conv.otherParticipant.displayName}</span>
                    {conv.displayTimestamp && (
                      <span className="text-2xs text-ink-400 tabular-nums shrink-0">{conv.displayTimestamp}</span>
                    )}
                  </span>
                  <span className="block text-xs text-ink-500 truncate mt-0.5">
                    {conv.booking?.categoryName || conv.otherParticipant.trade}
                    {conv.bookingId ? ` • ${bookingRef(conv.bookingId)}` : ""}
                  </span>
                  <span className="flex items-center justify-between gap-2 mt-1">
                    <span className={cn("text-xs truncate", hasUnread ? "font-bold text-ink-900" : "text-ink-500")}>
                      {conv.lastMessage?.content || (conv.lastMessage?.mediaUrl ? "Attachment shared" : "Open chat…")}
                    </span>
                    {hasUnread && (
                      <span className="size-5 min-w-5 rounded-full bg-brand-700 text-white text-2xs font-bold inline-flex items-center justify-center px-1" aria-label={`${conv.unreadCount} unread`}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const chatPane = activeConversation ? (
    <div className="flex flex-col h-full min-h-0">
      {/* header */}
      <header className="px-3.5 py-2.5 border-b border-line bg-panel flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveConversation(null);
            router.push(messagesHref);
          }}
          className="md:hidden size-10 rounded-xl flex items-center justify-center text-ink-700 hover:bg-ink-50 -ml-1.5"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Avatar
          name={activeConversation.otherParticipant.displayName}
          src={activeConversation.otherParticipant.photoUrl ?? undefined}
          size="md"
          online
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900 truncate inline-flex items-center gap-1.5">
            {activeConversation.otherParticipant.displayName}
            <BadgeCheck className="size-4 text-brand-600 shrink-0" aria-hidden />
          </p>
          <p className="text-xs text-ink-500 truncate">
            {activeConversation.otherParticipant.trade}
            {Number(activeConversation.otherParticipant.ratingAvg) > 0 ? ` • ★ ${activeConversation.otherParticipant.ratingAvg}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {activeConversation.otherParticipant.phone && (
            <a
              href={`tel:${activeConversation.otherParticipant.phone}`}
              className="size-10 rounded-xl border border-line bg-panel flex items-center justify-center text-brand-700 hover:bg-brand-50 transition-colors"
              aria-label={`Call ${activeConversation.otherParticipant.displayName}`}
            >
              <Phone className="size-4.5" />
            </a>
          )}
          {activeConversation.bookingId && (
            <Link
              href={orderLink(activeConversation.bookingId)}
              className="size-10 rounded-xl border border-line bg-panel flex items-center justify-center text-ink-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
              aria-label="View booking order"
            >
              <ReceiptText className="size-4.5" />
            </Link>
          )}
        </div>
      </header>

      {/* pinned booking context */}
      {activeConversation.booking && (
        <div className="px-3.5 py-2 border-b border-line bg-ink-50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <StatusBadge status={activeConversation.booking.status} size="sm" className="shrink-0" />
            <span className="font-semibold text-ink-800 shrink-0">{activeConversation.booking.categoryName}</span>
            <span className="text-ink-500 truncate">{activeConversation.booking.serviceDescription}</span>
          </div>
          <Link href={orderLink(activeConversation.booking.id)} className="text-brand-700 font-bold shrink-0 hover:underline">
            {bookingRef(activeConversation.booking.id)}
          </Link>
        </div>
      )}

      {/* messages feed */}
      <div className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-4 space-y-3 bg-surface">
        <div className="text-center py-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel border border-line px-3 py-1 text-2xs text-ink-500">
            <ShieldCheck className="size-3.5 text-success-600" aria-hidden />
            Cooperative verified channel • open since {formatDate(activeConversation.createdAt)}
          </span>
        </div>

        {loadingMessages ? (
          <LoadingBlock label="Loading messages…" />
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-ink-400">
            <MessagesSquare className="size-9 mx-auto text-ink-200" aria-hidden />
            <p className="text-sm mt-2">Say hello — {role === "customer" ? "your specialist" : "the customer"} is on the line.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId !== activeConversation.otherParticipant.id;
            const isAudio =
              msg.mediaUrl && (msg.mediaUrl.startsWith("data:audio") || /\.(mp3|wav|ogg|webm|m4a)/i.test(msg.mediaUrl));
            const isImage = msg.mediaUrl && !isAudio;
            const isTemp = msg.id.startsWith("temp-");

            return (
              <div key={msg.id} className={cn("flex flex-col max-w-[85%] sm:max-w-[70%]", isMine ? "items-end ml-auto" : "items-start mr-auto")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 shadow-card",
                    isMine ? "bg-brand-800 text-white rounded-br-md" : "bg-panel text-ink-900 border border-line rounded-bl-md"
                  )}
                >
                  {isImage && (
                    <a href={msg.mediaUrl!} target="_blank" rel="noopener noreferrer" className="block mb-2 rounded-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={msg.mediaUrl!} alt="Attachment" className="w-full max-h-56 object-cover" />
                    </a>
                  )}
                  {isAudio && <AudioBubble src={msg.mediaUrl!} mine={isMine} />}
                  {msg.content && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <p className={cn("flex items-center justify-end gap-1 mt-1 text-2xs", isMine ? "text-brand-100" : "text-ink-400")}>
                    {isTemp ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="size-1 rounded-full bg-current animate-pulse" />
                        Sending…
                      </span>
                    ) : (
                      formatTime(msg.createdAt)
                    )}
                    {isMine && !isTemp && (
                      <span className="inline-flex" aria-label={msg.isRead ? "Read" : "Delivered"}>
                        <svg viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={cn("h-2.5 w-4", msg.isRead && isMine ? "text-accent-300" : "")}>
                          <path d="M1 5l2.5 2.5L8 3" />
                          {msg.isRead && <path d="M6.5 5L9 7.5L13.5 3" />}
                        </svg>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {isTyping && (
          <div className="flex items-center gap-2 mr-auto max-w-[80%]">
            <div className="bg-panel border border-line px-3.5 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-1.5 shadow-card">
              <span className="size-2 rounded-full bg-brand-700 animate-bounce" />
              <span className="size-2 rounded-full bg-brand-700 animate-bounce [animation-delay:0.2s]" />
              <span className="size-2 rounded-full bg-brand-700 animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-ink-500 ml-1.5">{activeConversation.otherParticipant.displayName.split(" ")[0]} is typing…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* quick actions */}
      <div className="px-3 py-2 border-t border-line bg-panel flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            type="button"
            onClick={() => handleSendMessage(qa.text)}
            disabled={sending}
            className="whitespace-nowrap rounded-full border border-line bg-panel hover:bg-brand-50 hover:border-brand-200 hover:text-brand-800 px-3 py-1.5 text-xs font-semibold text-ink-600 transition-colors shrink-0 disabled:opacity-50"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* staged media preview */}
      {(photoPreview || audioUrl) && (
        <div className="px-3.5 py-2 border-t border-line bg-brand-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Attachment preview" className="size-11 rounded-lg object-cover border border-line" />
            )}
            {audioUrl && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-panel border border-line px-2.5 py-2 text-xs font-semibold text-brand-800">
                <Mic className="size-3.5" aria-hidden /> Voice note ready
              </span>
            )}
            <span className="text-2xs text-ink-500">Attached — send to share</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPhotoPreview(null);
              setAudioUrl(null);
            }}
            className="size-8 rounded-lg flex items-center justify-center text-ink-500 hover:text-danger-500 hover:bg-danger-50"
            aria-label="Remove attachments"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* recording bar */}
      {isRecording && (
        <div className="px-3.5 py-2.5 border-t border-danger-200 bg-danger-50 flex items-center justify-between gap-3 shrink-0">
          <span className="flex items-center gap-2 text-danger-700">
            <span className="relative size-2.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-70 animate-ping" />
              <span className="relative inline-flex size-2.5 rounded-full bg-danger-500" />
            </span>
            <span className="text-sm font-bold">Recording…</span>
            <span className="text-sm font-mono font-bold tabular-nums">
              {`${Math.floor(recordSeconds / 60)}`.padStart(2, "0")}:{`${recordSeconds % 60}`.padStart(2, "0")}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={cancelVoiceRecording}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={stopVoiceRecording}>
              Done
            </Button>
          </span>
        </div>
      )}

      {/* composer */}
      <footer className="p-2.5 border-t border-line bg-panel flex items-end gap-1.5 shrink-0">
        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoSelect} />
        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Attach a photo" className="shrink-0">
          <ImagePlus className="size-5" />
        </Button>
        <Button
          variant={isRecording ? "destructive" : "ghost"}
          size="icon"
          onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
          aria-label={isRecording ? "Stop recording" : "Record a voice note"}
          className="shrink-0"
        >
          <Mic className="size-5" />
        </Button>
        <textarea
          rows={1}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={role === "customer" ? "Message your specialist…" : "Message the customer…"}
          aria-label="Message"
          className="flex-1 resize-none rounded-xl border border-line bg-ink-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-600/25 focus:border-brand-500 max-h-28"
        />
        <Button
          size="icon"
          onClick={() => handleSendMessage()}
          disabled={sending || (!inputText.trim() && !photoPreview && !audioUrl)}
          aria-label="Send message"
          className="shrink-0 rounded-xl"
        >
          <Send className="size-4.5" />
        </Button>
      </footer>
    </div>
  ) : (
    <div className="hidden md:flex flex-col items-center justify-center h-full text-center px-8">
      <span className="size-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center" aria-hidden>
        <MessagesSquare className="size-7" />
      </span>
      <h3 className="mt-4 font-bold text-ink-900">Select a conversation</h3>
      <p className="mt-1 text-sm text-ink-500 max-w-xs">
        Pick a thread from the list to continue your discussion, or book a service to open a new channel.
      </p>
    </div>
  );

  return (
    <div
      className={cn(
        "grid md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] rounded-2xl border border-line bg-panel shadow-card overflow-hidden",
        // full-bleed app-like height inside the shell content area
        "h-[calc(100dvh-9.5rem)] md:h-[calc(100dvh-10.5rem)]"
      )}
    >
      <div className={cn("h-full min-h-0", activeConversation && "hidden md:block")}>{conversationList}</div>
      <div className={cn("h-full min-h-0 md:border-l md:border-line", !activeConversation && "hidden md:block")}>
        {chatPane}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bits */
function computeTimestamp(conv: ConversationItem, nowMs: number) {
  if (!conv.lastMessage) return formatDate(conv.createdAt);
  const d = new Date(conv.lastMessage.createdAt);
  const now = new Date(nowMs);
  const sameDay =
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return sameDay ? formatTime(conv.lastMessage.createdAt) : formatDate(conv.lastMessage.createdAt);
}

function AudioBubble({ src, mine }: { src: string; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className={cn("flex items-center gap-2.5 p-2 rounded-xl mb-1.5", mine ? "bg-brand-900/80" : "bg-ink-50 border border-line")}>
      <button
        type="button"
        onClick={() => {
          const el = audioRef.current;
          if (!el) return;
          if (playing) {
            el.pause();
            setPlaying(false);
          } else {
            el.play();
            setPlaying(true);
          }
        }}
        className={cn(
          "size-8 rounded-full flex items-center justify-center shrink-0",
          mine ? "bg-white text-brand-900" : "bg-brand-700 text-white"
        )}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? (
          <svg viewBox="0 0 12 14" className="size-3.5 fill-current" aria-hidden>
            <rect width="4" height="14" rx="1" />
            <rect x="8" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 14" className="size-3.5 fill-current" aria-hidden>
            <path d="M0 0l12 7-12 7V0z" />
          </svg>
        )}
      </button>
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} className="hidden" />
      <span className="flex items-center gap-[3px] h-6" aria-hidden>
        {[0.5, 1, 0.35, 0.8, 1.2, 0.6, 0.9].map((v, i) => (
          <span
            key={i}
            className={cn("w-[3px] rounded-full", mine ? "bg-brand-200" : "bg-brand-700", playing && "animate-pulse")}
            style={{ height: `${10 * v}px`, animationDelay: `${i * 90}ms` }}
          />
        ))}
      </span>
      <span className={cn("text-2xs font-semibold", mine ? "text-brand-100" : "text-ink-500")}>Voice note</span>
    </div>
  );
}
