import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function ScoreBar({ label, value, max }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span className="font-bold uppercase tracking-widest">{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-1 bg-emerald-400 rounded-full"
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

function OutputSkeleton({ lines = 4 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-slate-800 rounded ${i % 3 === 1 ? "w-4/5" : i % 3 === 2 ? "w-5/6" : "w-full"}`} />
      ))}
    </div>
  );
}

function App() {
  const [text, setText] = useState(() => localStorage.getItem("temp_job_text") || "");
  const [cvText, setCvText] = useState(() => localStorage.getItem("temp_cv_text") || "");
  const [report, setReport] = useState(null);
  const [outputs, setOutputs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [outputsLoading, setOutputsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const persistJob = (val) => {
    setText(val);
    localStorage.setItem("temp_job_text", val);
  };

  const persistCV = (val) => {
    setCvText(val);
    localStorage.setItem("temp_cv_text", val);
  };

  const handleClear = () => {
    setText("");
    setCvText("");
    setReport(null);
    setOutputs(null);
    setErrorMessage("");
    localStorage.removeItem("temp_job_text");
    localStorage.removeItem("temp_cv_text");
  };

  const fetchOutputs = async (jobText, cvContent) => {
    setOutputsLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate-outputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: jobText, cv: cvContent }),
      });
      if (!res.ok) throw new Error("Outputs endpoint failed");
      const data = await res.json();
      if (data.cover_letter) setOutputs(data);
    } catch (err) {
      console.error("Outputs generation failed:", err.message);
    } finally {
      setOutputsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setOutputs(null);
    setErrorMessage("");
    setStatusMsg("Initializing analysis...");

    const statuses = [
      "Scrutinizing job requirements...",
      "Comparing technical stack...",
      "Simulating recruiter rejection triggers...",
      "Drafting interview countermeasures...",
      "Finalizing audit...",
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < statuses.length) {
        setStatusMsg(statuses[i]);
        i++;
      }
    }, 2500);

    try {
      const res = await fetch(`${API_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: text, cv: cvText }),
      });
      const data = await res.json();
      setReport(data);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      fetchOutputs(text, cvText);
    } catch (err) {
      setErrorMessage("Server is busy or unreachable. Try again in 30 seconds.");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setStatusMsg("");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setStatusMsg("Extracting CV text...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/upload-cv`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      persistCV(data.text);
    } catch (err) {
      setErrorMessage("CV upload failed. Try again or paste your CV text directly.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  const breakdown = report?.result?.score_breakdown;
  const ats = report?.result?.ats_verdict;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">

        <div className="grid md:grid-cols-2 gap-12">
          {/* Left panel */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <span className="text-4xl font-black tracking-tighter">
                jobmatch<span className="text-emerald-400">.</span>
              </span>
              {report && (
                <button
                  onClick={handleClear}
                  className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition"
                >
                  New Analysis
                </button>
              )}
            </div>

            <div className="space-y-4">
              <textarea
                className="w-full h-64 bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none focus:border-indigo-500 transition"
                placeholder="Paste Job Description..."
                value={text}
                onChange={(e) => persistJob(e.target.value)}
              />
              <textarea
                className="w-full h-32 bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none focus:border-indigo-500 transition"
                placeholder="Paste CV Text..."
                value={cvText}
                onChange={(e) => persistCV(e.target.value)}
              />
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Upload CV
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 w-40"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-60"
            >
              {loading ? (
                <span className="animate-pulse">{statusMsg}</span>
              ) : (
                "Generate AI Career Report"
              )}
            </button>
          </div>

          {/* Right panel - main report */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl min-h-[600px]">
            {!report ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-700 py-32 text-center space-y-4">
                <div className="w-12 h-12 border border-slate-800 rounded-full flex items-center justify-center text-xl">
                  ?
                </div>
                <p className="italic text-sm">Professional Technical Audit will appear here.</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-700">

                {/* Score + breakdown */}
                <div className="border-b border-slate-800 pb-8 space-y-5">
                  <div className="flex justify-between items-end">
                    <div className="relative inline-block">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
                        Match Score
                      </p>
                      <h2 className="text-7xl font-black text-emerald-400 leading-none">
                        {report.result?.score}%
                      </h2>
                      <div className="absolute -top-1 -right-4 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </div>
                    </div>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                      {report.result?.level}
                    </span>
                  </div>

                  {breakdown && (
                    <div className="grid grid-cols-2 gap-3">
                      <ScoreBar label="Keywords" value={breakdown.keywords} max={25} />
                      <ScoreBar label="Experience" value={breakdown.experience} max={25} />
                      <ScoreBar label="Tech Skills" value={breakdown.technical_skills} max={30} />
                      <ScoreBar label="Projects" value={breakdown.project_relevance} max={20} />
                    </div>
                  )}
                </div>

                {/* ATS Verdict */}
                {ats && (
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    ats.passes
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-red-500/10 border-red-500/20"
                  }`}>
                    <span className={`text-lg font-black ${ats.passes ? "text-emerald-400" : "text-red-400"}`}>
                      {ats.passes ? "✓" : "✕"}
                    </span>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${ats.passes ? "text-emerald-400" : "text-red-400"}`}>
                        ATS {ats.passes ? "Pass" : "Fail"}
                      </p>
                      <p className="text-xs text-slate-400">{ats.reason}</p>
                    </div>
                  </div>
                )}

                {/* Verdict */}
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">
                    Verdict
                  </p>
                  <p className="text-sm text-slate-300 italic">"{report.result?.free_critique}"</p>
                </div>

                {/* Why you'd fail */}
                {report.result?.explanation && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                      Why You'd Fail the Screen
                    </p>
                    <p className="text-sm text-slate-400">{report.result?.explanation}</p>
                  </div>
                )}

                {/* Skills grid */}
                <div className="grid grid-cols-2 gap-6">
                  {report.result?.matched_skills?.length > 0 && (
                    <div>
                      <h3 className="text-emerald-400 font-bold mb-3 text-xs uppercase tracking-widest">
                        You Have
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {report.result.matched_skills.map((s, i) => (
                          <span
                            key={i}
                            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-medium uppercase"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-slate-200 font-bold mb-3 text-xs uppercase tracking-widest">
                      Missing
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {report.result?.missing_skills?.map((s, i) => (
                        <span
                          key={i}
                          className="bg-slate-950 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-medium uppercase"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rejection Risk */}
                {report.result?.rejection_reasons?.length > 0 && (
                  <div>
                    <h3 className="text-red-400 font-bold mb-3 text-xs uppercase tracking-widest">
                      Rejection Risk
                    </h3>
                    <div className="space-y-2">
                      {report.result.rejection_reasons.map((r, i) => (
                        <div
                          key={i}
                          className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl text-sm text-slate-300 flex items-start gap-2"
                        >
                          <span className="text-red-400 mt-0.5">✕</span> {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projected Score */}
                {report.result?.projected_score && (
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                        After Roadmap
                      </p>
                      <p className="text-xs text-slate-400 max-w-[200px]">
                        {report.result.projected_score.condition}
                      </p>
                    </div>
                    <p className="text-3xl font-black text-emerald-400">
                      {report.result.projected_score.score}%
                    </p>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-800 space-y-8">
                  {/* CV Enhancement */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-widest">
                        CV Enhancement
                      </h3>
                      <CopyButton text={report.result?.cv_enhancement?.rewrite_bullet || ""} />
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl text-sm italic leading-relaxed mb-4">
                      "{report.result?.cv_enhancement?.rewrite_bullet}"
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.result?.cv_enhancement?.hidden_keywords?.map((kw, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-1 rounded-md border border-emerald-400/20 font-bold"
                        >
                          +{kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Interview Cheat Sheet */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-widest">
                        Interview Cheat Sheet
                      </h3>
                      <CopyButton
                        text={`Q: ${report.result?.interview_prep?.killer_question}\n\nA: ${report.result?.interview_prep?.winning_answer}\n\nAvoid: ${report.result?.interview_prep?.trap_to_avoid}`}
                      />
                    </div>
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                      <div>
                        <p className="text-[10px] text-indigo-400 font-black uppercase mb-1 tracking-tighter">
                          The Killer Question:
                        </p>
                        <p className="text-sm text-slate-200 font-medium">
                          "{report.result?.interview_prep?.killer_question}"
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-400 font-black uppercase mb-1 tracking-tighter">
                          Winning Answer:
                        </p>
                        <p className="text-sm text-slate-300 italic">
                          "{report.result?.interview_prep?.winning_answer}"
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-red-400 font-black uppercase mb-1 tracking-tighter">
                          Never Say This:
                        </p>
                        <p className="text-sm text-red-300 italic">
                          "{report.result?.interview_prep?.trap_to_avoid}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Priority Roadmap */}
                  <div>
                    <h3 className="text-slate-200 font-bold mb-4 text-xs uppercase tracking-widest">
                      Priority Roadmap
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {report.result?.priority_roadmap?.map((item, i) => (
                        <div
                          key={i}
                          className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm text-slate-300 flex items-start gap-3"
                        >
                          <span className="text-emerald-400 shrink-0">✓</span> {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generated Outputs - full width */}
        {(outputs || outputsLoading) && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-slate-200 font-black text-sm uppercase tracking-widest">
                Generated Outputs
              </h2>
              {outputsLoading && (
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
                  Generating...
                </span>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Cover Letter */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-widest">
                    Cover Letter
                  </h3>
                  {outputs?.cover_letter && <CopyButton text={outputs.cover_letter} />}
                </div>
                {outputsLoading && !outputs?.cover_letter ? (
                  <OutputSkeleton lines={6} />
                ) : (
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {outputs?.cover_letter}
                  </p>
                )}
              </div>

              {/* Cold Outreach */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-widest">
                    Cold Outreach
                  </h3>
                  {outputs?.cold_email && <CopyButton text={outputs.cold_email} />}
                </div>
                {outputsLoading && !outputs?.cold_email ? (
                  <OutputSkeleton lines={3} />
                ) : (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {outputs?.cold_email}
                  </p>
                )}
              </div>

              {/* LinkedIn */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest">
                    LinkedIn
                  </h3>
                  {outputs?.linkedin_headline && (
                    <CopyButton
                      text={`${outputs.linkedin_headline}\n\n${outputs.linkedin_summary}`}
                    />
                  )}
                </div>
                {outputsLoading && !outputs?.linkedin_headline ? (
                  <OutputSkeleton lines={4} />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2">
                        Headline
                      </p>
                      <p className="text-sm text-slate-200 font-medium">
                        {outputs?.linkedin_headline}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2">
                        About
                      </p>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {outputs?.linkedin_summary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
      <Analytics />
    </div>
  );
}

export default App;
