"use client";

import { useEffect, useState } from "react";

export type MeUser = {
  id?: string;
  name: string;
  email?: string;
  companyName?: string | null;
  role?: string;
};

/** Load the signed-in user for client AppShell pages. */
export function useMe() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.user) {
          setUser({
            id: d.user.id,
            name: d.user.name || "You",
            email: d.user.email,
            companyName: d.user.companyName,
            role: d.user.role,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
