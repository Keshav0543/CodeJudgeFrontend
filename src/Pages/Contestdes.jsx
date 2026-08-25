import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import axiosClient from "../utils/axiosClient.js";
import {
  Terminal,
  ArrowLeft,
  Calendar,
  Clock,
  ListChecks,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const STATUS_STYLE = {
  Live: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    pulse: true,
    label: "Live",
  },
  Upcoming: {
    dot: "bg-amber-400",
    text: "text-amber-300",
    pulse: false,
    label: "upcoming",
  },
  Expired: {
    dot: "bg-slate-500",
    text: "text-slate-400",
    pulse: false,
    label: "expired",
  },
};

function useTick() {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function formatCountdown(target) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  return `${pad(h)}h:${pad(m)}m:${pad(sec)}s`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDuration(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Expired;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-mono ${s.text}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`}
      />
      {s.label}
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="h-4 w-32 bg-white/5 rounded mb-8" />
      <div className="rounded-lg border border-white/5 bg-[#0F131B] p-6 mb-6">
        <div className="h-6 w-2/3 bg-white/5 rounded mb-3" />
        <div className="h-4 w-full bg-white/5 rounded mb-2" />
        <div className="h-4 w-3/4 bg-white/5 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/5 rounded-lg" />
        ))}
      </div>
      <div className="h-40 bg-white/5 rounded-lg" />
    </div>
  );
}

export default function ContestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  useTick();

  const [contest, setContest] = useState(null);
  const [status, setStatus] = useState("Expired");
  const [isRegistered, setIsRegistered] = useState(false); // 👈 naya: registration state
  const [searchLoading, setSearchLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [registering, setRegistering] = useState(false); // 👈 naya
  const [registerError, setRegisterError] = useState(""); // 👈 naya

  // refetch timer ref, taaki purana timer clear kar ke naya laga sakein
  const refetchTimerRef = useRef(null);

  const getContestData = useCallback(
    async (showLoader = true) => {
      let cancelled = false;
      try {
        if (showLoader) setSearchLoading(true);
        setLoadError("");
        const result = await axiosClient.get(`/user/contest/${id}`);
        if (cancelled) return;

        setContest(result.data.contest);
        setStatus(result.data.status);
        setIsRegistered(!!result.data.isRegistered); // 👈 naya

        // purana pending timer clear karo
        if (refetchTimerRef.current) {
          clearTimeout(refetchTimerRef.current);
          refetchTimerRef.current = null;
        }

        // agar delay mila hai (Upcoming ya Running), status transition pe auto refetch lagao
        const { delay } = result.data;
        if (delay != null && delay >= 0) {
          refetchTimerRef.current = setTimeout(() => {
            getContestData(false); // background refetch, skeleton mat dikhao
          }, delay + 1000); // 1s buffer clock drift / network ke liye
        }
      } catch (err) {
        if (!cancelled)
          setLoadError(err?.response?.data?.message || err.message);
      } finally {
        if (!cancelled && showLoader) setSearchLoading(false);
      }
      return () => {
        cancelled = true;
      };
    },
    [id],
  );

  useEffect(() => {
    getContestData(true);

    // safety net: agar timer miss ho jaye (tab background mein throttle hua),
    // mount pe fresh state already mil jayegi upar wale call se — extra kuch nahi chahiye

    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = null;
      }
    };
  }, [id, getContestData]);

  // tab wapas visible hone par bhi ek dafa check kar lo (background throttle ka safety net)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        getContestData(false);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [getContestData]);

  const handleEnter = useCallback(() => {
    navigate(`/contest/${id}/arena`);
  }, [navigate, id]);

  // 👇 naya: register handler
  const handleRegister = useCallback(async () => {
    try {
      setRegistering(true);
      setRegisterError("");
      await axiosClient.post("user/contest/register", { contest_id: id });
      setIsRegistered(true);
    } catch (err) {
      setRegisterError(err?.response?.data?.message || err.message);
    } finally {
      setRegistering(false);
    }
  }, [id]);

  const countdownLabel =
    status === "Upcoming"
      ? `starts in ${formatCountdown(contest?.startTime) ?? "--:--:--"}`
      : status === "Live"
        ? `ends in ${formatCountdown(contest?.endTime) ?? "--:--:--"}`
        : null;

  return (
    <div className="min-h-screen bg-[#0A0D13] px-5 py-10 md:py-16">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500&display=swap');
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .font-sans, body { font-family: 'Inter', ui-sans-serif, system-ui; }
      `}</style>

      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate("/contestlist")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-8 font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          back to contests
        </button>

        {loadError ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-5 font-mono text-sm">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>error</span>
            </div>
            <p className="text-red-300/80">{loadError}</p>
          </div>
        ) : searchLoading ? (
          <DetailsSkeleton />
        ) : !contest ? (
          <div className="rounded-lg border border-white/5 bg-[#0F131B] p-10 text-center">
            <span className="font-mono text-xs text-slate-600">
              // contest not found
            </span>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="rounded-lg border border-white/5 bg-[#0F131B] overflow-hidden mb-6">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{contest.type}_contest</span>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="p-6">
                <h1 className="text-2xl md:text-3xl font-semibold text-slate-100 mb-2">
                  {contest.title}
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">
                  {contest.description}
                </p>

                {countdownLabel && (
                  <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-slate-300">
                    <Clock className="w-3.5 h-3.5" />
                    {countdownLabel}
                  </div>
                )}

                {isRegistered && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-violet-500/20 bg-violet-500/[0.06] px-3 py-1.5 font-mono text-xs text-violet-300">
                    <Users className="w-3.5 h-3.5" />
                    you're registered
                  </div>
                )}
              </div>
            </div>

            {/* Meta stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-white/5 bg-[#0F131B] p-4">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono mb-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  date
                </div>
                <span className="text-slate-200 text-sm">
                  {fmtDate(contest.startTime)}
                </span>
              </div>
              <div className="rounded-lg border border-white/5 bg-[#0F131B] p-4">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono mb-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  starts
                </div>
                <span className="text-slate-200 text-sm">
                  {fmtTime(contest.startTime)}
                </span>
              </div>
              <div className="rounded-lg border border-white/5 bg-[#0F131B] p-4">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono mb-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  duration
                </div>
                <span className="text-slate-200 text-sm">
                  {fmtDuration(contest.startTime, contest.endTime)}
                </span>
              </div>
              <div className="rounded-lg border border-white/5 bg-[#0F131B] p-4">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono mb-1.5">
                  <ListChecks className="w-3.5 h-3.5" />
                  problems
                </div>
                <span className="text-slate-200 text-sm">
                  {contest.problem?.length ?? 0}
                </span>
              </div>
            </div>

            {/* Rules */}
            {contest.rules?.length > 0 && (
              <div className="rounded-lg border border-white/5 bg-[#0F131B] p-6 mb-6">
                <h2 className="text-slate-200 text-sm font-medium mb-3 font-mono">
                  // rules
                </h2>
                <ul className="space-y-2">
                  {contest.rules.map((rule, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 text-slate-400 text-sm leading-relaxed"
                    >
                      <span className="text-slate-600 font-mono">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action */}
            {registerError && (
              <div className="mb-3 rounded-md border border-red-500/20 bg-red-500/[0.04] px-3 py-2 font-mono text-xs text-red-300/80">
                {registerError}
              </div>
            )}

            {status === "Expired" ? (
              <button
                disabled
                className="w-full rounded-md py-3 text-sm font-medium bg-white/[0.03] text-slate-600 cursor-not-allowed border border-white/5"
              >
                contest ended
              </button>
            ) : isRegistered ? (
              status === "Live" ? (
                <button
                  onClick={handleEnter}
                  className="w-full flex items-center justify-center gap-2 rounded-md py-3 text-sm font-medium transition-colors bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                >
                  enter contest
                </button>
              ) : (
                <button
                  disabled
                  className="w-full rounded-md py-3 text-sm font-medium bg-white/[0.03] text-slate-500 cursor-not-allowed border border-white/5"
                >
                  registered — contest not started yet
                </button>
              )
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 text-sm font-medium transition-colors bg-violet-500/10 hover:bg-violet-500/15 text-violet-300 border border-violet-500/30 disabled:opacity-50"
              >
                {registering ? "registering..." : "register for contest"}
              </button>
            )}
          </>
        )}

        <div className="mt-8 flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
          <Loader2
            className={`w-3 h-3 ${searchLoading ? "animate-spin" : "opacity-0"}`}
          />
          <span>{searchLoading ? "fetching contest..." : "sync complete"}</span>
        </div>
      </div>
    </div>
  );
}