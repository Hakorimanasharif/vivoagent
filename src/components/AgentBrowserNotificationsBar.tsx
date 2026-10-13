import { useState } from "react";
import { Bell, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_DISMISS = "nexora-agent-notif-prompt-dismissed";

export default function AgentBrowserNotificationsBar() {
  const [step, setStep] = useState(0);
  const [denied, setDenied] = useState(
    () => typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied",
  );
  const [gone, setGone] = useState(() => {
    if (typeof window === "undefined") return true;
    if (!("Notification" in window)) return true;
    try {
      if (localStorage.getItem(STORAGE_DISMISS) === "1") return true;
    } catch {
      return true;
    }
    if (Notification.permission !== "default" && Notification.permission !== "denied") return true;
    return false;
  });

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_DISMISS, "1");
    } catch { /* ignore */ }
    setGone(true);
  };

  const allow = async () => {
    try {
      const p = await Notification.requestPermission();
      if (p === "granted") {
        try {
          new Notification("Nexora Agent", {
            body: "Alerts on — deposits & withdrawals will buzz here.",
          });
        } catch { /* ignore */ }
        try {
          window.dispatchEvent(new Event("nexora:agent-push-allowed"));
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    dismiss();
  };

  if (gone) return null;

  if (denied) {
    return (
      <div className="shrink-0 border-b border-red-500/30 bg-gradient-to-r from-red-500/10 via-background to-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-600">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Notifications are blocked — deposit & withdrawal alerts can't reach this phone</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chrome: lock icon in address bar → Site settings → Notifications → Allow. Then reopen this page.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-9" onClick={() => { setDenied(false); dismiss(); }}>
            Got it
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => { setDenied(false); dismiss(); }} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-background to-rose-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
          {step === 0 ? <Bell className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          {step === 0 ? (
            <>
              <p className="text-sm font-bold text-foreground">Allow notifications for deposit & withdrawal alerts</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get notified the second a user submits a deposit or withdrawal — even in a background tab.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-foreground">Also works with the app closed</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                After allowing, open the bell → Enable closed-app alerts to buzz like YouTube when the tab is closed.
              </p>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {step === 0 ? (
          <>
            <Button size="sm" variant="outline" className="h-9" onClick={dismiss}>
              Not now
            </Button>
            <Button size="sm" className="h-9" onClick={() => setStep(1)}>
              Next
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button size="sm" className="h-9 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => void allow()}>
              Allow notifications
            </Button>
          </>
        )}
        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
