import { useState, useEffect, useCallback } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Memoized fetch function to prevent unnecessary re-renders or build warnings
  const loadExistingReport = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_URL}/report/${id}`);
      const data = await res.json();
      if (data && !data.error) {
        setReport(data);
        // Persist the inputs so they don't look empty after redirect
        setText((prev) => prev || data.job_text || "");
        setCvText((prev) => prev || data.cv_text || "");
      }
    } catch (err) {
      console.error("Fetch report failed:", err);
    }
  }, []);

  // Handle URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("report_id");
    const isUnlockedRedirect = params.get("unlocked") === "true";

    if (reportId) {
      if (isUnlockedRedirect) {
        // Trigger the unlock endpoint first, then load the data
        fetch(`${API_URL}/unlock/${reportId}`, { method: "POST" })
          .then(() => loadExistingReport(reportId))
          .catch((err) => console.error("Unlock error:", err));

        // Clean the URL for a professional look
        const url = new URL(window.location.href);
        url.searchParams.delete("unlocked");
        window.history.replaceState({}, "", url.toString());
      } else {
        loadExistingReport(reportId);
      }
    }
  }, [loadExistingReport]);

  const handleAnalyze = async () => {
    if (!text) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`${API_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: text, cv: cvText }),
      });

      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      // Update URL with the unique Supabase ID
      window.history.pushState({}, "", `?report_id=${data.id}`);

      // Immediately fetch the fresh record
      await loadExistingReport(data.id);
    } catch (err) {
      setErrorMessage("Analysis failed. Please check your connection.");
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
      setErrorMessage("File upload failed.");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          {/* LEFT: INPUTS */}
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
                  placeholder="Paste the job description..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  2. Your Experience
                </span>
                <textarea
                  className="w-full h-32 bg-slate-900 border border-slate-800 p-4 rounded-2xl mt-2 focus:border-indigo-500 outline-none transition"
                  placeholder="Paste CV text..."
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                />
              </label>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Or upload PDF
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 w-40 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !text}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20"
            >
              {loading ? "AI is Analyzing..." : "Generate Analysis"}
            </button>
            {errorMessage && (
              <p className="text-red-400 text-center text-xs mt-2">
                {errorMessage}
              </p>
            )}
          </div>

          {/* RIGHT: RESULTS */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl min-h-[600px]">
            {!report ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 py-32 text-center space-y-4">
                <div className="w-12 h-12 border border-slate-800 rounded-full flex items-center justify-center">
                  ?
                </div>
                <p className="text-sm italic">
                  Ready to match your skills with the market.
                </p>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in duration-700">
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
                      Pro Report
                    </span>
                  )}
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-slate-200 font-bold mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
                      Missing Critical Tech
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
                    <div className="relative">
                      <p className="text-slate-400 text-sm leading-relaxed italic">
                        {!report.is_paid
                          ? report.result?.explanation?.substring(0, 80) + "..."
                          : report.result?.explanation}
                      </p>
                      {!report.is_paid && (
                        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-slate-900 to-transparent"></div>
                      )}
                    </div>
                  </div>

                  {!report.is_paid ? (
                    <div className="bg-indigo-600/5 border border-indigo-500/20 p-8 rounded-3xl text-center space-y-6 mt-10">
                      <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-widest font-bold">
                        Unlock PRO Report
                      </p>
                      <button
                        onClick={() => {
                          const checkoutBase =
                            "https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92";

                          // This is the "Magic Link" that brings the ID back to you
                          const dynamicRedirect = `https://jobmatch-fjik.vercel.app/?report_id=${report.id}&unlocked=true`;

                          // We wrap it in encodeURIComponent so characters like '?' don't get lost
                          const finalUrl = `${checkoutBase}?embed=1&redirect_url=${encodeURIComponent(dynamicRedirect)}`;

                          window.location.href = finalUrl;
                        }}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition shadow-xl shadow-emerald-500/30 text-lg"
                      >
                        Unlock for $3
                      </button>
                    </div>
                  ) : (
                    <div className="pt-8 border-t border-slate-800 space-y-8 animate-in zoom-in-95 duration-500">
                      <div>
                        <h3 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-4 italic">
                          Rejection Risks
                        </h3>
                        <ul className="space-y-3">
                          {report.result?.rejection_reasons?.map((r, i) => (
                            <li
                              key={i}
                              className="text-sm text-slate-300 flex items-start gap-3"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
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
                              className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm text-slate-200 flex justify-between items-center group"
                            >
                              <span>{ps}</span>
                              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest group-hover:text-emerald-400 transition">
                                Urgent
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
      </div>
      <Analytics />
    </>
  );
}

export default App;
