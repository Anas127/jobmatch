import { useState } from "react";
import { motion } from "framer-motion";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔥 ANALYZE
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
    setLoading(false);
  };

  // 🔥 UPLOAD + AUTO ANALYZE
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
    setCvText(data.text);

    // AUTO ANALYZE
    const analyzeRes = await fetch(`${API_URL}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_description: text,
        cv: data.text,
      }),
    });

    const resultData = await analyzeRes.json();

    if (resultData.skills?.includes("LIMIT REACHED")) {
      alert("Free limit reached. Upgrade to continue.");
      setLoading(false);
      return;
    }

    setResult(resultData);
    setLoading(false);
  };

  const hasCV = cvText.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      
      {/* NAVBAR */}
      <div className="flex items-center justify-between px-12 py-6 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">J</span>
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight">
              JobMatch
            </span>
            <span className="text-xs text-gray-500">AI job analysis</span>
          </div>
        </div>

        <button
          onClick={() => window.open("YOUR_STRIPE_LINK", "_blank")}
          className="bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 rounded-lg text-sm font-semibold"
        >
          Upgrade — $3
        </button>
      </div>

      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mt-12 mb-10"
      >
        <h1 className="text-4xl font-bold mb-2">
          Stop guessing what skills you need
        </h1>
        <p className="text-gray-400">
          Paste a job → see skills, gaps, and your roadmap
        </p>
      </motion.div>

      {/* MAIN */}
      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8">

        {/* INPUT */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4"
        >
          <textarea
            className="w-full h-36 p-4 rounded-lg bg-slate-950 border border-slate-700"
            placeholder="Paste job description..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <textarea
            className="w-full h-24 p-4 rounded-lg bg-slate-950 border border-slate-700"
            placeholder="Paste your CV (optional)"
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
          />

          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            className="text-sm text-gray-400"
          />

          <button
            disabled={loading}
            onClick={handleExtract}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Analyzing job + CV..." : "Analyze Job Match"}
          </button>

          <div className="text-xs text-gray-500 pt-2 space-y-1">
            <p>✔ Supports PDF, DOCX</p>
            <p>✔ Instant analysis</p>
            <p>✔ No signup required</p>
          </div>
        </motion.div>

        {/* RESULTS */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6"
        >
          {!result && (
            <p className="text-gray-500 text-center">
              Results will appear here
            </p>
          )}

          {result && (
            <>
              {/* SCORE */}
              <div className="bg-slate-950 p-5 rounded-lg">
                <p className="text-sm text-gray-400">Match Score</p>

                {result.score === -1 ? (
                  <p className="text-gray-500 mt-2">
                    Upload a CV to unlock your match score
                  </p>
                ) : (
                  <p className="text-4xl font-bold text-indigo-400">
                    {result.score}%
                  </p>
                )}

                <p className="text-sm text-gray-400 mt-2">
                  {result.explanation}
                </p>

                <p className="text-xs text-yellow-400 mt-2">
                  {result.score >= 70
                    ? "Strong match"
                    : result.score >= 50
                    ? "You're close — fix a few gaps"
                    : "Not ready yet — key skills missing"}
                </p>
              </div>

              {/* PAYWALL */}
              <div className="bg-slate-950 p-5 rounded-lg text-center border border-slate-800">
                <p className="font-semibold mb-2">
                  🔒 Unlock Full Report — $3
                </p>

                <button
                  onClick={() => window.open("YOUR_STRIPE_LINK", "_blank")}
                  className="bg-green-500 px-5 py-2 rounded-lg"
                >
                  Get Full Report
                </button>
              </div>

              {/* ROADMAP */}
              {result.recommended_course?.title && (
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800">
                  <p className="font-semibold mb-2">🚀 Your Roadmap</p>

                  <p className="text-sm text-gray-400 mb-3">
                    Become a {result.job_category}
                  </p>

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

              <Section title="Core Skills" items={result.core_skills} />
              <Section title="All Skills" items={result.skills} />
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, items = [] }) {
  return (
    <div>
      <h3 className="mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="bg-slate-700 px-3 py-1 rounded text-sm">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default App;