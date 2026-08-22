import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient.js";
import { useSelector } from "react-redux";
import {
  Terminal,
  Calendar,
  Clock,
  ListChecks,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const ACCENTS = {
  saturday: {
    text: "text-violet-400",
    dot: "bg-violet-400",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_0_1px_rgba(167,139,250,0.15)]",
    chip: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  },
  sunday: {
    text: "text-cyan-300",
    dot: "bg-cyan-300",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_0_1px_rgba(103,232,249,0.15)]",
    chip: "bg-cyan-500/10 text-cyan-200 border-cyan-500/20",
  },
};

const STATUS_STYLE = {
  Live: { dot: "bg-emerald-400", text: "text-emerald-300", pulse: true, label: "Live" },
  Upcoming: { dot: "bg-amber-400", text: "text-amber-300", pulse: false, label: "upcoming" },
  Expired: { dot: "bg-slate-500", text: "text-slate-400", pulse: false, label: "expired" },
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
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function ContestCard({ label, day, data, onView }) {
  useTick();
  const accent = ACCENTS[day];
  const { contest, status } = data;
  const s = STATUS_STYLE[status] || STATUS_STYLE.Expired;

  const countdownLabel =
    status === "Upcoming"
      ? `starts in ${formatCountdown(contest?.startTime) ?? "--:--:--"}`
      : status === "Live"
      ? `ends in ${formatCountdown(contest?.endTime) ?? "--:--:--"}`
      : null;

  return (
    <div
      className={`rounded-lg border bg-[#0F131B] ${accent.border} ${accent.glow} overflow-hidden flex flex-col`}
    >
      {/* terminal chrome */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className={`ml-3 font-mono text-xs ${accent.text}`}>
            {label.toLowerCase()}_contest
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-mono ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />
          {s.label}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        {!contest ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center gap-2">
            <span className="font-mono text-xs text-slate-600">// no contest scheduled</span>
            <span className="text-slate-500 text-sm">Check back for {label.toLowerCase()}</span>
          </div>
        ) : (
          <>
            <span
              className={`self-start mb-3 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${accent.chip}`}
            >
              {label}
            </span>

            <h3 className="text-slate-100 font-medium text-lg leading-snug mb-1.5">
              {contest.title}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-5 line-clamp-2">
              {contest.description}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5 font-mono">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="text-slate-300">{fmtDate(contest.startTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="text-slate-300">{fmtDuration(contest.startTime, contest.endTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Terminal className="w-3.5 h-3.5 shrink-0" />
                <span className="text-slate-300">{fmtTime(contest.startTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ListChecks className="w-3.5 h-3.5 shrink-0" />
                <span className="text-slate-300">{contest.problem?.length ?? 0} problems</span>
              </div>
            </div>

            {countdownLabel && (
              <div className="mb-4 text-xs font-mono text-slate-500">
                <span className={s.text}>{countdownLabel}</span>
              </div>
            )}

            <button
              onClick={() => onView(contest._id)}
              disabled={status === "Expired"}
              className={`mt-auto w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors
                ${
                  status === "Expired"
                    ? "bg-white/[0.03] text-slate-600 cursor-not-allowed"
                    : "bg-white/[0.06] hover:bg-white/[0.1] text-slate-100 border border-white/10"
                }`}
            >
              {status === "Expired" ? "unavailable" : "view contest"}
              {status !== "Expired" && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0F131B] overflow-hidden animate-pulse">
      <div className="h-10 border-b border-white/5 bg-white/[0.02]" />
      <div className="p-5 space-y-4">
        <div className="h-4 w-24 bg-white/5 rounded" />
        <div className="h-5 w-3/4 bg-white/5 rounded" />
        <div className="h-4 w-full bg-white/5 rounded" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="h-3 bg-white/5 rounded" />
          <div className="h-3 bg-white/5 rounded" />
          <div className="h-3 bg-white/5 rounded" />
          <div className="h-3 bg-white/5 rounded" />
        </div>
        <div className="h-10 bg-white/5 rounded-md mt-2" />
      </div>
    </div>
  );
}

export default function ContestList() {
  const [contestdata, setContestData] = useState({
    saturdayContest: { contest: null, status: "Expired" },
    sundayContest: { contest: null, status: "Expired" },
  });
  const [searchLoading, setSearchLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const {user}=useSelector((state)=>state.auth);

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function getContestData() {
      try {
        setSearchLoading(true);
        setLoadError("");
        const result = await axiosClient.get("/user/contest");
        if (!cancelled) setContestData(result.data);
      } catch (err) {
        if (!cancelled) setLoadError(err?.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }
    getContestData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleView = useCallback(
    (id) => navigate(`/contest/${id}`),
    [navigate]
  );

  return (
    <div className="min-h-screen bg-[#0A0D13] px-5 py-10 md:py-16">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500&display=swap');
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .font-sans, body { font-family: 'Inter', ui-sans-serif, system-ui; }
      `}</style>

      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 mb-3">
            <Terminal className="w-3.5 h-3.5" />
            <span>{user.firstName}@codejudge:~$ contests --weekend</span>
            <span className="w-1.5 h-3.5 bg-slate-500 animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-100">
            Weekend contests
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Saturday qualifier feeds into Sunday finals. One shot each, back to back.
          </p>
        </div>

        {loadError ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-5 font-mono text-sm">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>error</span>
            </div>
            <p className="text-red-300/80">{loadError}</p>
          </div>
        ) : searchLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ContestCard
              label="Saturday"
              day="saturday"
              data={contestdata.saturdayContest}
              onView={handleView}
            />
            <ContestCard
              label="Sunday"
              day="sunday"
              data={contestdata.sundayContest}
              onView={handleView}
            />
          </div>
        )}

        <div className="mt-8 flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
          <Loader2 className={`w-3 h-3 ${searchLoading ? "animate-spin" : "opacity-0"}`} />
          <span>{searchLoading ? "fetching contests..." : "sync complete"}</span>
        </div>
      </div>
    </div>
  );
}