"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  content?: string | null;
  isRead?: boolean | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    apiFetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/customer")} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-slate-900">Notifications</h1>
        </div>
      </div>
      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`bg-white rounded-2xl p-4 border ${n.isRead ? "border-slate-100" : "border-blue-200"}`}>
                <div className="font-semibold text-slate-800">{n.title}</div>
                {n.content && <div className="text-sm text-slate-500 mt-1">{n.content}</div>}
                <div className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
