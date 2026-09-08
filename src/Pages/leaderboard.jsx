import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient.js";
import {
  Terminal,
  ArrowLeft,
  Trophy,
  Target,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Hourglass,
} from "lucide-react";

function ResultSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="h-4 w-32 bg-white/5 rounded mb-8" />
      <div className="rounded-lg border border-white/5 bg-[#0F131B] p-8">
        <div className="h-5 w-40 bg-white/5 rounded mb-6 mx-auto" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-28 bg-white/5 rounded-lg" />
          <div className="h-28 bg-white/5 rounded-lg" />
          <div className="h-28 bg-white/5 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [submitdata, setsubmitData] = useState(null);
  const [searchLoading, setSearchLoding] = useState(false);
  const [loadError, setLoadError] = useState("");

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function getData() {
      try {
        setSearchLoding(true);
        setLoadError("");
        const result = await axiosClient.get(`user/contest/${id}/leaderboard`);
        console.log(result.data);
        if (!cancelled) setsubmitData(result.data);
      } catch (err) {
        if (!cancelled)
          setLoadError(err?.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setSearchLoding(false);
      }
    }

    getData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const points = submitdata?.points ?? 0;
  const solved = submitdata?.solved ?? 0;
  const totalProblems = submitdata?.totalProblems ?? "--";
  const title = submitdata?.title || "Contest";
  const message = submitdata?.message;

  return (
    <div className="min-h-screen bg-[#0A0D13] px-5 py-10 md:py-16">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500&display=swap');
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .font-sans, body { font-family: 'Inter', ui-sans-serif, system-ui; }
      `}</style>

      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(`/contest/${id}`)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-8 font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          back to contest
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
          <ResultSkeleton />
        ) : (
          <div className="rounded-lg border border-violet-500/30 bg-[#0F131B] shadow-[0_0_0_1px_rgba(167,139,250,0.15)] overflow-hidden">
            {/* terminal chrome */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2 font-mono text-xs text-violet-300">
                <Terminal className="w-3.5 h-3.5" />
                <span>contest_result</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                fetched
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-amber-300" />
                <h1 className="text-slate-100 text-lg font-medium">
                  Your performance
                </h1>
              </div>
              <p className="text-center text-slate-500 text-xs font-mono mb-8">
                {title}
              </p>

              {/* stats — daisyUI stats component */}
              <div className="stats stats-vertical sm:stats-horizontal w-full bg-white/[0.02] border border-white/5 rounded-lg font-mono">
                <div className="stat place-items-center">
                  <div className="stat-figure text-cyan-300">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="stat-title text-slate-500 text-[11px] uppercase tracking-wider">
                    solved
                  </div>
                  <div className="stat-value text-cyan-300 text-3xl">
                    {solved}
                    <span className="text-slate-600 text-lg"> / {totalProblems}</span>
                  </div>
                </div>

                <div className="stat place-items-center">
                  <div className="stat-figure text-violet-300">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="stat-title text-slate-500 text-[11px] uppercase tracking-wider">
                    score
                  </div>
                  <div className="stat-value text-violet-300 text-3xl">
                    {points}
                  </div>
                </div>

                <div className="stat place-items-center">
                  <div className="stat-figure text-slate-500">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div className="stat-title text-slate-500 text-[11px] uppercase tracking-wider">
                    rank
                  </div>
                  <div className="stat-value text-slate-500 text-3xl">
                    --
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 rounded-md border border-amber-400/20 bg-amber-400/[0.04] px-4 py-3 text-center">
                <Hourglass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-mono text-xs text-amber-200/80">
                  Rank will be available after contest ends.
                </span>
              </div>

              {message && (
                <div className="mt-4 text-center">
                  <span className="font-mono text-xs text-slate-600">
                    // {message}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
          <Loader2
            className={`w-3 h-3 ${searchLoading ? "animate-spin" : "opacity-0"}`}
          />
          <span>{searchLoading ? "fetching result..." : "sync complete"}</span>
        </div>
      </div>
    </div>
  );
}