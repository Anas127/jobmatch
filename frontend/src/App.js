import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const isUnlocked = urlParams.get("unlocked") === "true";

  const [locked, setLocked] = useState(!isUnlocked);

  // 🔥 ANALYZE (MANUAL ONLY)
  const handleExtract = async () => {
    if (!text) return;

    setLoading(true);

    const res = await fetch(`${API_URL}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_description: text,
        cv: cvText,
      }),
    });

    const data = await res.json();

    if (data.skills?.includes("LIMIT REACHED")) {
      alert("Free limit reached. Upgrade to continue.");
      setLoading(false);
      return;
    }

    setResult(data);

    if (!isUnlocked) {
      setLocked(true);
    }

    setLoading(false);
  };

  // 🔥 UPLOAD CV (NO AUTO ANALYSIS)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];

    if (!text) {
      alert("Paste a job description first");
      return;
    }

    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/upload-cv`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    setCvText(data.text); // ✅ only fill textarea
    setLoading(false);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        
        {/* NAVBAR */}
        <div className="flex items-center px-12 py-6 border-b border-slate-800 bg-slate-950">
          <span className="text-lg font-semibold">JobMatch</span>
        </div>

        {/* MAIN */}
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8 mt-10">

          {/* INPUT */}
          <div className="bg-slate-900 p-6 rounded-xl space-y-4">
            <textarea
              className="w-full h-36 p-4 bg-slate-950"
              placeholder="Paste job description..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <textarea
              className="w-full h-24 p-4 bg-slate-950"
              placeholder="Paste CV (optional)"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
            />

            <input type="file" onChange={handleFileUpload} />

            <button
              onClick={handleExtract}
              className="w-full py-3 bg-indigo-500 rounded-lg"
            >
              {loading ? "Analyzing..." : "Analyze Job Match"}
            </button>
          </div>

          {/* RESULTS */}
          <div className="bg-slate-900 p-6 rounded-xl space-y-6">

            {!result && <p>Paste a job description to start</p>}

            {result && (
              <>
                {/* SCORE */}
                <div>
                  <p className="text-sm text-slate-400">Match Score</p>
                  <h1 className="text-3xl font-bold">{result.score}%</h1>
                </div>

                {/* MISSING SKILLS */}
                <div>
                  <p className="text-sm text-slate-400 mb-2">Missing Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_skills.map((s, i) => (
                      <span key={i} className="bg-red-500/20 px-2 py-1 text-sm rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 🔒 EXPLANATION */}
                <div className={locked ? "blur-sm select-none" : ""}>
                  <p className="text-sm text-slate-300">{result.explanation}</p>
                </div>

                {/* 🔒 ROADMAP (ONLY IF PAID) */}
                {!locked && result.recommended_course?.title && (
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Your Roadmap</p>
                    <a
                      href={result.recommended_course.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium inline-block"
                    >
                      {result.recommended_course.title}
                    </a>
                  </div>
                )}

                {/* 🔥 PAYWALL */}
                {locked && (
                  <div className="text-center space-y-3 mt-6">

                    <p className="text-yellow-400 text-sm">
                      You’re not getting this job — here’s why 👇
                    </p>

                    <button
                      onClick={() =>
                        window.open(
                          "https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92",
                          "_blank"
                        )
                      }
                      className="bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-lg text-white font-semibold"
                    >
                      Unlock Full Report — $3
                    </button>

                    <p className="text-xs text-slate-400">
                      ✔ Exact rejection reasons <br />
                      ✔ Priority skills to fix your gaps <br />
                      ✔ Step-by-step roadmap
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