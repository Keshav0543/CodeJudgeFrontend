import { useState } from "react";
import useEditorial from "../components/FetchEditorial.jsx";
import { useParams, useNavigate} from "react-router";
import { useSelector } from "react-redux";
import { Plus as PlusIcon } from "lucide-react";

const CopyIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h6A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5H13v-1.5h1.5v-9h-6V5H7v-1.5Z" />
    <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h6a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 10.5 6h-6ZM4.5 7.5h6v9h-6v-9Z" />
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

const LANG_LABEL = {
  java: "Java",
  cpp: "C++",
  javascript: "JavaScript",
};

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="relative rounded-md border border-[#1F2733] bg-[#10141C] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1F2733] bg-[#0D1117]">
        <span className="cj-mono text-[11px] uppercase tracking-wider text-[#6B7686]">
          {LANG_LABEL[language] || language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-ghost btn-xs cj-mono gap-1 text-[#6B7686] hover:text-teal-300"
        >
          {copied ? (
            <>
              <CheckIcon /> copied
            </>
          ) : (
            <>
              <CopyIcon /> copy
            </>
          )}
        </button>
      </div>
      <pre className="cj-scroll overflow-x-auto p-4 text-[13px] leading-relaxed text-[#E6EDF3]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EditorialSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-[#1F2733]" />
      <div className="h-3 w-full rounded bg-[#1F2733]" />
      <div className="h-3 w-5/6 rounded bg-[#1F2733]" />
      <div className="h-40 w-full rounded-md bg-[#1F2733]" />
    </div>
  );
}

function MediaBlock({ media }) {
  if (!media || media.length === 0) return null;

  return (
    <div className="space-y-3">
      {media.map((m, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-md border border-[#1F2733] bg-[#10141C]"
        >
          {m.type === "video" ? (
            <video
              src={m.url}
              controls
              className="w-full max-h-80 bg-black"
            />
          ) : (
            <img src={m.url}  alt={`editorial-media-${i}`} className="w-full object-contain" />
          )}
        </div>
      ))}
    </div>
  );
}

function Editorial() {
  const {problemId}=useParams();
  const { data, loading, error } = useEditorial(problemId);
  const [activeLang, setActiveLang] = useState(0);
  const { user } = useSelector((state) => state.auth);
  const navigate=useNavigate();
  const isAdmin=user?.role==="admin";

  if (loading) return <EditorialSkeleton />;

  if (error) {
    return (
      <div className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 font-mono text-sm text-red-300">
        <span className="text-red-400 font-semibold">✗ error:</span> {String(error)}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <span className="cj-mono text-sm text-[#6B7686]">
          // editorial not written yet
        </span>
        <span className="cj-mono text-xs text-[#4B5563]">
          check back later, or try solving it your own way first 🙂
        </span>
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate(`/admin/create/Editorial/${problemId}`)}
            className="btn btn-sm mt-2 gap-1.5 border-teal-400/30 bg-teal-400/10 text-teal-300 hover:bg-teal-400/20 cj-mono"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            create editorial
          </button>
        )}
      </div>
    );
  }

  const { title, languages = [], media = [], sections = [] } = data;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h3 className="cj-mono text-base font-semibold text-[#E6EDF3]">{title}</h3>
        <div className="mt-1 h-px w-full bg-gradient-to-r from-teal-400/40 via-[#1F2733] to-transparent" />
      </div>

      {/* Media (video/image) */}
      <MediaBlock media={media} />

      {/* Sections (heading + content) */}
      {sections.length > 0 && (
        <div className="space-y-5">
          {sections.map((s, i) => (
            <div key={i} className="space-y-1.5">
              {s.heading && (
                <h4 className="cj-mono text-xs font-semibold uppercase tracking-wider text-teal-300">
                  {s.heading}
                </h4>
              )}
              <p className="text-sm leading-relaxed text-[#B7C2CE] whitespace-pre-wrap">
                {s.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Code solutions */}
      {languages.length > 0 && (
        <div className="space-y-2">
          <div className="cj-mono text-xs uppercase tracking-wider text-teal-300">
            Solution
          </div>

          {languages.length > 1 && (
            <div role="tablist" className="tabs tabs-boxed bg-[#10141C] border border-[#1F2733] w-fit">
              {languages.map((l, i) => (
                <button
                  key={l.language + i}
                  role="tab"
                  type="button"
                  onClick={() => setActiveLang(i)}
                  className={`tab cj-mono text-xs !rounded-md transition-colors ${
                    activeLang === i
                      ? "tab-active bg-teal-400/15 text-teal-300"
                      : "text-[#6B7686] hover:text-[#B7C2CE]"
                  }`}
                >
                  {LANG_LABEL[l.language] || l.language}
                </button>
              ))}
            </div>
          )}

          <CodeBlock
            code={languages[activeLang]?.code ?? ""}
            language={languages[activeLang]?.language ?? "code"}
          />
        </div>
      )}
    </div>
  );
}

export default Editorial;