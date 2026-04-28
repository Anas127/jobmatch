import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

const isUnlockedFromURL =
  new URLSearchParams(window.location.search).get("unlocked") === "true";

function App() {
  // 🔥 INPUT STATE (RESTORED FROM STORAGE)
  const [text, setText] = useState(() => {
    const saved = localStorage.getItem("jobmatch_input");
    return saved ? JSON.parse(saved).text : "";
  });

  const [cvText, setCvText] = useState(() => {
    const saved = localStorage.getItem("jobmatch_input");
    return saved ? JSON.parse(saved).cvText : "";
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 🔥 RESULT RESTORE
  const [result, setResult] = useState(() => {
    try {
      const saved = localStorage.getItem("jobmatch_result");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 🔥 LOCK STATE (STABLE)
  const [locked, setLocked] = useState(() => {
    if (isUnlockedFromURL) return false;
    return !localStorage.getItem("jobmatch_unlocked");
  });

  // 🔥 HANDLE UNLOCK
  useEffect(() => {
    if (isUnlockedFromURL) {
      localStorage.setItem("jobmatch_unlocked", "true");
      setLocked(false);

      const url = new URL(window.location.href);
      url.searchParams.delete("unlocked");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // 🔥 AUTO CLEAR ERROR
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleExtract = async () => {
    if (!text) return;

    setLoading(true);

    // 🔥 RESET PAY STATE FOR NEW ANALYSIS
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

      // 🔥 SAVE EVERYTHING (CRITICAL FIX)
      localStorage.setItem("jobmatch_input", JSON.stringify({ text, cvText }));

      localStorage.setItem("jobmatch_result", JSON.stringify(data));

      setResult(data);
      setErrorMessage("");
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
      <div className="min-h-screen bg-slate-950 text-white">
        {/* NAVBAR */}
        <div className="px-12 py-6 border-b border-slate-800">
          <span className="text-2xl font-bold">
            jobmatch<span className="text-emerald-400">.</span>
          </span>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mt-10 px-6">
          {/* INPUT */}
          <div className="bg-slate-900 p-6 rounded-xl space-y-4">
            <textarea
              className="w-full h-36 p-4 bg-slate-950 rounded-lg"
              placeholder="Paste job description..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <textarea
              className="w-full h-24 p-4 bg-slate-950 rounded-lg"
              placeholder="Paste CV (optional)"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
            />

            <input type="file" onChange={handleFileUpload} />

            <button
              onClick={handleExtract}
              disabled={loading || !text}
              className="w-full py-3 bg-indigo-500 rounded-lg"
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          {/* RESULTS */}
          <div className="bg-slate-900 p-6 rounded-xl space-y-6">
            {errorMessage && (
              <div className="bg-red-500/10 p-3 rounded">{errorMessage}</div>
            )}

            {!result && (
              <p className="text-slate-400">Paste a job description to start</p>
            )}

            {result && (
              <>
                <h1 className="text-3xl">{result.score}%</h1>

                <p className="text-red-400 text-sm">
                  {result.score < 40 && "High rejection risk"}
                </p>

                <div className={locked ? "blur-sm" : ""}>
                  {result.explanation}
                </div>

                {locked && (
                  <button
                    onClick={() => {
                      localStorage.setItem(
                        "jobmatch_result",
                        JSON.stringify(result),
                      );

                      window.location.href =
                        "https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92";
                    }}
                    className="bg-green-500 w-full py-3 rounded"
                  >
                    Unlock — $3
                  </button>
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
