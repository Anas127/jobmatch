import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function App() {
  // 1. INITIALIZE STATE DIRECTLY FROM STORAGE
  const [text, setText] = useState(() => {
    const saved = localStorage.getItem("jobmatch_input");
    return saved ? JSON.parse(saved).text : "";
  });

  const [cvText, setCvText] = useState(() => {
    const saved = localStorage.getItem("jobmatch_input");
    return saved ? JSON.parse(saved).cvText : "";
  });

  const [result, setResult] = useState(() => {
    const saved = localStorage.getItem("jobmatch_result");
    return saved ? JSON.parse(saved) : null;
  });

  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 2. AUTOSAVE INPUTS WHENEVER THEY CHANGE
  useEffect(() => {
    localStorage.setItem("jobmatch_input", JSON.stringify({ text, cvText }));
  }, [text, cvText]);

  // 3. SECURE UNLOCK LOGIC
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unlockedParam = params.get("unlocked");

    // In a real app, you'd verify this 'unlockedParam' (which would be a hash) with your backend
    if (
      unlockedParam === "true" ||
      localStorage.getItem("jobmatch_unlocked") === "true"
    ) {
      setLocked(false);
      localStorage.setItem("jobmatch_unlocked", "true");

      if (unlockedParam) {
        const url = new URL(window.location.href);
        url.searchParams.delete("unlocked");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  const handleExtract = async () => {
    if (!text) return;
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: text, cv: cvText }),
      });

      const data = await res.json();

      if (data.skills?.includes("LIMIT REACHED")) {
        setErrorMessage("Free limit reached. Upgrade to continue.");
        setLoading(false);
        return;
      }

      // Save result and reset lock for new analysis (unless they already paid)
      localStorage.setItem("jobmatch_result", JSON.stringify(data));
      setResult(data);
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong.");
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!text) {
      setErrorMessage("Paste job description first");
      return;
    }

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
    } catch {
      setErrorMessage("CV upload failed");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white font-sans">
        {/* NAVBAR */}
        <div className="px-12 py-6 border-b border-slate-800 flex justify-between items-center">
          <span className="text-2xl font-bold">
            jobmatch<span className="text-emerald-400">.</span>
          </span>
          {locked === false && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
              PRO UNLOCKED
            </span>
          )}
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mt-10 px-6">
          {/* INPUT SECTION */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Target Job
            </h2>
            <textarea
              className="w-full h-48 p-4 bg-slate-950 rounded-lg border border-slate-800 focus:border-indigo-500 outline-none transition"
              placeholder="Paste job description here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Your Experience
            </h2>
            <textarea
              className="w-full h-32 p-4 bg-slate-950 rounded-lg border border-slate-800 focus:border-indigo-500 outline-none transition"
              placeholder="Paste CV text or upload file..."
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
            />

            <div className="flex flex-col gap-3">
              <input
                type="file"
                onChange={handleFileUpload}
                className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
              />
              <button
                onClick={handleExtract}
                disabled={loading || !text}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                {loading ? "Analyzing Skills..." : "Run Matching Analysis"}
              </button>
            </div>
          </div>

          {/* RESULTS SECTION */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-4 rounded-lg flex flex-col gap-3">
                <p className="font-medium">{errorMessage}</p>
                <button
                  onClick={() =>
                    window.open(
                      "https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92",
                      "_blank",
                    )
                  }
                  className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded text-white text-sm font-bold"
                >
                  Unlock Unlimited Reports — $3
                </button>
              </div>
            )}

            {!result && !errorMessage && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 py-20">
                <div className="w-12 h-12 border-2 border-slate-800 rounded-full flex items-center justify-center text-xl">
                  ↑
                </div>
                <p>Enter job details to see your match score</p>
              </div>
            )}

            {result && (
              <div className="animate-in fade-in duration-700">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <span className="text-slate-400 text-sm uppercase tracking-widest">
                      Match Score
                    </span>
                    <h1 className="text-6xl font-black text-emerald-400">
                      {result.score}%
                    </h1>
                  </div>
                  {result.score < 40 && (
                    <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-xs font-bold border border-red-500/30 mb-2">
                      HIGH REJECTION RISK
                    </span>
                  )}
                </div>

                <div
                  className={`space-y-4 transition-all duration-1000 ${locked ? "blur-md select-none" : ""}`}
                >
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <h3 className="text-indigo-400 font-bold mb-2">
                      Recruiter Analysis
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      {result.explanation}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-slate-400 font-bold mb-2">
                      Missing Critical Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills?.map((s, i) => (
                        <span
                          key={i}
                          className="bg-slate-800 px-3 py-1 rounded-md text-sm border border-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {locked && (
                  <div className="mt-8 p-6 bg-indigo-600/10 border border-indigo-500/30 rounded-xl text-center">
                    <h3 className="font-bold text-lg mb-2">
                      Want the full breakdown?
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Unlock missing skills, rejection reasons, and a
                      personalized learning path.
                    </p>
                    <button
                      onClick={() => {
                        window.location.href =
                          "https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92";
                      }}
                      className="bg-indigo-500 hover:bg-indigo-400 w-full py-4 rounded-lg font-bold transition shadow-xl shadow-indigo-500/40"
                    >
                      Unlock Full Report — $3
                    </button>
                  </div>
                )}
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
