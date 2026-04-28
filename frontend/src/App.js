import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";

const API_URL = "https://jobmatch-7zo9.onrender.com";

function App() {
  const [text, setText] = useState("");
  const [cvText, setCvText] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. On Load: Check if we are returning from payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("report_id");
    const justPaid = params.get("unlocked") === "true";

    if (reportId) {
      if (justPaid) {
        // Tell backend to mark this ID as paid
        fetch(`${API_URL}/unlock/${reportId}`, { method: "POST" }).then(() =>
          fetchReport(reportId),
        );
      } else {
        fetchReport(reportId);
      }
    }
  }, []);

  const fetchReport = async (id) => {
    const res = await fetch(`${API_URL}/report/${id}`);
    const data = await res.json();
    setReport(data);
    setText(data.job_text);
    setCvText(data.cv_text);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: text, cv: cvText }),
      });
      const data = await res.json();
      // Update URL with the new report ID without refreshing
      window.history.pushState({}, "", `?report_id=${data.id}`);
      fetchReport(data.id);
    } catch (err) {
      alert("Error saving report");
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/upload-cv`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setCvText(data.text);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        {/* INPUT */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold italic">jobmatch.</h1>
          <textarea
            className="w-full h-64 bg-slate-900 border border-slate-800 p-4 rounded-xl"
            placeholder="Paste Job Description..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <textarea
            className="w-full h-32 bg-slate-900 border border-slate-800 p-4 rounded-xl"
            placeholder="Paste CV..."
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
          />
          <input
            type="file"
            onChange={handleFileUpload}
            className="block text-sm text-slate-500"
          />
          <button
            onClick={handleAnalyze}
            className="w-full py-4 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition"
          >
            {loading ? "Analyzing..." : "Analyze Match"}
          </button>
        </div>

        {/* OUTPUT */}
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
          {!report ? (
            <p className="text-slate-500 text-center py-20">
              Analysis will appear here
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-6xl font-black text-emerald-400">
                  {report.result.score}%
                </h2>
                {report.is_paid && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                    PAID
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-400 uppercase text-xs">
                  Missing Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.result.missing_skills.map((s, i) => (
                    <span
                      key={i}
                      className="bg-slate-800 px-3 py-1 rounded text-sm border border-slate-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <h3 className="font-bold text-slate-400 uppercase text-xs">
                  Recruiter Feedback
                </h3>
                <p className="text-slate-300">
                  {!report.is_paid
                    ? report.result.explanation.substring(0, 50) + "..."
                    : report.result.explanation}
                </p>

                {!report.is_paid && (
                  <button
                    onClick={() => {
                      const checkoutUrl = `https://jobskills.lemonsqueezy.com/checkout/buy/5fe468f4-a8c6-4222-bbd4-ad1492248a92?checkout[custom][report_id]=${report.id}&redirect_url=https://jobmatch-fjik.vercel.app/?report_id=${report.id}%26unlocked=true`;
                      window.location.href = checkoutUrl;
                    }}
                    className="w-full py-4 bg-emerald-500 rounded-xl font-bold"
                  >
                    Unlock Full Report — $3
                  </button>
                )}

                {report.is_paid && (
                  <div className="pt-6 border-t border-slate-800 space-y-4">
                    <h3 className="font-bold text-red-400 uppercase text-xs">
                      Rejection Risks
                    </h3>
                    <ul className="list-disc list-inside text-sm text-slate-300">
                      {report.result.rejection_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
