import { useEffect, useState } from "react";
import { Download, X, Smartphone, Share2, PlusSquare, CheckCircle2, Sparkles } from "lucide-react";
import { cartTotals, useStore } from "@/lib/store";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(true); // start true to prevent flash during SSR/mount
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const cart = useStore((s) => s.cart);
  const { items: cartItemCount } = cartTotals(cart);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detect if already installed/downloaded
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    setIsInstalled(false);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) &&
      !(window.navigator as unknown as { standalone?: boolean }).standalone;
    setIsIOS(isIOSDevice);

    // 2. Listen to beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 3. Listen to appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowGuide(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // If user has already downloaded/installed it, HIDE component completely
  if (isInstalled) {
    return null;
  }

  // If dismissed during this session, hide
  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else {
      // If native prompt not triggered (iOS or other browsers), show intuitive instructions
      setShowGuide(true);
    }
  };

  const handleMarkAsInstalled = () => {
    setIsInstalled(true);
    setShowGuide(false);
  };

  // Adjust bottom offset if floating cart is present
  const bottomPositionClass = cartItemCount > 0 ? "bottom-28" : "bottom-16";

  return (
    <>
      {/* Floating PWA Install Banner */}
      <aside
        aria-label="Install Nanami Kitchen App"
        className={`fixed ${bottomPositionClass} left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3`}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-card/95 p-3 shadow-xl backdrop-blur-md ring-1 ring-primary/20">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2 ring-1 ring-primary/30">
            <img
              src="/icon-192.png"
              alt="Nanami Kitchen Logo"
              className="size-full rounded-lg object-cover"
              onError={(e) => {
                // fallback to icon if image fails
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <Smartphone className="size-5 text-primary" />
            <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">
              <Sparkles className="size-2" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-bold text-foreground">Install Nanami App</p>
              <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[9px] font-extrabold text-primary">
                PWA
              </span>
            </div>
            <p className="line-clamp-1 text-[11px] text-muted-foreground">
              Order faster directly from your home screen
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95"
            >
              <Download className="size-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss installation prompt"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Manual Step-by-step Guide Dialog for iOS or Desktop */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <Smartphone className="size-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">How to Install the App</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-muted-foreground">
              {isIOS ? (
                <>
                  <p className="font-medium text-foreground">For iPhone / iPad users on Safari:</p>
                  <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/30 p-2.5">
                    <Share2 className="size-4 shrink-0 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">1. Tap the Share button</p>
                      <p className="text-[11px]">
                        The square icon with an upward arrow in Safari&apos;s bottom navigation bar.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/30 p-2.5">
                    <PlusSquare className="size-4 shrink-0 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">
                        2. Select &quot;Add to Home Screen&quot;
                      </p>
                      <p className="text-[11px]">
                        Scroll down and tap &quot;Add to Home Screen&quot;.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">Install to Home Screen / Desktop:</p>
                  <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/30 p-2.5">
                    <Download className="size-4 shrink-0 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">
                        1. Tap the Install Icon in Browser
                      </p>
                      <p className="text-[11px]">
                        Tap the three dots (⋮) in Chrome or the download icon in your browser
                        address bar.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/30 p-2.5">
                    <PlusSquare className="size-4 shrink-0 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">
                        2. Select &quot;Install App&quot;
                      </p>
                      <p className="text-[11px]">
                        Confirm installation to add Nanami Kitchen to your home screen.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={handleMarkAsInstalled}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-105"
              >
                <CheckCircle2 className="size-3.5" />
                <span>I Have Installed It</span>
              </button>
              <button
                onClick={() => setShowGuide(false)}
                className="rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
