import { useState, useEffect, useCallback } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadExistingReport = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/report/${id}`);
      const data = await res.json();
      if (data && !data.error) {
        setReport(data);
        setText(data.job_text || "");
        setCvText(data.cv_text || "");
      }
    } catch (err) {
      console.error("Database fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("report_id");
    const isUnlocked = params.get("unlocked") === "true";

    // SAFETY NET: Get the last report ID from memory if the URL is empty
    const savedId = localStorage.getItem("last_active_report");
    const activeId = urlId || savedId;

    if (activeId) {
      if (isUnlocked) {
        // If they just paid, tell backend to unlock
        fetch(`${API_URL}/unlock/${activeId}`, { method: "POST" }).then(() =>
          loadExistingReport(activeId),
        );

        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete("unlocked");
        window.history.replaceState({}, "", url.toString());
      } else {
        // Just load it (it will show as paid if the DB says so)
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

      // Save to both URL and Memory
      localStorage.setItem("last_active_report", data.id);
      window.history.pushState({}, "", `?report_id=${data.id}`);

      await loadExistingReport(data.id);
    } catch (err) {
      alert("AI Analysis failed. Check if server is awake.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        {/* INPUTS */}
        <div className="space-y-6">
          <h1 className="text-4xl font-black">
            jobmatch<span className="text-emerald-400">.</span>
          </h1>
          <textarea
            className="w-full h-64 bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none focus:border-indigo-500"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste Job Description..."
          />
          <textarea
            className="w-full h-32 bg-slate-900 border border-slate-800 p-4 rounded-2xl outline-none focus:border-indigo-500"
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Paste CV Text..."
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold uppercase tracking-widest transition"
          >
            {loading ? "AI is working..." : "Run Analysis"}
          </button>
        </div>

        {/* RESULTS */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl min-h-[500px]">
          {!report ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-700 py-20 text-center">
              <p className="text-lg italic">Your skills, analyzed by AI.</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="flex justify-between items-end border-b border-slate-800 pb-6">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                    Score
                  </p>
                  <h2 className="text-7xl font-black text-emerald-400">
                    {report.result?.score}%
                  </h2>
                </div>
                {report.is_paid && (
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20 font-bold">
                    PRO UNLOCKED
                  </span>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-slate-400 font-bold text-xs uppercase mb-2 tracking-widest">
                    Feedback
                  </h3>
                  <p className="text-slate-300 italic leading-relaxed">
                    {!report.is_paid
                      ? report.result?.explanation?.substring(0, 70) + "..."
                      : report.result?.explanation}
                  </p>
                </div>

                {!report.is_paid ? (
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        const redirect = `https://jobmatch-fjik.vercel.app/?report_id=${report.id}&unlocked=true`;
                        window.location.href = `https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92?embed=1&redirect_url=${encodeURIComponent(redirect)}`;
                      }}
                      className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 transition"
                    >
                      Reveal Full Report — $3
                    </button>
                    <p className="text-[10px] text-slate-600 text-center mt-3 uppercase tracking-tighter">
                      Secure Payment via Lemon Squeezy
                    </p>
                  </div>
                ) : (
                  <div className="pt-4 space-y-8 animate-in slide-in-from-top-4 duration-500">
                    <div>
                      <h3 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-4">
                        Rejection Risks
                      </h3>
                      <ul className="text-sm text-slate-400 space-y-3">
                        {report.result?.rejection_reasons?.map((r, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-4">
                        Priority Roadmap
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {report.result?.priority_skills?.map((ps, i) => (
                          <div
                            key={i}
                            className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm flex justify-between items-center"
                          >
                            {ps}{" "}
                            <span className="text-[10px] text-slate-600 font-bold">
                              URGENT
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
