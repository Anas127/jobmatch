import { useState, useEffect, useCallback } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [scanCount, setScanCount] = useState(
    parseInt(localStorage.getItem("scan_count") || "0"),
  );

  // SAVE progress as user types
  useEffect(() => {
    localStorage.setItem("temp_job_text", text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem("temp_cv_text", cvText);
  }, [cvText]);

  // LOAD progress when the app starts
  useEffect(() => {
    const savedJob = localStorage.getItem("temp_job_text");
    const savedCV = localStorage.getItem("temp_cv_text");

    // Only load if the textareas are currently empty
    if (savedJob && !text) setText(savedJob);
    if (savedCV && !cvText) setCvText(savedCV);
  }, []);

  const [statusMsg, setStatusMsg] = useState("");

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
      console.error("Database sync failed");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isUnlocked = params.get("unlocked") === "true";
    const urlId = params.get("report_id");
    const savedId = localStorage.getItem("active_report_id");
    const activeId = urlId || savedId;

    if (activeId) {
      if (isUnlocked) {
        fetch(`${API_URL}/unlock/${activeId}`, { method: "POST" }).then(() => {
          loadExistingReport(activeId);
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
    if (scanCount >= 2 && (!report || !report.is_paid)) {
      setErrorMessage("Free limit reached. Unlock PRO to continue updating.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setStatusMsg("Initializing Architect Brain..."); // Set initial message

    const statuses = [
      "Scrutinizing job requirements...",
      "Comparing technical stack depth...",
      "Simulating recruiter rejection triggers...",
      "Drafting interview countermeasures...",
      "Finalizing Technical Audit...",
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

      const newCount = scanCount + 1;
      setScanCount(newCount);
      localStorage.setItem("scan_count", newCount.toString());

      localStorage.setItem("active_report_id", data.id);
      window.history.pushState({}, "", `?report_id=${data.id}`);

      await loadExistingReport(data.id);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (err) {
      setErrorMessage("Server is busy. Try again in 10s.");
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

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-medium animate-pulse">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
          >
            {loading ? (
              <div className="flex flex-col items-center">
                <span className="animate-pulse">{statusMsg}</span>
                <span className="text-[10px] font-light mt-1 opacity-50 text-white">
                  This takes ~15s of heavy AI processing
                </span>
              </div>
            ) : (
              "Generate Technical Audit"
            )}
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
                Professional Technical Audit will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-700">
              {/* MATCH SCORE GAUGE */}
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
                {report.is_paid && (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-3 py-1.5 rounded-lg font-black border border-emerald-500/20 uppercase tracking-widest">
                    PRO UNLOCKED
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
                  <div className="space-y-6">
                    {/* CURIOSITY GAP PREVIEWS (Keep these as they are) */}
                    <div className="space-y-4 opacity-50 pointer-events-none grayscale">
                      <div className="h-20 bg-slate-800 rounded-2xl border border-slate-700 border-dashed flex items-center justify-center font-bold text-xs text-slate-500 uppercase tracking-widest">
                        CV Rewrite & Keywords Locked 🔒
                      </div>
                      <div className="h-20 bg-slate-800 rounded-2xl border border-slate-700 border-dashed flex items-center justify-center font-bold text-xs text-slate-500 uppercase tracking-widest">
                        Interview Strategy Locked 🔒
                      </div>
                    </div>

                    {/* THE NEW PAYPAL CONTAINER */}
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                      <p className="text-[10px] text-center text-slate-500 uppercase font-bold mb-4 tracking-widest">
                        Secure Instant Unlock
                      </p>
                      <div id="paypal-button-container"></div>
                    </div>

                    {/* THIS EFFECT INJECTS THE BUTTON ONCE THE COMPONENT LOADS */}
                    {useEffect(() => {
                      if (window.paypal && report && !report.is_paid) {
                        // Clear any previous buttons to prevent duplicates
                        const container = document.getElementById(
                          "paypal-button-container",
                        );
                        if (container) container.innerHTML = "";

                        window.paypal
                          .Buttons({
                            style: {
                              layout: "vertical",
                              color: "gold",
                              shape: "rect",
                              label: "pay",
                            },
                            createOrder: (data, actions) => {
                              return actions.order.create({
                                purchase_units: [
                                  {
                                    amount: { value: "3.00" },
                                    description: `Pro Audit for Report: ${report.id}`,
                                  },
                                ],
                              });
                            },
                            onApprove: async (data, actions) => {
                              await actions.order.capture();
                              // Call your backend to flip 'is_paid' to TRUE
                              await fetch(`${API_URL}/unlock/${report.id}`, {
                                method: "POST",
                              });
                              // Refresh the UI
                              await loadExistingReport(report.id);
                            },
                            onError: (err) => {
                              setErrorMessage(
                                "Payment process failed. Please try again.",
                              );
                            },
                          })
                          .render("#paypal-button-container");
                      }
                    }, [report, loadExistingReport])}
                  </div>
                ) : (
                  <div className="pt-8 border-t border-slate-800 space-y-10 animate-in slide-in-from-top-4 duration-500">
                    {/* CV ENHANCEMENT */}
                    <div className="space-y-4">
                      <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-widest italic">
                        CV Enhancement
                      </h3>
                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl">
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-tighter">
                          High-Impact Rewrite:
                        </p>
                        <p className="text-sm text-slate-200 italic leading-relaxed">
                          "{report.result?.cv_enhancement?.rewrite_bullet}"
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {report.result?.cv_enhancement?.hidden_keywords?.map(
                          (kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-1 rounded-md border border-emerald-400/20 font-bold"
                            >
                              +{kw}
                            </span>
                          ),
                        )}
                      </div>
                    </div>

                    {/* INTERVIEW PREP */}
                    <div className="space-y-4">
                      <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-widest italic">
                        Interview Cheat Sheet
                      </h3>
                      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                        <p className="text-[10px] text-indigo-400 font-black uppercase mb-1 tracking-tighter">
                          The "Killer" Question:
                        </p>
                        <p className="text-sm text-slate-200 font-medium">
                          "{report.result?.interview_prep?.killer_question}"
                        </p>
                      </div>
                      <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/20">
                        <p className="text-[10px] text-indigo-400 font-black uppercase mb-1 tracking-tighter">
                          Winning Strategy:
                        </p>
                        <p className="text-sm text-slate-300 italic leading-relaxed italic">
                          "{report.result?.interview_prep?.winning_answer}"
                        </p>
                      </div>
                    </div>

                    {/* REJECTION RISKS */}
                    <div className="space-y-4">
                      <h3 className="text-red-400 font-bold text-xs uppercase tracking-widest italic">
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
