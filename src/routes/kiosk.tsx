import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fetchAnnouncements,
  type Announcement,
} from "@/lib/hrms-db";
import { LogIn, LogOut, Loader2, ScanFace } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/kiosk")({
  head: () => ({ meta: [{ title: "Attendance Kiosk" }] }),
  component: KioskPage,
});

function KioskPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    async function load() {
      try {
        const ann = await fetchAnnouncements();
        setAnnouncements(ann.filter((a) => a.active));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    void load();

    // Live clock
    const clockInterval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-background"
      style={{ maxHeight: "100dvh" }}
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b bg-card px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
            <ScanFace className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            CleanUp Attendance Kiosk
          </h1>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-semibold tracking-tight text-foreground tabular-nums">
            {timeStr}
          </div>
          <div className="text-xs text-muted-foreground">{dateStr}</div>
        </div>
      </header>

      {/* Main — centered vertically and horizontally */}
      <main className="flex flex-1 min-h-0 flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome
            </h2>
            <p className="text-muted-foreground">
              Choose an action to start face scanning
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Link
              to="/attendance"
              search={{ action: "in" }}
              className="flex h-44 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg transition-all hover:bg-emerald-100 hover:shadow-xl active:scale-[0.98] dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/50"
            >
              <LogIn className="h-14 w-14" />
              <span className="text-2xl font-bold tracking-tight">Check-In</span>
            </Link>

            <Link
              to="/attendance"
              search={{ action: "out" }}
              className="flex h-44 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-orange-500 bg-orange-50 text-orange-700 shadow-lg transition-all hover:bg-orange-100 hover:shadow-xl active:scale-[0.98] dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-950/50"
            >
              <LogOut className="h-14 w-14" />
              <span className="text-2xl font-bold tracking-tight">Check-Out</span>
            </Link>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Tap a button above, then look into the camera
          </p>
        </div>
      </main>

      {/* Footer — announcements ticker */}
      {announcements.length > 0 && (
        <footer className="shrink-0 border-t bg-primary text-primary-foreground overflow-hidden">
          <div className="flex h-11 items-center whitespace-nowrap">
            <div className="flex shrink-0 items-center gap-2 border-r border-primary-foreground/20 px-4 font-bold uppercase tracking-wider text-sm">
              Notice
            </div>
            <div className="relative flex-1 overflow-hidden">
              <div className="animate-marquee flex gap-16 whitespace-nowrap px-4">
                {announcements.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-2 text-sm">
                    <span className="font-semibold">{a.title}:</span>
                    <span className="opacity-90">{a.body}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </footer>
      )}

      <style>{`
        .animate-marquee {
          display: inline-flex;
          animation: marquee 35s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
      <Toaster position="top-center" />
    </div>
  );
}
