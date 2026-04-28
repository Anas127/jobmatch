import { useState, useEffect, useCallback } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. RE-SYNC: This looks for the report in the DB and populates the UI
  const loadExistingReport = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/report/${id}`);
      const data = await res.json();
      if (data && !data.error) {
        setReport(data);
        // We only fill textareas if they are currently empty to prevent overwriting user typing
        setText((prev) => prev || data.job_text || "");
        setCvText((prev) => prev || data.cv_text || "");
      }
    } catch (err) {
      console.error("Database sync failed");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isUnlocked = params.get("unlocked") === "true";

    // THE FIX: Check URL first, then check LocalStorage memory
    const urlId = params.get("report_id");
    const savedId = localStorage.getItem("active_report_id");
    const activeId = urlId || savedId;

    if (activeId) {
      if (isUnlocked) {
        // If we see the unlocked flag, flip the bit in the DB
        fetch(`${API_URL}/unlock/${activeId}`, { method: "POST" }).then(() => {
          // After flipping DB, load the fresh data
          loadExistingReport(activeId);
          // Clean the URL so it looks professional
          const url = new URL(window.location.href);
          url.searchParams.set("report_id", activeId);
          url.searchParams.delete("unlocked");
          window.history.replaceState({}, "", url.toString());
        });
      } else {
        loadExistingReport(activeId);
      }
    }
  }, [loadExistingReport]);

  const handleAnalyze = async () => {
    if (!text) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: text, cv: cvText }),
      });
      const data = await res.json();

      // PERSISTENCE: Lock this ID into memory before they ever see a payment screen
      localStorage.setItem("active_report_id", data.id);
      window.history.pushState({}, "", `?report_id=${data.id}`);

      await loadExistingReport(data.id);
    } catch (err) {
      alert("Backend is waking up... give it 10 seconds and try again.");
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
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
      console.error("Upload failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        {/* INPUTS */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-4xl font-black tracking-tighter">
              jobmatch<span className="text-emerald-400">.</span>
            </span>
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
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold uppercase transition-all shadow-xl shadow-indigo-600/20"
          >
            {loading ? "AI is Analyzing..." : "Generate Analysis"}
          </button>
        </div>

        {/* RESULTS PANEL */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl min-h-[600px] relative">
          {!report ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-700 py-32 text-center space-y-4">
              <div className="w-12 h-12 border border-slate-800 rounded-full flex items-center justify-center text-xl">
                ?
              </div>
              <p className="italic text-sm">
                Your technical assessment will be saved to the cloud.
              </p>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="flex justify-between items-end border-b border-slate-800 pb-8">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
                    Match Score
                  </p>
                  <h2 className="text-7xl font-black text-emerald-400 leading-none">
                    {report.result?.score}%
                  </h2>
                </div>
                {report.is_paid && (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-3 py-1.5 rounded-lg font-black border border-emerald-500/20 uppercase tracking-widest">
                    Pro Report
                  </span>
                )}
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-slate-200 font-bold mb-4 text-xs uppercase tracking-widest">
                    Missing Tech Stack
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {report.result?.missing_skills?.map((s, i) => (
                      <span
                        key={i}
                        className="bg-slate-950 text-slate-300 border border-slate-800 px-4 py-1.5 rounded-xl text-xs font-medium uppercase tracking-tight"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-slate-200 font-bold mb-3 text-xs uppercase tracking-widest">
                    Recruiter Note
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed italic">
                    {!report.is_paid
                      ? report.result?.explanation?.substring(0, 80) + "..."
                      : report.result?.explanation}
                  </p>
                </div>

                {!report.is_paid ? (
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        // Even if they land on an empty ?unlocked=true URL, localStorage has their ID
                        const redirect = `https://jobmatch-fjik.vercel.app/?unlocked=true`;
                        window.location.href = `https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92?embed=1&redirect_url=${encodeURIComponent(redirect)}`;
                      }}
                      className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 transition"
                    >
                      Unlock Full Assessment — $3
                    </button>
                  </div>
                ) : (
                  <div className="pt-8 border-t border-slate-800 space-y-8 animate-in slide-in-from-top-4 duration-500">
                    <div>
                      <h3 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-4 italic">
                        Rejection Risks
                      </h3>
                      <ul className="text-sm text-slate-300 space-y-3">
                        {report.result?.rejection_reasons?.map((r, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-4 italic">
                        Priority Roadmap
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {report.result?.priority_skills?.map((ps, i) => (
                          <div
                            key={i}
                            className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm flex justify-between items-center group"
                          >
                            <span>{ps}</span>
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest group-hover:text-emerald-400 transition">
                              Action Item
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
