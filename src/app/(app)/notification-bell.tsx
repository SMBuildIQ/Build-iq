"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

const ENTITY_LINK: Record<string, (id: string) => string> = {
  PurchaseRequest: (id) => `/purchases/${id}`,
  RFQ: (id) => `/rfqs/${id}`,
  PurchaseOrder: (id) => `/orders/${id}`,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    const res = await fetch("/api/v1/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    // load()'s setState calls happen after an internal `await`, not
    // synchronously during this effect — standard fetch-on-mount-and-poll,
    // not the cascading-render pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="ml-1 rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-1 w-80 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
          {items.length === 0 ? (
            <p className="p-2 text-xs text-gray-400">No notifications yet.</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {items.map((n) => {
                const link = n.entityType && n.entityId ? ENTITY_LINK[n.entityType]?.(n.entityId) : undefined;
                const content = (
                  <div
                    className={`rounded-md p-2 text-xs ${n.readAt ? "text-gray-500" : "bg-gray-50 font-medium text-gray-900"}`}
                    onClick={() => !n.readAt && markRead(n.id)}
                  >
                    <div>{n.title}</div>
                    {n.body && <div className="text-gray-400">{n.body}</div>}
                  </div>
                );
                return <li key={n.id}>{link ? <Link href={link}>{content}</Link> : content}</li>;
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
