import { useState, useEffect, useCallback } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadExistingReport = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/report/${id}`);
      const data = await res.json();
      if (data && !data.error) {
        setReport(data);
        setText((prev) => prev || data.job_text || "");
        setCvText((prev) => prev || data.cv_text || "");
      }
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("report_id");
    const isUnlocked = params.get("unlocked") === "true";

    // Safety net: check memory if URL is lost
    const savedId = localStorage.getItem("last_active_report");
    const activeId = urlId || savedId;

    if (activeId) {
      // If we are returning from a payment attempt
      if (isUnlocked) {
        fetch(`${API_URL}/unlock/${activeId}`, { method: "POST" }).then(() =>
          loadExistingReport(activeId),
        );

        const url = new URL(window.location.href);
        url.searchParams.delete("unlocked");
        window.history.replaceState({}, "", url.toString());
      } else {
        loadExistingReport(activeId);
      }
    }
  }, [loadExistingReport]);

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
      setErrorMessage("Upload failed.");
    }
    setLoading(false);
  };

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
      localStorage.setItem("last_active_report", data.id);
      window.history.pushState({}, "", `?report_id=${data.id}`);
      await loadExistingReport(data.id);
    } catch (err) {
      setErrorMessage("Backend is sleeping. Try again.");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-8">
              <span className="text-4xl font-black tracking-tighter">
                jobmatch<span className="text-emerald-400">.</span>
              </span>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  1. Job Details
                </span>
                <textarea
                  className="w-full h-64 bg-slate-900 border border-slate-800 p-4 rounded-2xl mt-2 focus:border-indigo-500 outline-none transition"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  2. Experience
                </span>
                <textarea
                  className="w-full h-32 bg-slate-900 border border-slate-800 p-4 rounded-2xl mt-2 focus:border-indigo-500 outline-none transition"
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                />
              </label>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Upload PDF
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 w-40 file:bg-slate-800 file:text-white file:border-0 file:rounded file:px-2 file:py-1"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !text}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20"
            >
              {loading ? "Analyzing..." : "Generate Analysis"}
            </button>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl min-h-[600px]">
            {!report ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 py-32 text-center">
                <div className="w-12 h-12 border border-slate-800 rounded-full flex items-center justify-center mb-4">
                  ?
                </div>
                <p className="text-sm italic">Cloud assessment ready.</p>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="flex justify-between items-end pb-8 border-b border-slate-800">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
                      Match Score
                    </p>
                    <h2 className="text-7xl font-black text-emerald-400 leading-none tracking-tighter">
                      {report.result?.score}%
                    </h2>
                  </div>
                  {report.is_paid && (
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase border border-emerald-500/20">
                      Pro
                    </span>
                  )}
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-slate-200 font-bold mb-4 text-xs uppercase tracking-widest">
                      Missing Tech
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {report.result?.missing_skills?.map((s, i) => (
                        <span
                          key={i}
                          className="bg-slate-950 text-slate-300 border border-slate-800 px-4 py-1.5 rounded-xl text-xs"
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
                    <p className="text-slate-400 text-sm italic">
                      {!report.is_paid
                        ? report.result?.explanation?.substring(0, 80) + "..."
                        : report.result?.explanation}
                    </p>
                  </div>

                  {!report.is_paid && (
                    <div className="pt-10">
                      <button
                        onClick={() => {
                          const redirect = `https://jobmatch-fjik.vercel.app/?report_id=${report.id}&unlocked=true`;
                          window.location.href = `https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92?embed=1&redirect_url=${encodeURIComponent(redirect)}`;
                        }}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg"
                      >
                        Unlock for $3
                      </button>
                    </div>
                  )}

                  {report.is_paid && (
                    <div className="pt-8 border-t border-slate-800 space-y-8">
                      <div>
                        <h3 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-4">
                          Rejection Risks
                        </h3>
                        <ul className="space-y-3 text-sm text-slate-300">
                          {report.result?.rejection_reasons?.map((r, i) => (
                            <li key={i}>• {r}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-4">
                          Roadmap
                        </h3>
                        {report.result?.priority_skills?.map((ps, i) => (
                          <div
                            key={i}
                            className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm mb-2"
                          >
                            {ps}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Analytics />
    </>
  );
}

export default App;
