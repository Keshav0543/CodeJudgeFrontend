import { useParams, useNavigate } from "react-router";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  fetchProblemById,
  runCode,
  submitCode,
  GetSubmissionsDetails,
  fetchContestSolvedProblems,
} from "../Api/problemApi.jsx";
import { TO_SUBMISSION_LANGUAGE, LANGUAGE_LABEL } from "../components/languageMap.jsx";
import ProblemDescription from "../components/ProblemDescription.jsx";
import CodeEditor from "../components/codeeditor.jsx";
import TestCasePanel from "../components/testCasepanel.jsx";
import ConsoleOutput from "../components/consoleOutput.jsx";
import SubmissionTable from "../components/submissiontable.jsx";
import axiosClient from "../utils/axiosClient.js";

const DIFFICULTY_STYLE = {
  easy: { dot: "bg-emerald-400", text: "text-emerald-400" },
  medium: { dot: "bg-amber-400", text: "text-amber-400" },
  hard: { dot: "bg-red-400", text: "text-red-400" },
};

const PlayIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M6 4.5v11l9-5.5-9-5.5Z" />
  </svg>
);

const CheckCircleIcon = ({ className = "h-3.5 w-3.5" }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.9-4.2 4.2-1.9-1.9a.9.9 0 1 0-1.27 1.28l2.55 2.55a.9.9 0 0 0 1.27 0l4.83-4.84A.9.9 0 1 0 13.7 8.1Z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
    <path
      fillRule="evenodd"
      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.79 6.8-6.8a1 1 0 0 1 1.4 0Z"
      clipRule="evenodd"
    />
  </svg>
);

const isAccepted = (result) => {
  if (!result) return false;
  const desc = (result.status?.description || result.status || "")
    .toString()
    .toLowerCase();
  return desc.includes("accepted");
};

function SubmissionVerdict({ submitting, result, error }) {
  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <span className="loading loading-dots loading-lg text-teal-400" />
        <span className="cj-mono text-xs uppercase tracking-widest text-[#6B7686]">
          Judging submission…
        </span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 font-mono text-sm text-red-300">
        <span className="text-red-400 font-semibold">✗ error:</span> {String(error)}
      </div>
    );
  }
  if (!result) {
    return (
      <p className="cj-mono text-sm text-[#6B7686]">
        // submit your solution to see the verdict here
      </p>
    );
  }
  const accepted = isAccepted(result);
  const verdictText = accepted
    ? "Accepted"
    : result.status?.description || result.status || "Wrong Answer";
  return (
    <div className="space-y-4">
      <div className={`cj-mono text-2xl font-bold ${accepted ? "text-emerald-400" : "text-red-400"}`}>
        {verdictText}
      </div>
      <div className="flex gap-6 cj-mono text-xs text-[#6B7686]">
        <div>
          <div className="uppercase tracking-wider">Runtime</div>
          <div className="text-sm text-[#E6EDF3] mt-1">
            {result.time != null ? `${result.time} ms` : "—"}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wider">Memory</div>
          <div className="text-sm text-[#E6EDF3] mt-1">
            {result.memory != null ? `${result.memory} KB` : "—"}
          </div>
        </div>
      </div>
      {!accepted && result.stdout !== undefined && (
        <div className="cj-mono text-xs text-[#6B7686]">
          <div className="uppercase tracking-wider mb-1">Output</div>
          <pre className="whitespace-pre-wrap rounded-md border border-[#1F2733] bg-[#10141C] p-3 text-[#E6EDF3]">
            {result.stdout ?? "null"}
          </pre>
        </div>
      )}
    </div>
  );
}

// finishTimer is an absolute epoch ms deadline from the backend
// (min(startTime + 90min, contest.endTime)) — always derive remaining
// time from it, never run an independent 90:00 countdown on the client.
function useCountdown(finishTimer, onExpire) {
  const [remainingMs, setRemainingMs] = useState(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!finishTimer) return;
    const tick = () => {
      const diff = new Date(finishTimer).getTime() - Date.now();
      setRemainingMs(diff);
      if (diff <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [finishTimer, onExpire]);

  return remainingMs;
}

function formatDuration(ms) {
  if (ms === null) return "--:--:--";
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function BattleArena() {
  const { id } = useParams(); // this is the CONTEST id
  const navigate = useNavigate();

  // ── Arena-level state (startTime / finishTimer / problem list) ──
  const [arenaLoading, setArenaLoading] = useState(true);
  const [arenaError, setArenaError] = useState("");
  const [arenaMeta, setArenaMeta] = useState(null); // { startTime, finishTimer, problemInfo }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [solvedIds, setSolvedIds] = useState(new Set());

  // ── Per-problem state, cached by problemId so switching tabs
  //    between problems doesn't refetch or lose code ──
  const [problemCache, setProblemCache] = useState({}); // { [problemId]: doc }
  const [problemLoading, setProblemLoading] = useState({}); // { [problemId]: bool }
  const [problemLoadError, setProblemLoadError] = useState({}); // { [problemId]: string }
  const [codeByProblem, setCodeByProblem] = useState({}); // { [problemId]: { [lang]: code } }
  const [languageByProblem, setLanguageByProblem] = useState({}); // { [problemId]: lang }
  const [submissionsByProblem, setSubmissionsByProblem] = useState({}); // { [problemId]: [] }

  const [leftTab, setLeftTab] = useState("description");
  const [bottomTab, setBottomTab] = useState("testcase");

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [actionError, setActionError] = useState("");

  // ── Load arena (startTime, finishTimer, problem list) ──
  useEffect(() => {
    let cancelled = false;
    async function loadArena() {
      try {
        setArenaLoading(true);
        setArenaError("");
        const result = await axiosClient.get(`/user/contest/${id}/arena`);
        if (!cancelled) setArenaMeta(result.data);
      } catch (err) {
        if (!cancelled) setArenaError(err?.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setArenaLoading(false);
      }
    }
    loadArena();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const problems = arenaMeta?.problemInfo ?? [];
  const currentEntry = problems[currentIndex];
  const currentProblemId = currentEntry?.problemId?._id ?? currentEntry?.problemId;
  const currentProblem = problemCache[currentProblemId];
  const currentProblemError = problemLoadError[currentProblemId];

  // ── Fetch the full problem doc via the same route ProblemPage uses,
  //    the moment a problem is opened. Cached, so this only runs once
  //    per problem per arena session. ──
  useEffect(() => {
    if (
      !currentProblemId ||
      problemCache[currentProblemId] ||
      problemLoading[currentProblemId]
    )
      return;
    let cancelled = false;

    async function loadProblem() {
      try {
        setProblemLoading((prev) => ({ ...prev, [currentProblemId]: true }));
        setProblemLoadError((prev) => ({ ...prev, [currentProblemId]: "" }));
        const { data } = await fetchProblemById(currentProblemId);
        if (cancelled) return;

        setProblemCache((prev) => ({ ...prev, [currentProblemId]: data }));

        const initialCode = {};
        (data.startCode || []).forEach((sc) => {
          initialCode[sc.language] = sc.initialCode;
        });
        setCodeByProblem((prev) => ({
          ...prev,
          [currentProblemId]: { ...initialCode, ...(prev[currentProblemId] || {}) },
        }));
        setLanguageByProblem((prev) => ({
          ...prev,
          [currentProblemId]: prev[currentProblemId] || data.startCode?.[0]?.language || "",
        }));
      } catch (err) {
        if (!cancelled) {
          // Store the error PER PROBLEM (not the shared actionError) so a
          // failed load on problem #2 doesn't silently show a spinner
          // forever, and doesn't get wiped out when you switch problems.
          const msg = err?.response?.data?.message || err?.response?.data || err.message;
          setProblemLoadError((prev) => ({ ...prev, [currentProblemId]: msg }));
        }
      } finally {
        if (!cancelled) {
          setProblemLoading((prev) => ({ ...prev, [currentProblemId]: false }));
        }
      }
    }

    loadProblem();
    return () => {
      cancelled = true;
    };
  }, [currentProblemId, problemCache, problemLoading]);

  // ── Which contest problems has the user solved — CONTEST-SCOPED, not
  //    global. Previously this hit /user/ProblemSolvedByUser which returns
  //    every problem the user has EVER solved on the platform, so a problem
  //    solved before the contest (outside it) showed up as solved here too.
  //    Now it hits a contest-scoped endpoint that only counts submissions
  //    tagged with this contestId. ──
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function loadSolved() {
      try {
        const { data } = await fetchContestSolvedProblems(id);
        if (cancelled) return;
        setSolvedIds(new Set(data));
      } catch (err) {
        if (!cancelled) console.log("Error loading solved list: ", err);
      }
    }
    loadSolved();
    return () => {
      cancelled = true;
    };
  }, [id, submitResult]);

  // ── Submission history for the open problem ──
  useEffect(() => {
    if (!currentProblemId) return;
    let cancelled = false;
    async function loadSubmissions() {
      try {
        const { data } = await GetSubmissionsDetails(currentProblemId);
        if (!cancelled) {
          setSubmissionsByProblem((prev) => ({ ...prev, [currentProblemId]: data }));
        }
      } catch (err) {
        if (!cancelled) console.log("Error: ", err);
      }
    }
    loadSubmissions();
    return () => {
      cancelled = true;
    };
  }, [currentProblemId, submitResult]);

  const handleFinishArena = useCallback(() => {
    navigate(`/contest/${id}/result`);
  }, [id, navigate]);

  const remainingMs = useCountdown(arenaMeta?.finishTimer, handleFinishArena);
  const isCritical = remainingMs !== null && remainingMs <= 5 * 60 * 1000;

  const language = languageByProblem[currentProblemId] || "";
  const setLanguage = (lang) =>
    setLanguageByProblem((prev) => ({ ...prev, [currentProblemId]: lang }));

  const code = codeByProblem[currentProblemId]?.[language] ?? "";
  const setCode = (value) =>
    setCodeByProblem((prev) => ({
      ...prev,
      [currentProblemId]: { ...(prev[currentProblemId] || {}), [language]: value },
    }));

  const availableLanguages = useMemo(
    () => (currentProblem?.startCode || []).map((sc) => sc.language),
    [currentProblem]
  );

  const buildPayload = () => ({
    code,
    language: TO_SUBMISSION_LANGUAGE[language] || language,
    contest_id: id, // must be contest_id (snake_case) — backend destructures req.body.contest_id
  });

  const switchProblem = (idx) => {
    setCurrentIndex(idx);
    setLeftTab("description");
    setBottomTab("testcase");
    setRunResult(null);
    setSubmitResult(null);
    setActionError("");
  };

  const retryLoadProblem = () => {
    if (!currentProblemId) return;
    // clear the error + cache flags so the loadProblem effect re-fires
    setProblemLoadError((prev) => ({ ...prev, [currentProblemId]: "" }));
    setProblemCache((prev) => {
      const next = { ...prev };
      delete next[currentProblemId];
      return next;
    });
  };

  const handleRun = async () => {
    setRunning(true);
    setActionError("");
    setRunResult(null);
    setBottomTab("result");
    try {
      const { data } = await runCode(currentProblemId, buildPayload());
      setRunResult(data);
      setBottomTab("testcase");
    } catch (err) {
      setActionError(err?.response?.data || err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setActionError("");
    setSubmitResult(null);
    setBottomTab("result");
    setLeftTab("verdict");
    try {
      const { data } = await submitCode(currentProblemId, buildPayload());
      setSubmitResult(data);
    } catch (err) {
      setActionError(err?.response?.data || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const diff = DIFFICULTY_STYLE[currentProblem?.difficultylevel] || {
    dot: "bg-slate-400",
    text: "text-slate-400",
  };

  const leftTabs = [
    { key: "description", label: "Description" },
    { key: "submissions", label: "Submissions" },
  ];
  if (submitting || submitResult) {
    leftTabs.push({
      key: "verdict",
      label: submitting
        ? "Judging…"
        : isAccepted(submitResult)
        ? "Accepted"
        : submitResult?.status?.description || submitResult?.status || "Wrong Answer",
      accepted: !submitting && isAccepted(submitResult),
    });
  }

  if (arenaLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-[#0B0E14]">
        <span className="loading loading-dots loading-lg text-teal-400" />
        <span className="font-mono text-xs tracking-widest text-[#6B7686]">
          ENTERING ARENA…
        </span>
      </div>
    );
  }

  if (arenaError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0B0E14] p-4">
        <div className="max-w-md w-full rounded-lg border border-red-400/30 bg-[#1a1012] px-4 py-3 font-mono text-sm text-red-300">
          <span className="text-red-400">✗ error:</span> {String(arenaError)}
        </div>
      </div>
    );
  }

  const solvedCount = problems.filter((p) => solvedIds.has(p.problemId?._id ?? p.problemId)).length;
  const isProblemLoading = problemLoading[currentProblemId];
  const isProblemSolved = solvedIds.has(currentProblemId);

  return (
    <div className="cj-page h-screen w-full flex flex-col bg-[#0B0E14] text-[#E6EDF3] overflow-hidden">
      <style>{`
        .cj-page { font-family: Inter, system-ui, sans-serif; }
        .cj-mono { font-family: "JetBrains Mono", ui-monospace, "Fira Code", monospace; }
        .cj-cursor::after {
          content: "";
          display: inline-block;
          width: 7px;
          height: 1.05em;
          margin-left: 3px;
          background: currentColor;
          vertical-align: -2px;
          animation: cj-blink 1.1s step-end infinite;
        }
        @keyframes cj-blink { 50% { opacity: 0; } }
        .cj-solved-glow { box-shadow: 0 0 0 1px rgba(63,185,80,0.35), 0 0 14px rgba(63,185,80,0.18); }
        .cj-tab { position: relative; }
        .cj-tab[data-active="true"]::after {
          content: "";
          position: absolute;
          left: 10px; right: 10px; bottom: -1px;
          height: 2px;
          background: #2DD4BF;
          box-shadow: 0 0 8px rgba(45,212,191,0.6);
        }
        .cj-tab[data-active="true"][data-accepted="true"]::after {
          background: #34D399;
          box-shadow: 0 0 8px rgba(52,211,153,0.6);
        }
        .cj-tab[data-active="true"][data-accepted="false"]::after {
          background: #F87171;
          box-shadow: 0 0 8px rgba(248,113,113,0.6);
        }
        .cj-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .cj-scroll::-webkit-scrollbar-track { background: transparent; }
        .cj-scroll::-webkit-scrollbar-thumb { background: #1F2733; border-radius: 8px; }
        .cj-scroll::-webkit-scrollbar-thumb:hover { background: #2A3442; }
        .cj-dotgrid {
          background-image: radial-gradient(rgba(230,237,243,0.06) 1px, transparent 1px);
          background-size: 14px 14px;
        }
        *:focus-visible { outline: 2px solid #2DD4BF; outline-offset: 2px; }
      `}</style>

      {/* Navbar */}
      <div className="flex items-center h-14 px-4 border-b border-[#1F2733] bg-[#0D1117] shrink-0 gap-3">
        <span className="cj-mono cj-cursor text-lg font-bold text-teal-400 tracking-tight">
          CodeJudge
        </span>
        <span className="h-4 w-px bg-[#1F2733]" />
        <span className="cj-mono text-[11px] uppercase tracking-widest text-[#6B7686]">
          Arena · {solvedCount}/{problems.length} solved
        </span>

        <div className="flex-1" />

        <div
          className={`cj-mono flex items-center gap-2 rounded-md border px-3 py-1 tabular-nums ${
            isCritical
              ? "animate-pulse border-red-400/40 bg-red-400/10 text-red-300"
              : "border-[#1F2733] bg-[#10141C] text-teal-300"
          }`}
        >
          <span className="text-[10px] uppercase tracking-widest text-[#6B7686]">time left</span>
          <span className="text-base font-bold">{formatDuration(remainingMs)}</span>
        </div>

        <button
          type="button"
          className="cj-mono rounded-md bg-teal-400 px-3 py-1.5 text-xs font-semibold text-[#0B0E14] hover:bg-teal-300 transition-colors"
          onClick={() => setConfirmFinishOpen(true)}
        >
          Finish Arena
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Problem list sidebar */}
        <div className="w-56 shrink-0 flex flex-col border-r border-[#1F2733] bg-[#0D1117]">
          <ul className="cj-scroll flex-1 overflow-y-auto py-2">
            {problems.map((p, idx) => {
              const pid = p.problemId?._id ?? p.problemId;
              const title = p.problemId?.title ?? `Problem ${idx + 1}`;
              const solved = solvedIds.has(pid);
              const active = idx === currentIndex;
              return (
                <li key={`${pid ?? "unknown"}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => switchProblem(idx)}
                    className={`cj-mono flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors ${
                      active
                        ? "border-l-2 border-teal-400 bg-teal-400/10 text-[#E6EDF3]"
                        : "border-l-2 border-transparent text-[#6B7686] hover:bg-white/5 hover:text-[#B7C2CE]"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] ${
                        solved
                          ? "bg-emerald-400 text-[#0B0E14]"
                          : "border border-[#1F2733] text-[#6B7686]"
                      }`}
                    >
                      {solved ? <CheckIcon /> : idx + 1}
                    </span>
                    <span className="truncate">{title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {currentProblemError ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-lg border border-red-400/30 bg-[#1a1012] px-4 py-3 font-mono text-sm text-red-300 space-y-3">
              <div>
                <span className="text-red-400">✗ error loading problem:</span>{" "}
                {String(currentProblemError)}
              </div>
              <button
                type="button"
                onClick={retryLoadProblem}
                className="rounded-md border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-400/10"
              >
                Retry
              </button>
            </div>
          </div>
        ) : isProblemLoading || !currentProblem ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="loading loading-dots loading-lg text-teal-400" />
          </div>
        ) : (
          <>
            {/* Left panel */}
            <div className="w-[42%] min-w-[340px] flex flex-col border-r border-[#1F2733] bg-[#0D1117]">
              <div className="flex items-center gap-1 px-3 pt-2 border-b border-[#1F2733]">
                <span
                  className={`cj-mono mr-2 inline-flex items-center gap-1.5 rounded-full border border-[#1F2733] bg-[#10141C] px-2.5 py-1 text-[11px] uppercase tracking-wider ${diff.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${diff.dot}`} />
                  {currentProblem.difficultylevel}
                </span>
                {isProblemSolved && (
                  <span className="cj-mono cj-solved-glow mr-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    <CheckCircleIcon className="h-3 w-3" />
                    Solved
                  </span>
                )}
                {leftTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    data-active={leftTab === t.key}
                    data-accepted={t.key === "verdict" ? String(!!t.accepted) : undefined}
                    onClick={() => setLeftTab(t.key)}
                    className={`cj-tab cj-mono px-3 py-2 text-[12px] uppercase tracking-wide rounded-t-md transition-colors ${
                      t.key === "verdict"
                        ? t.accepted
                          ? "text-emerald-400"
                          : "text-red-400"
                        : leftTab === t.key
                        ? "text-teal-300"
                        : "text-[#6B7686] hover:text-[#B7C2CE]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="cj-scroll flex-1 overflow-y-auto p-5">
                {leftTab === "description" && <ProblemDescription problem={currentProblem} />}
                {leftTab === "submissions" && (
                  <SubmissionTable submitResult={submissionsByProblem[currentProblemId] || []} />
                )}
                {leftTab === "verdict" && (
                  <SubmissionVerdict submitting={submitting} result={submitResult} error={actionError} />
                )}
              </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between px-4 h-12 border-b border-[#1F2733] bg-[#0D1117] shrink-0">
                <select
                  className="cj-mono appearance-none rounded-md border border-[#1F2733] bg-[#10141C] pl-3 pr-8 py-1.5 text-xs text-[#E6EDF3] focus:border-teal-400/60"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANGUAGE_LABEL[lang] || lang}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="cj-mono inline-flex items-center gap-1.5 rounded-md border border-teal-400/40 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-400/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    onClick={handleRun}
                    disabled={running || submitting}
                  >
                    {running ? <span className="loading loading-spinner loading-xs" /> : (<><PlayIcon /> Run</>)}
                  </button>
                  <button
                    type="button"
                    className="cj-mono inline-flex items-center gap-1.5 rounded-md bg-teal-400 px-3 py-1.5 text-xs font-semibold text-[#0B0E14] hover:bg-teal-300 disabled:opacity-40 disabled:hover:bg-teal-400 transition-colors"
                    onClick={handleSubmit}
                    disabled={running || submitting}
                  >
                    {submitting ? <span className="loading loading-spinner loading-xs" /> : (<><CheckIcon /> Submit</>)}
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <CodeEditor language={language} value={code} onChange={setCode} />
              </div>

              <div className="h-56 shrink-0 border-t border-[#1F2733] bg-[#0D1117] flex flex-col">
                <div className="flex items-center gap-1 px-3 pt-2 border-b border-[#1F2733]">
                  {[
                    { key: "testcase", label: "Testcase" },
                    { key: "result", label: "Result" },
                    { key: "console", label: "Console" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      data-active={bottomTab === t.key}
                      onClick={() => setBottomTab(t.key)}
                      className={`cj-tab cj-mono px-3 py-1.5 text-[11px] uppercase tracking-wide rounded-t-md transition-colors ${
                        bottomTab === t.key ? "text-teal-300" : "text-[#6B7686] hover:text-[#B7C2CE]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="cj-scroll cj-dotgrid flex-1 overflow-y-auto p-4">
                  {bottomTab === "testcase" && (
                    <TestCasePanel testcases={currentProblem?.visibleTestcases} runResult={runResult} />
                  )}
                  {bottomTab === "result" && (
                    <div className="space-y-2 cj-mono text-sm">
                      {actionError && (
                        <div className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-red-300">
                          <span className="text-red-400 font-semibold">✗ </span>
                          {String(actionError)}
                        </div>
                      )}
                      {submitResult && (
                        <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-300">
                          <span className="text-emerald-400 font-semibold">✓ </span>
                          {submitResult.note}
                        </div>
                      )}
                      {!actionError && !submitResult && !running && !submitting && (
                        <p className="text-[#6B7686]">// run or submit to see results here</p>
                      )}
                    </div>
                  )}
                  {bottomTab === "console" && <ConsoleOutput runResult={runResult} />}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {confirmFinishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-[#1F2733] bg-[#0D1117] p-5 cj-mono">
            <h3 className="text-sm font-semibold text-[#E6EDF3]">End the arena early?</h3>
            <p className="py-3 text-xs text-[#6B7686]">
              You've solved {solvedCount} of {problems.length} problems. This can't be undone —
              you won't be able to submit again after finishing.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[#1F2733] px-3 py-1.5 text-xs text-[#B7C2CE] hover:bg-white/5"
                onClick={() => setConfirmFinishOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-red-400 px-3 py-1.5 text-xs font-semibold text-[#0B0E14] hover:bg-red-300"
                onClick={handleFinishArena}
              >
                Finish now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BattleArena;