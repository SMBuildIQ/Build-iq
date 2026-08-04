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
    <div className="fixed inset-x-3 bottom-6 z-50 mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-[var(--ink)] p-4 text-[var(--paper)] shadow-xl safe-bottom">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-72.png" alt="" className="h-11 w-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold">Install BuildIQ</p>
          <p className="mt-0.5 text-sm text-[var(--mist)]">
            {iosHint
              ? "Tap Share, then “Add to Home Screen” for the full app."
              : "Add BuildIQ to your home screen for one-tap estimating."}
          </p>
          <div className="mt-3 flex gap-2">
            {!iosHint && deferred && (
              <button
                className="rounded-lg bg-[var(--copper)] px-3 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  await deferred.prompt();
                  setVisible(false);
                }}
              >
                Install app
              </button>
            )}
            <button
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--mist)]"
              onClick={() => setVisible(false)}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
