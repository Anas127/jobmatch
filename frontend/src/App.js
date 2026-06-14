import { useState, useEffect } from "react";
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

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const savedJob = localStorage.getItem("temp_job_text");
    const savedCV = localStorage.getItem("temp_cv_text");
    if (savedJob) setText(savedJob);
    if (savedCV) setCvText(savedCV);
  }, []);

  useEffect(() => {
    localStorage.setItem("temp_job_text", text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem("temp_cv_text", cvText);
  }, [cvText]);

  const handleClear = () => {
    setText("");
    setCvText("");
    setReport(null);
    setErrorMessage("");
    localStorage.removeItem("temp_job_text");
    localStorage.removeItem("temp_cv_text");
  };

  const handleAnalyze = async () => {
    setLoading(true);
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
      setCvText(data.text);
    } catch (err) {
      setErrorMessage("CV upload failed. Try again or paste your CV text directly.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
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
              onChange={(e) => setText(e.target.value)}
            />
            <textarea
              className="w-full h-32 bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none focus:border-indigo-500 transition"
              placeholder="Paste CV Text..."
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
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
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
          >
            {loading ? (
              <span className="animate-pulse">{statusMsg}</span>
            ) : (
              "Generate AI Career Report"
            )}
          </button>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl min-h-[600px] relative">
          {!report ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-700 py-32 text-center space-y-4">
              <div className="w-12 h-12 border border-slate-800 rounded-full flex items-center justify-center text-xl">
                ?
              </div>
              <p className="italic text-sm">Professional Technical Audit will appear here.</p>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="flex justify-between items-end border-b border-slate-800 pb-8">
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

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">
                  Verdict
                </p>
                <p className="text-sm text-slate-300 italic">
                  "{report.result?.free_critique}"
                </p>
              </div>

              {report.result?.explanation && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                    Why You'd Fail the Screen
                  </p>
                  <p className="text-sm text-slate-400">{report.result?.explanation}</p>
                </div>
              )}

              <div>
                <h3 className="text-slate-200 font-bold mb-4 text-xs uppercase tracking-widest">
                  Missing Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.result?.missing_skills?.map((s, i) => (
                    <span
                      key={i}
                      className="bg-slate-950 text-slate-300 border border-slate-800 px-4 py-1.5 rounded-xl text-xs font-medium uppercase"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {report.result?.rejection_reasons?.length > 0 && (
                <div>
                  <h3 className="text-red-400 font-bold mb-3 text-xs uppercase tracking-widest">
                    Rejection Risk
                  </h3>
                  <div className="space-y-2">
                    {report.result?.rejection_reasons?.map((r, i) => (
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

              <div className="pt-8 border-t border-slate-800 space-y-10">
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
                        <span className="text-emerald-400">✓</span> {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Analytics />
    </div>
  );
}

export default App;
