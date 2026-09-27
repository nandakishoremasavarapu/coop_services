"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SahakariEmblem from "@/components/SahakariEmblem";
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

interface ConversationItem {
  id: string;
  bookingId: string | null;
  createdAt: string;
  otherParticipant: OtherParticipant;
  booking: BookingContext | null;
  lastMessage: {
    id: string;
    content: string | null;
    mediaUrl: string | null;
    senderId: string;
    isRead: boolean;
    createdAt: string;
  } | null;
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
  { label: "🚗 On my way", text: "Hi, I am on my way. ETA ~20 minutes." },
  { label: "🔧 Parts needed", text: "I will need some replacement parts. Shall I proceed?" },
  { label: "✅ Job complete", text: "Work is done. Please inspect and confirm." },
  { label: "📸 Sending photo", text: "Sending a photo of the completed work." },
];

function ProviderMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");
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
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchConversations = async (targetBookingId?: string) => {
    try {
      const url = "/api/conversations" + (targetBookingId ? `?bookingId=${encodeURIComponent(targetBookingId)}` : "");
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        const convList: ConversationItem[] = data.conversations || [];
        setConversations(convList);
        if (conversationIdParam) {
          const matched = convList.find((c) => c.id === conversationIdParam);
          if (matched) setActiveConversation(matched);
        } else if (targetBookingId && convList.length > 0) {
          const matched = convList.find((c) => c.bookingId === targetBookingId) || convList[0];
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
    fetchConversations(bookingIdParam || undefined);
  }, [bookingIdParam, conversationIdParam]);

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
    } catch {}
    finally { if (!silent) setLoadingMessages(false); }
  };

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      const interval = setInterval(() => fetchMessages(activeConversation.id, true), 4000);
      return () => clearInterval(interval);
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    const media = photoPreview || audioUrl || null;
    if (!activeConversation || (!text.trim() && !media)) return;
    setSending(true);
    const tempId = "temp-" + Date.now();
    setMessages((prev) => [...prev, { id: tempId, conversationId: activeConversation.id, senderId: "me", content: text.trim() || (audioUrl ? "Voice Note" : "Photo"), mediaUrl: media, isRead: false, createdAt: new Date().toISOString() }]);
    setInputText(""); setPhotoPreview(null); setAudioUrl(null);
    try {
      setIsTyping(true);
      const res = await apiFetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: activeConversation.id, content: text.trim() || undefined, mediaUrl: media || undefined }) });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          // Polling may already have included this message.
          const updated = [...filtered.filter((message) => message.id !== data.message.id), data.message];
          if (data.autoReply) { setTimeout(() => { setIsTyping(false); setMessages((cur) => cur.some((message) => message.id === data.autoReply.id) ? cur : [...cur, data.autoReply]); }, 1000); } else { setIsTyping(false); }
          return updated;
        });
        fetchConversations();
      } else { setIsTyping(false); }
    } catch { setIsTyping(false); } finally { setSending(false); }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => { const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); const r = new FileReader(); r.onloadend = () => setAudioUrl(r.result as string); r.readAsDataURL(blob); stream.getTracks().forEach(t => t.stop()); };
      mr.start(); setIsRecording(true); setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch { alert("Microphone permission required."); }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); }
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return c.otherParticipant.displayName.toLowerCase().includes(q) || (c.booking?.categoryName && c.booking.categoryName.toLowerCase().includes(q));
  });

  if (activeConversation) {
    return (
      <div className="flex-1 flex flex-col h-screen max-w-md md:max-w-4xl lg:max-w-5xl mx-auto w-full bg-white md:my-6 md:rounded-2xl md:border md:border-[#d1ddd8] md:shadow-lg relative overflow-hidden">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#eaedff] px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <button type="button" onClick={() => { setActiveConversation(null); router.push("/provider/messages"); }} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f2f3ff] -ml-1 transition-colors">
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-[#904d00] text-white flex items-center justify-center font-bold text-[14px] border border-[#d1ddd8] shrink-0">
              {activeConversation.otherParticipant.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] font-bold text-[#131b2e] truncate">{activeConversation.otherParticipant.displayName}</h1>
              <p className="text-[11px] text-[#707975]">Customer • {activeConversation.otherParticipant.trade}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a href={`tel:${activeConversation.otherParticipant.phone}`} className="w-9 h-9 rounded-xl bg-[#f2f3ff] text-[#134e3f] flex items-center justify-center hover:bg-[#eaedff] border border-[#d1ddd8]">
              <span className="material-symbols-outlined text-[20px]">call</span>
            </a>
          </div>
        </header>

        {activeConversation.booking && (
          <div className="bg-[#f2f3ff] border-b border-[#eaedff] px-3.5 py-1.5 flex items-center justify-between text-[11px]">
            <span className="font-bold text-[#134e3f]">{activeConversation.booking.categoryName}</span>
            <span className="text-[#707975]">Status: {activeConversation.booking.status.replace(/_/g, " ")}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#faf8ff]">
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-1.5 bg-white border border-[#d1ddd8] px-3 py-1 rounded-full text-[10px] text-[#707975]">
              <span className="material-symbols-outlined text-[13px] text-[#059669]">shield</span>
              Sahakari Encrypted Channel
            </div>
          </div>
          {loadingMessages ? (
            <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-[#134e3f] border-t-transparent rounded-full animate-spin"></div></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-[#707975]">
              <span className="material-symbols-outlined text-[36px] text-[#d1ddd8]">chat</span>
              <p className="text-[12px] mt-1">Start the conversation with the customer.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isProvider = msg.senderId !== activeConversation.otherParticipant.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isProvider ? "items-end ml-auto" : "items-start mr-auto"} max-w-[85%]`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 shadow-2xs ${isProvider ? "bg-[#134e3f] text-white rounded-br-xs" : "bg-white text-[#131b2e] border border-[#eaedff] rounded-bl-xs"}`}>
                    {msg.mediaUrl && !msg.mediaUrl.startsWith("data:audio") && (
                      <div className="mb-2 rounded-xl overflow-hidden"><img src={msg.mediaUrl} alt="Attachment" className="w-full max-h-48 object-cover rounded-lg cursor-pointer" onClick={() => window.open(msg.mediaUrl!, "_blank")} /></div>
                    )}
                    {msg.content && <p className="text-[13px] leading-relaxed">{msg.content}</p>}
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono ${isProvider ? "text-[#b5efda]" : "text-[#707975]"}`}>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {isProvider && <span className="material-symbols-outlined text-[13px]">{msg.isRead ? "done_all" : "done"}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {isTyping && (
            <div className="flex items-center gap-2 mr-auto max-w-[80%]">
              <div className="bg-white border border-[#eaedff] px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#134e3f] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#134e3f] animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#134e3f] animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t border-[#eaedff] px-3 py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_ACTIONS.map((qa, i) => (
            <button key={i} type="button" onClick={() => handleSendMessage(qa.text)} disabled={sending} className="whitespace-nowrap bg-[#f2f3ff] hover:bg-[#eaedff] text-[#134e3f] border border-[#d1ddd8] px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 disabled:opacity-50">{qa.label}</button>
          ))}
        </div>

        {isRecording && (
          <div className="bg-[#ffdad6] border-t border-[#ba1a1a] px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#93000a]">
              <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping"></span>
              <span className="text-[12px] font-bold">Recording... {recordSeconds}s</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { mediaRecorderRef.current?.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); setAudioUrl(null); }} className="px-2 py-1 bg-white text-[#ba1a1a] rounded-lg text-[11px] font-semibold">Cancel</button>
              <button type="button" onClick={stopVoiceRecording} className="px-3 py-1 bg-[#ba1a1a] text-white rounded-lg text-[11px] font-bold">Done</button>
            </div>
          </div>
        )}

        <footer className="bg-white border-t border-[#eaedff] p-2.5 flex items-center gap-1.5">
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setPhotoPreview(r.result as string); r.readAsDataURL(f); } }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-xl flex items-center justify-center text-[#707975] hover:bg-[#f2f3ff]"><span className="material-symbols-outlined text-[20px]">add_photo_alternate</span></button>
          <button type="button" onClick={isRecording ? stopVoiceRecording : startVoiceRecording} className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRecording ? "bg-[#ffdad6] text-[#ba1a1a]" : "text-[#707975] hover:bg-[#f2f3ff]"}`}><span className="material-symbols-outlined text-[20px]">mic</span></button>
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Message customer..." className="flex-1 bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#134e3f]" />
          <button type="button" onClick={() => handleSendMessage()} disabled={sending || (!inputText.trim() && !photoPreview && !audioUrl)} className="w-10 h-10 rounded-xl bg-[#134e3f] text-white flex items-center justify-center hover:bg-[#00362a] active:scale-95 disabled:opacity-40 shrink-0">
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-20 md:pb-8 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto w-full">
      <header className="sticky top-0 md:top-16 z-30 bg-white/95 backdrop-blur-md border-b border-[#eaedff] px-4 pt-12 md:pt-4 pb-3.5 shadow-2xs md:rounded-2xl md:mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SahakariEmblem size={32} />
            <div>
              <h1 className="text-[17px] font-bold text-[#131b2e]">Messages</h1>
              <p className="text-[11px] text-[#707975]">Customer conversations</p>
            </div>
          </div>
          <span className="bg-[#b5efda] text-[#002018] font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>
            Live
          </span>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#707975] text-[18px]">search</span>
          <input type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Search customer or service..." className="w-full bg-[#f2f3ff] border border-[#d1ddd8] rounded-xl pl-9 pr-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#134e3f]" />
        </div>
      </header>

      <main className="flex-1 p-3.5 space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-7 h-7 border-2 border-[#134e3f] border-t-transparent rounded-full animate-spin"></div></div>
        ) : filteredConversations.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-[#eaedff] text-center my-6 space-y-3">
            <div className="w-14 h-14 bg-[#f2f3ff] text-[#134e3f] rounded-2xl mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">forum</span>
            </div>
            <h2 className="text-[15px] font-bold text-[#131b2e]">No Conversations Yet</h2>
            <p className="text-[12px] text-[#707975] max-w-xs mx-auto">When customers book your services, chats will appear here.</p>
            <Link href="/provider/requests" className="inline-flex items-center gap-1.5 bg-[#134e3f] text-white px-4 py-2 rounded-xl text-[12px] font-bold hover:bg-[#00362a]">
              <span className="material-symbols-outlined text-[16px]">notifications_active</span>
              View Service Leads
            </Link>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const hasUnread = conv.unreadCount > 0;
            return (
              <article key={conv.id} onClick={() => setActiveConversation(conv)} className={`bg-white rounded-2xl p-3.5 border transition-all cursor-pointer hover:border-[#134e3f] hover:shadow-xs flex items-start gap-3 relative ${hasUnread ? "border-[#134e3f] bg-[#f2f3ff]/40" : "border-[#eaedff]"}`}>
                <div className="w-12 h-12 rounded-xl bg-[#904d00] text-white flex items-center justify-center font-bold text-[15px] shrink-0 border border-[#d1ddd8]">
                  {conv.otherParticipant.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[13px] font-bold text-[#131b2e] truncate">{conv.otherParticipant.displayName}</span>
                    <span className="text-[10px] text-[#707975] font-mono shrink-0 ml-2">
                      {conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  {conv.booking && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-bold text-[#134e3f] bg-[#b5efda] px-1.5 py-0.5 rounded-full">{conv.booking.categoryName}</span>
                      <span className="text-[10px] text-[#707975]">• {conv.booking.status.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-[#707975] truncate">{conv.lastMessage?.content || "Tap to open"}</p>
                </div>
                {hasUnread && <span className="shrink-0 w-5 h-5 rounded-full bg-[#134e3f] text-white text-[10px] font-bold flex items-center justify-center">{conv.unreadCount}</span>}
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}

export default function ProviderMessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f4f6fa]"><div className="w-8 h-8 border-2 border-[#134e3f] border-t-transparent rounded-full animate-spin"></div></div>}>
      <ProviderMessagesContent />
    </Suspense>
  );
}
