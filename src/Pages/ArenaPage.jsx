import { useParams, useNavigate } from "react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import axiosClient from "../utils/axiosClient.js";
import { runCode, submitCode, fetchContestSolvedProblems } from "../Api/problemApi.jsx";
import { TO_SUBMISSION_LANGUAGE, LANGUAGE_LABEL } from "../components/languageMap.jsx";
import ProblemDescription from "../components/ProblemDescription.jsx";
import CodeEditor from "../components/codeeditor.jsx";
import TestCasePanel from "../components/testCasepanel.jsx";
import ConsoleOutput from "../components/consoleOutput.jsx";
import { Terminal, Clock, CheckCircle2, Circle } from "lucide-react";

function formatTime(ms) {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function BattleArena() {
  const { id: contestId } = useParams();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]); // [{ problemId: {...populated}, points }]
  const [activeIdx, setActiveIdx] = useState(0);
  const [solvedIds, setSolvedIds] = useState(new Set());
  const [finishTime, setFinishTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [language, setLanguage] = useState("");
  const [codeByLanguage, setCodeByLanguage] = useState({});

  const [bottomTab, setBottomTab] = useState("testcase");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [actionError, setActionError] = useState("");

  const hasStartedRef = useRef(false);

  // Contest enter karo — idempotent (backend: startedAt sirf null ho tabhi set hota hai)
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        // ⚠️ apna actual startContest route/method yahan confirm kar
        const res = await axiosClient.get(`/user/contest/${contestId}/arena`);
        const probs = res.data.ProblemInfo || [];
        setProblems(probs);
        setFinishTime(new Date(res.data.FinishcontestTime).getTime());

        // pehle problem ke startCode se language + code init karo
        const first = probs[0]?.problemId;
        if (first?.startCode?.length) {
          const initialCode = {};
          first.startCode.forEach((sc) => {
            initialCode[sc.language] = sc.initialCode;
          });
          setCodeByLanguage(initialCode);
          setLanguage(first.startCode[0].language);
        }
      } catch (err) {
        setLoadError(err?.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [contestId]);

  // Timer tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refreshSolved = useCallback(async () => {
    try {
      const res = await fetchContestSolvedProblems(contestId);
      // ⚠️ apne getContestSolvedProblems controller ka exact field name yahan daalna
      const ids = res.data.solvedProblemIds || res.data.solved || [];
      setSolvedIds(new Set(ids.map(String)));
    } catch (err) {
      console.error("solved list refresh failed", err);
    }
  }, [contestId]);

  useEffect(() => {
    refreshSolved();
  }, [refreshSolved]);

  const activeProblem = problems[activeIdx]?.problemId;
  const availableLanguages = (activeProblem?.startCode || []).map((sc) => sc.language);
  const code = codeByLanguage[language] ?? "";
  const setCode = (value) =>
    setCodeByLanguage((prev) => ({ ...prev, [language]: value }));

  // Problem switch pe uss problem ka apna starter code + language load karo
  useEffect(() => {
    setRunResult(null);
    setSubmitResult(null);
    setActionError("");
    setBottomTab("testcase");

    if (activeProblem?.startCode?.length) {
      const initialCode = {};
      activeProblem.startCode.forEach((sc) => {
        initialCode[sc.language] = sc.initialCode;
      });
      setCodeByLanguage(initialCode);
      setLanguage(activeProblem.startCode[0].language);
    }
  }, [activeIdx]);

  const timeLeftMs = finishTime ? finishTime - now : 0;
  const isTimeUp = finishTime && timeLeftMs <= 0;

  const handleRun = async () => {
    if (!activeProblem) return;
    setRunning(true);
    setActionError("");
    setRunResult(null);
    setBottomTab("result");
    try {
      const { data } = await runCode(activeProblem._id, {
        code,
        language: TO_SUBMISSION_LANGUAGE[language] || language,
      });
      setRunResult(data);
      setBottomTab("testcase");
    } catch (err) {
      setActionError(err?.response?.data || err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeProblem) return;
    setSubmitting(true);
    setActionError("");
    setSubmitResult(null);
    setBottomTab("result");
    try {
      const { data } = await submitCode(activeProblem._id, {
        code,
        language: TO_SUBMISSION_LANGUAGE[language] || language,
        contest_id: contestId, // snake_case — backend controller ke saath match
      });
      setSubmitResult(data);
      if (data.status === "Accepted") refreshSolved();
    } catch (err) {
      setActionError(err?.response?.data || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    navigate(`/contest/${contestId}/leaderboard`);
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-[#0B0E14] text-[#6B7686] font-mono text-sm">
        loading arena...
      </div>
    );
  if (loadError)
    return (
      <div className="h-screen flex items-center justify-center bg-[#0B0E14] text-red-400 font-mono text-sm">
        {loadError}
      </div>
    );

  return (
    <div className="h-screen w-full flex flex-col bg-[#0B0E14] text-[#E6EDF3] overflow-hidden">
      {/* Navbar */}
      <div className="flex items-center h-14 px-4 border-b border-[#1F2733] bg-[#0D1117] shrink-0">
        <div className="flex-1 flex items-center gap-2 font-mono text-sm text-teal-400 font-bold">
          <Terminal className="w-4 h-4" />
          CodeJudge
        </div>
        <div
          className={`flex items-center gap-2 font-mono text-sm ${
            isTimeUp ? "text-red-400" : "text-emerald-300"
          }`}
        >
          <Clock className="w-4 h-4" />
          {isTimeUp ? "time's up" : formatTime(timeLeftMs)}
        </div>
        <button
          onClick={handleFinish}
          className="ml-4 px-4 py-1.5 rounded-md text-xs font-mono bg-red-500/10 hover:bg-red-500/15 text-red-300 border border-red-500/30 transition-colors"
        >
          Finish Contest
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div className="w-56 border-r border-[#1F2733] bg-[#0D1117] p-4 overflow-y-auto shrink-0">
          <p className="font-mono text-[11px] text-[#6B7686] mb-3">CONTEST</p>
          <ul className="space-y-1">
            {problems.map((p, i) => {
              const solved = solvedIds.has(String(p.problemId?._id));
              return (
                <li key={p.problemId?._id || i}>
                  <button
                    onClick={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm font-mono transition-colors ${
                      i === activeIdx
                        ? "bg-white/[0.06] text-slate-100"
                        : "text-[#6B7686] hover:bg-white/[0.03]"
                    }`}
                  >
                    {solved ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    Problem {i + 1}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Left panel — description */}
        <div className="w-[42%] min-w-[340px] flex flex-col border-r border-[#1F2733] bg-[#0D1117]">
          <div className="cj-scroll flex-1 overflow-y-auto p-5">
            {activeProblem && <ProblemDescription problem={activeProblem} />}
          </div>
        </div>

        {/* Right panel — editor, same structure/sizing as ProblemPage */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 h-12 border-b border-[#1F2733] bg-[#0D1117] shrink-0">
            <select
              className="font-mono appearance-none rounded-md border border-[#1F2733] bg-[#10141C] pl-3 pr-8 py-1.5 text-xs text-[#E6EDF3] focus:border-teal-400/60"
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
                onClick={handleRun}
                disabled={running || submitting || isTimeUp}
                className="font-mono rounded-md border border-teal-400/40 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-400/10 disabled:opacity-40 transition-colors"
              >
                {running ? "..." : "Run"}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={running || submitting || isTimeUp}
                className="font-mono rounded-md bg-teal-400 px-3 py-1.5 text-xs font-semibold text-[#0B0E14] hover:bg-teal-300 disabled:opacity-40 transition-colors"
              >
                {submitting ? "..." : "Submit"}
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
                  onClick={() => setBottomTab(t.key)}
                  className={`font-mono px-3 py-1.5 text-[11px] uppercase tracking-wide rounded-t-md transition-colors ${
                    bottomTab === t.key
                      ? "text-teal-300"
                      : "text-[#6B7686] hover:text-[#B7C2CE]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="cj-scroll flex-1 overflow-y-auto p-4">
              {bottomTab === "testcase" && (
                <TestCasePanel
                  testcases={activeProblem?.visibleTestcases}
                  runResult={runResult}
                />
              )}

              {bottomTab === "result" && (
                <div className="space-y-2 font-mono text-sm">
                  {actionError && (
                    <div className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-red-300">
                      <span className="text-red-400 font-semibold">✗ </span>
                      {String(actionError)}
                    </div>
                  )}
                  {submitResult && (
                    <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-300">
                      <span className="text-emerald-400 font-semibold">
                        {submitResult.status === "Accepted" ? "✓ Accepted" : `✗ ${submitResult.status}`}
                      </span>
                    </div>
                  )}
                  {!actionError && !submitResult && !running && !submitting && (
                    <p className="text-[#6B7686]">
                      // run or submit to see results here
                    </p>
                  )}
                </div>
              )}

              {bottomTab === "console" && <ConsoleOutput runResult={runResult} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}