import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

// ✅ Read unlock state SYNCHRONOUSLY before any render
// This prevents the race condition where useEffect fires too late
const isUnlockedFromURL =
  new URLSearchParams(window.location.search).get("unlocked") === "true";

const [errorMessage, setErrorMessage] = useState("");

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Initialize result from localStorage immediately (not in useEffect)
  // Prevents blank screen after payment redirect
  const [result, setResult] = useState(() => {
    try {
      const saved = localStorage.getItem("jobmatch_result");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // ✅ Initialize locked state synchronously from URL
  // If ?unlocked=true is in URL, user is unlocked immediately — no flash, no race
  const [locked, setLocked] = useState(() => {
    if (isUnlockedFromURL) return false;
    try {
      const unlockTime = localStorage.getItem("jobmatch_unlocked");
      return !unlockTime;
    } catch {
      return true;
    }
  });

  // ✅ Persist unlock to localStorage so it survives future visits
  useEffect(() => {
    if (isUnlockedFromURL) {
      localStorage.setItem("jobmatch_unlocked", Date.now());
      setLocked(false);

      // Clean up URL without triggering re-render
      const url = new URL(window.location.href);
      url.searchParams.delete("unlocked");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleExtract = async () => {
    if (!text) return;
    setLoading(true);

    localStorage.removeItem("jobmatch_unlocked");
    setLocked(true);

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

      // ✅ Persist result to localStorage immediately after fetch
      localStorage.setItem("jobmatch_result", JSON.stringify(data));
      setResult(data);

      // Only lock if user hasn't paid
      if (!localStorage.getItem("jobmatch_unlocked")) {
        setLocked(true);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      alert("Something went wrong. Try again.");
    }

    setLoading(false);
  };

  // ✅ CV upload: fills textarea only, no auto-analysis
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!text) {
      alert("Paste a job description first");
      e.target.value = "";
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
      alert("CV upload failed. Try again.");
    }

    setLoading(false);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        {/* NAVBAR */}
        <div className="flex items-center px-12 py-6 border-b border-slate-800 bg-slate-950">
          <span className="text-2xl font-bold tracking-tight">
            jobmatch<span className="text-emerald-400">.</span>
          </span>
        </div>

        {/* MAIN */}
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8 mt-10">
          {/* INPUT */}
          <div className="bg-slate-900 p-6 rounded-xl space-y-4">
            <textarea
              className="w-full h-36 p-4 bg-slate-950 rounded-lg resize-none"
              placeholder="Paste job description..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <textarea
              className="w-full h-24 p-4 bg-slate-950 rounded-lg resize-none"
              placeholder="Paste CV (optional)"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
            />

            <label className="block text-sm text-slate-400">
              Upload CV (PDF / DOCX)
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                className="mt-1 block w-full text-sm text-slate-400"
              />
            </label>

            <button
              onClick={handleExtract}
              disabled={loading || !text}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {loading ? "Analyzing..." : "Analyze Job Match"}
            </button>
          </div>

          {/* RESULTS */}
          <div className="bg-slate-900 p-6 rounded-xl space-y-6">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-4 rounded-lg text-sm space-y-2">
                <p>{errorMessage}</p>

                <button
                  onClick={() =>
                    window.open(
                      "https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92",
                      "_blank",
                    )
                  }
                  className="bg-emerald-500 px-4 py-2 rounded text-white text-sm"
                >
                  Unlock — $3
                </button>
              </div>
            )}
            {!result && (
              <p className="text-slate-400">Paste a job description to start</p>
            )}

            {result && (
              <>
                {/* SCORE */}

                <div>
                  <p className="text-sm text-slate-400">Match Score</p>
                  <h1 className="text-3xl font-bold">
                    {result.score === -1 ? "N/A" : `${result.score}%`}
                  </h1>

                  <p className="text-xs text-red-400 mt-1">
                    {result.score < 40 &&
                      "Very low match — high chance of rejection"}
                    {result.score >= 40 &&
                      result.score < 70 &&
                      "Moderate match — risky"}
                    {result.score >= 70 && "Strong match"}
                  </p>
                </div>

                {/* LEVEL */}
                {result.level && (
                  <div>
                    <p className="text-sm text-slate-400">Level</p>
                    <p className="font-medium">{result.level}</p>
                  </div>
                )}

                {/* MISSING SKILLS */}
                {result.missing_skills?.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-400 mb-2">
                      Missing Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((s, i) => (
                        <span
                          key={i}
                          className="bg-red-500/20 text-red-300 px-2 py-1 text-sm rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* CORE SKILLS */}
                {result.core_skills?.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-400 mb-2">
                      Your Matching Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.core_skills.map((s, i) => (
                        <span
                          key={i}
                          className="bg-green-500/20 text-green-300 px-2 py-1 text-sm rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* EXPLANATION — blurred for free users */}
                <div
                  className={
                    locked ? "blur-sm select-none pointer-events-none" : ""
                  }
                >
                  <p className="text-sm text-slate-300">{result.explanation}</p>
                </div>

                {/* ROADMAP — paid only */}
                {!locked && result.recommended_course?.title && (
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Your Roadmap</p>
                    <a
                      href={result.recommended_course.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-medium inline-block transition-colors"
                    >
                      {result.recommended_course.title} →
                    </a>
                  </div>
                )}

                {locked && (
                  <p className="text-sm text-red-400">
                    You’re missing key requirements recruiters expect.
                  </p>
                )}

                {/* PAYWALL */}
                {locked && (
                  <div className="text-center space-y-3 mt-6 border border-slate-700 rounded-xl p-5">
                    <p className="text-yellow-400 font-semibold">
                      You would get rejected for this role — here’s exactly why
                      👇
                    </p>

                    <button
                      onClick={() =>
                        window.open(
                          "https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92",
                          "_blank",
                        )
                      }
                      className="w-full bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-lg text-white font-bold transition-colors"
                    >
                      Unlock Full Report — $3
                    </button>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      ✔ Why recruiters would reject you
                      <br />
                      ✔ The exact skills you're missing
                      <br />✔ What to learn first to fix it
                    </p>

                    <p className="text-xs text-slate-500">
                      Most candidates never fix these gaps
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Analytics />
    </>
  );
}

export default App;
