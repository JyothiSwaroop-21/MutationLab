
import { useState } from "react";
import {
  Activity, Bug, CheckCircle2, Code2, FlaskConical,
  Play, ShieldCheck, Sparkles, Terminal, XCircle,
  GraduationCap, Lightbulb
} from "lucide-react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

type LearningResult = {
  success: boolean;
  status?: string;
  message?: string;
  error?: {
    type: string;
    message: string;
    line?: number | null;
    column?: number | null;
  };
  execution?: {
    status: string;
    output: string;
    error: string;
  };
  explanation?: string;
};

type Mutant = {
  id: string;
  original_operator: string;
  mutated_operator: string;
  status: string;
};

type ApiResult = {
  experiment?: {
    summary?: {
      total_mutants?: number;
      killed?: number;
      survived?: number;
      mutation_score?: number;
    };
    results?: Mutant[];
  };
  investigation?: {
    ai_used?: boolean;
    investigations?: {
      mutant_id?: string;
      reason?: string;
      suggestion?: string;
    }[];
  };
  generated_test_verification?: {
    total?: number;
    verified?: number;
    success?: boolean;
  };
};

const DEFAULT_LEARNING_CODE = `numbers = [10, 20, 30]

print(numbers[3])`;

const DEFAULT_SOURCE = `def calculate_discount(price, discount):
    return price - (price * discount / 100)`;

const DEFAULT_TESTS = `from subject import calculate_discount

def test_discount():
    result = calculate_discount(100, 10)
    assert result > 0`;

function App() {
  const [activeTab, setActiveTab] = useState("learning");

  const [learningCode, setLearningCode] = useState(DEFAULT_LEARNING_CODE);
  const [mode, setMode] = useState("guided");
  const [learningResult, setLearningResult] = useState<LearningResult | null>(null);
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningError, setLearningError] = useState("");

  const [sourceCode, setSourceCode] = useState(DEFAULT_SOURCE);
  const [testCode, setTestCode] = useState(DEFAULT_TESTS);
  const [mutationResult, setMutationResult] = useState<ApiResult | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState("");

  async function runLearning() {
    setLearningLoading(true);
    setLearningError("");
    setLearningResult(null);

    try {
      const response = await fetch(`${API}/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: learningCode,
          mode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not analyze your code.");
      }

      setLearningResult(data);
    } catch (error) {
      setLearningError(
        error instanceof Error ? error.message : "Backend connection failed."
      );
    } finally {
      setLearningLoading(false);
    }
  }

  async function runMutation() {
    setMutationLoading(true);
    setMutationError("");
    setMutationResult(null);

    try {
      const response = await fetch(`${API}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: sourceCode,
          test_code: testCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Mutation analysis failed.");
      }

      setMutationResult(data);
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "Backend connection failed."
      );
    } finally {
      setMutationLoading(false);
    }
  }

  const stats = mutationResult?.experiment?.summary;
  const mutants = mutationResult?.experiment?.results ?? [];
  const advice = mutationResult?.investigation?.investigations ?? [];
  const verification = mutationResult?.generated_test_verification;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><FlaskConical size={23} /></div>
          <div>
            <h2>MutationLab</h2>
            <span>Python Learning Lab</span>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>

        <button
          className={`nav-item ${activeTab === "learning" ? "active" : ""}`}
          onClick={() => setActiveTab("learning")}
        >
          <GraduationCap size={18} /> Learning Lab
        </button>

        <button
          className={`nav-item ${activeTab === "mutation" ? "active" : ""}`}
          onClick={() => setActiveTab("mutation")}
        >
          <Bug size={18} /> Mutation Testing
        </button>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <span>MutationLab Engine</span>
          <span className="online">Ready</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">MutationLab / Workspace</div>
            <h1>
              {activeTab === "learning" ? "Python Learning Lab" : "Mutation Testing"}
            </h1>
            <p>
              {activeTab === "learning"
                ? "Understand your mistakes. Become a better programmer."
                : "Discover weaknesses in your tests. Strengthen your code."}
            </p>
          </div>
          <div className="version-tag">VERSION 0.6.0</div>
        </header>

        {activeTab === "learning" && (
          <>
            <section className="welcome-panel">
              <div>
                <div className="eyebrow">
                  <Sparkles size={15} /> GUIDED PYTHON LEARNING
                </div>
                <h2>Don't just fix errors. Understand them.</h2>
                <p>
                  Write Python code, discover mistakes, and learn how to solve
                  them with help from your AI tutor.
                </p>
              </div>
              <div className="welcome-icon">
                <GraduationCap size={70} />
              </div>
            </section>

            <section className="editor-grid">
              <div className="panel editor-panel">
                <div className="panel-heading">
                  <div><Code2 size={18} /><h3>Your Python Code</h3></div>
                  <span>PYTHON</span>
                </div>
                <textarea
                  value={learningCode}
                  onChange={e => setLearningCode(e.target.value)}
                  spellCheck={false}
                  aria-label="Your Python code"
                />
              </div>

              <div className="panel editor-panel">
                <div className="panel-heading">
                  <div><Lightbulb size={18} /><h3>Learning Mode</h3></div>
                </div>

                <div style={{ padding: 18 }}>
                  <label style={{ display: "block", marginBottom: 12 }}>
                    How would you like MutationLab to help?
                  </label>

                  <label style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "guided"}
                      onChange={() => setMode("guided")}
                    />
                    <span>
                      <strong>Guided Learning</strong>
                      <br />
                      <small>Hints first. Learn to solve it yourself.</small>
                    </span>
                  </label>

                  <label style={{ display: "flex", gap: 10 }}>
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "solution"}
                      onChange={() => setMode("solution")}
                    />
                    <span>
                      <strong>Reveal Solution</strong>
                      <br />
                      <small>Show the correction and explain the changes.</small>
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <div className="run-section">
              <div className="run-description">
                <strong>Ready to understand your code?</strong>
                <span>MutationLab will analyze and safely execute your Python code.</span>
              </div>
              <button
                className="run-button"
                onClick={runLearning}
                disabled={learningLoading || !learningCode.trim()}
              >
                {learningLoading
                  ? <Activity size={18} className="spin" />
                  : <Play size={18} />}
                {learningLoading ? "Analyzing..." : "Analyze My Code"}
              </button>
            </div>

            {learningError && (
              <div className="error-message">
                <XCircle size={19} /><span>{learningError}</span>
              </div>
            )}

            {learningResult && (
              <section className="results-section">
                <div className="section-heading">
                  <div>
                    <h2>Learning Report</h2>
                    <p>Your Python analysis and AI tutor feedback</p>
                  </div>
                  <span className="result-badge">
                    {learningResult.status === "success" ? "CODE PASSED" : "ANALYSIS COMPLETE"}
                  </span>
                </div>

                {learningResult.status === "success" ? (
                  <div className="panel advice-card">
                    <h3><CheckCircle2 size={20} /> Your code ran successfully!</h3>
                    <pre>{learningResult.execution?.output || "No output produced."}</pre>
                  </div>
                ) : (
                  <>
                    <div className="panel advice-card">
                      <div className="advice-title">
                        <Bug size={18} />
                        <strong>{learningResult.error?.type || "Error detected"}</strong>
                      </div>
                      <p>{learningResult.error?.message}</p>
                      {learningResult.error?.line && (
                        <p>Line: {learningResult.error.line}</p>
                      )}
                    </div>

                    {learningResult.explanation && (
                      <div className="panel advice-card">
                        <div className="advice-title">
                          <Sparkles size={18} />
                          <strong>AI Tutor Explanation</strong>
                        </div>
                        <pre style={{
                          whiteSpace: "pre-wrap",
                          fontFamily: "inherit",
                          lineHeight: 1.7
                        }}>
                          {learningResult.explanation}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {!learningResult && !learningError && (
              <div className="empty-state">
                <GraduationCap size={35} />
                <h3>Your learning journey starts here</h3>
                <p>Write some Python code and let MutationLab guide you.</p>
              </div>
            )}
          </>
        )}

        {activeTab === "mutation" && (
          <>
            <section className="welcome-panel">
              <div>
                <div className="eyebrow"><ShieldCheck size={15} /> INTELLIGENT TESTING</div>
                <h2>Break your code to build stronger tests.</h2>
                <p>Generate mutations and investigate weaknesses with AI.</p>
              </div>
              <div className="welcome-icon"><ShieldCheck size={70} /></div>
            </section>

            <section className="editor-grid">
              <div className="panel editor-panel">
                <div className="panel-heading">
                  <div><Code2 size={18} /><h3>Source Code</h3></div>
                  <span>PYTHON</span>
                </div>
                <textarea
                  value={sourceCode}
                  onChange={e => setSourceCode(e.target.value)}
                  spellCheck={false}
                />
              </div>

              <div className="panel editor-panel">
                <div className="panel-heading">
                  <div><Terminal size={18} /><h3>Test Suite</h3></div>
                  <span>PYTEST</span>
                </div>
                <textarea
                  value={testCode}
                  onChange={e => setTestCode(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </section>

            <div className="run-section">
              <div className="run-description">
                <strong>Ready to test your code?</strong>
                <span>Tests execute inside Docker.</span>
              </div>
              <button
                className="run-button"
                onClick={runMutation}
                disabled={mutationLoading || !sourceCode.trim() || !testCode.trim()}
              >
                {mutationLoading ? <Activity size={18} className="spin" /> : <Play size={18} />}
                {mutationLoading ? "Running..." : "Run Analysis"}
              </button>
            </div>

            {mutationError && (
              <div className="error-message">
                <XCircle size={19} /><span>{mutationError}</span>
              </div>
            )}

            {mutationResult && (
              <section className="results-section">
                <div className="section-heading">
                  <div><h2>Experiment Results</h2><p>Mutation testing summary</p></div>
                  <span className="result-badge">ANALYSIS COMPLETE</span>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Mutation Score</span>
                    <strong>{(stats?.mutation_score ?? 0).toFixed(2)}%</strong>
                  </div>
                  <div className="stat-card">
                    <span>Total Mutants</span>
                    <strong>{stats?.total_mutants ?? 0}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Killed</span>
                    <strong>{stats?.killed ?? 0}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Survived</span>
                    <strong>{stats?.survived ?? 0}</strong>
                  </div>
                </div>

                <div className="panel table-panel">
                  <div className="panel-heading">
                    <div><Bug size={18} /><h3>Mutation Report</h3></div>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr><th>Mutant</th><th>Mutation</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {mutants.map(mutant => (
                          <tr key={mutant.id}>
                            <td>{mutant.id}</td>
                            <td>{mutant.original_operator} → {mutant.mutated_operator}</td>
                            <td>{mutant.status.toUpperCase()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <section className="ai-section">
                  <div className="section-heading">
                    <div><h2><Sparkles size={21} /> AI Investigator</h2></div>
                    <span className="ai-badge">GEMINI</span>
                  </div>
                  {advice.map((item, index) => (
                    <div className="panel advice-card" key={item.mutant_id ?? index}>
                      <strong>{item.mutant_id}</strong>
                      <p>{item.reason}</p>
                      {item.suggestion && <p>{item.suggestion}</p>}
                    </div>
                  ))}
                </section>

                <div className="panel verification-panel">
                  <div className="panel-heading">
                    <div><ShieldCheck size={19} /><h3>Generated Test Verification</h3></div>
                  </div>
                  <div className="verification-content">
                    <strong>{verification?.verified ?? 0} / {verification?.total ?? 0}</strong>
                    <span>{verification?.success ? "Verification successful" : "Check results"}</span>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <footer>
          MutationLab <span>•</span> Understand. Debug. Learn. Improve.
        </footer>
      </main>
    </div>
  );
}

export default App;
