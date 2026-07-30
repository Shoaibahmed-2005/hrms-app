import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  fetchAnnouncements,
  fetchCompanySettings,
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
  const clickCount = useRef(0);
  const clickTimer = useRef<number | null>(null);

  function handleHeaderClick() {
    clickCount.current += 1;
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      const currentSecret = localStorage.getItem("kiosk_device_secret") || "";
      const secret = window.prompt("Admin: Enter Kiosk Device Secret (UUID) to register this tablet to an outlet:", currentSecret);
      if (secret !== null) {
        if (secret.trim() === "") {
          localStorage.removeItem("kiosk_device_secret");
          toast.success("Device unregistered.");
        } else {
          localStorage.setItem("kiosk_device_secret", secret.trim());
          toast.success("Device registered successfully!");
        }
      }
    }
    if (clickTimer.current) window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => {
      clickCount.current = 0;
    }, 2000);
  }

  useEffect(() => {
    async function load() {
      try {
        const [ann, settings] = await Promise.all([
          fetchAnnouncements(),
          fetchCompanySettings(),
        ]);
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        // Parse shiftEnd (e.g. "18:30")
        const [shiftEndHour, shiftEndMin] = (settings.shiftEnd || "18:30").split(":").map(Number);
        const shiftEnd = new Date(now);
        shiftEnd.setHours(shiftEndHour || 18, shiftEndMin || 30, 0, 0);

        // Active only if created today AND current time <= shiftEnd time
        const isWithinWorkingHours = now <= shiftEnd;

        setAnnouncements(
          ann.filter((a) => {
            if (!a.active) return false;
            const dateVal = a.createdAt || (a as any).created_at;
            const createdDate = dateVal ? new Date(dateVal) : null;
            const isCreatedToday = createdDate
              ? createdDate.toDateString() === now.toDateString()
              : true;
            return isCreatedToday && isWithinWorkingHours;
          })
        );
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
      className="flex h-screen flex-col overflow-hidden relative"
      style={{ 
        maxHeight: "100dvh",
        backgroundImage: "url('/bg.png')",
        backgroundSize: "500px",
        backgroundRepeat: "repeat",
        backgroundPosition: "center top"
      }}
    >
      <div className="absolute inset-0 bg-background/30 z-0"></div>
      
      {/* Header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b bg-card/80 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleHeaderClick}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
            <ScanFace className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Cleans Attendance Kiosk
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
          <div className="text-center space-y-2 bg-card/80 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl">
            <img src="/cleans-logo.png" alt="Cleans Logo" className="h-20 mx-auto object-contain mb-2 drop-shadow-sm" />
            <h2 className="text-4xl font-bold tracking-tight text-foreground drop-shadow-md">
              Welcome
            </h2>
            <p className="text-lg text-muted-foreground font-medium">
              Choose an action to start face scanning
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 relative z-10">
            <Link
              to="/attendance"
              search={{ action: "in" }}
              className="group flex h-48 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-blue-500 bg-white/40 backdrop-blur-md text-blue-600 shadow-2xl transition-all hover:bg-blue-50 hover:shadow-blue-500/30 active:scale-[0.98] dark:text-blue-400 dark:border-blue-600 dark:bg-card/40"
            >
              <div className="rounded-full bg-blue-100 p-4 group-hover:scale-110 transition-transform duration-300 dark:bg-blue-900/50">
                <LogIn className="h-12 w-12" />
              </div>
              <span className="text-2xl font-bold tracking-tight drop-shadow-sm">Check-In</span>
            </Link>

            <Link
              to="/attendance"
              search={{ action: "out" }}
              className="group flex h-48 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-emerald-500 bg-white/40 backdrop-blur-md text-emerald-600 shadow-2xl transition-all hover:bg-emerald-50 hover:shadow-emerald-500/30 active:scale-[0.98] dark:text-emerald-400 dark:border-emerald-600 dark:bg-card/40"
            >
              <div className="rounded-full bg-emerald-100 p-4 group-hover:scale-110 transition-transform duration-300 dark:bg-emerald-900/50">
                <LogOut className="h-12 w-12" />
              </div>
              <span className="text-2xl font-bold tracking-tight drop-shadow-sm">Check-Out</span>
            </Link>
          </div>

          <p className="text-center text-base font-extrabold text-slate-900 dark:text-slate-100 drop-shadow-sm">
            Tap a button above, then look into the camera
          </p>
        </div>
      </main>

      {/* Footer — announcements ticker */}
      {announcements.length > 0 && (
        <footer className="relative z-10 shrink-0 border-t border-white/20 bg-primary/90 backdrop-blur-md text-primary-foreground overflow-hidden shadow-lg">
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
