"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;

    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    if (isIOS) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-[5.5rem] z-40 mx-auto max-w-sm border border-white/10 bg-[var(--dark)]/95 p-3.5 text-white backdrop-blur-md safe-bottom md:bottom-6">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" className="h-9 w-9 object-contain opacity-90" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm tracking-wide text-[var(--orange)]">Install BuildIQ</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/65">
            {iosHint
              ? "Share → Add to Home Screen for the full app."
              : "Add Supply Monkey IQ to your home screen."}
          </p>
          <div className="mt-2.5 flex gap-2">
            {!iosHint && deferred && (
              <button
                className="btn-copper !px-3 !py-1.5 !text-xs"
                onClick={async () => {
                  await deferred.prompt();
                  setVisible(false);
                }}
              >
                Install
              </button>
            )}
            <button
              className="px-2 py-1.5 text-xs font-medium text-white/55 hover:text-white"
              onClick={() => setVisible(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
