
import { useState } from "react";
import {
  Activity,
  Bug,
  CheckCircle2,
  Code2,
  FlaskConical,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";
import "./App.css";

type Mutant = {
  id: string;
  original_operator: string;
  mutated_operator: string;
  status: string;
  execution?: {
    status: string;
    output?: string;
  };
};

type Experiment = {
  success?: boolean;
  baseline?: string;
  summary?: {
    total_mutants?: number;
    killed?: number;
    survived?: number;
    errors?: number;
    mutation_score?: number;
  };
  results?: Mutant[];
};

type InvestigationItem = {
  mutant_id?: string;
  status?: string;
  mutation?: string;
  reason?: string;
  suggestion?: string;
  example?: string;
  generated_test?: string;
  test_validation?: string;
};

type Investigation = {
  success?: boolean;
  ai_used?: boolean;
  survivors_found?: number;
  investigations?: InvestigationItem[];
};

type VerificationItem = {
  mutant_id?: string;
  verified?: boolean;
  status?: string;
  original_passed?: boolean;
  mutant_failed?: boolean;
};

type Verification = {
  success?: boolean;
  total?: number;
  verified?: number;
  results?: VerificationItem[];
};

type ApiResult = {
  experiment?: Experiment;
  investigation?: Investigation;
  generated_test_verification?: Verification;
};

const DEFAULT_SOURCE = `def calculate_discount(price, discount):
    return price - (price * discount / 100)
`;

const DEFAULT_TESTS = `from subject import calculate_discount

def test_discount():
    result = calculate_discount(100, 10)
    assert result > 0
`;

function App() {
  const [sourceCode, setSourceCode] = useState(DEFAULT_SOURCE);
  const [testCode, setTestCode] = useState(DEFAULT_TESTS);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/investigate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_code: sourceCode,
            test_code: testCode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Analysis failed.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the MutationLab backend."
      );
    } finally {
      setLoading(false);
    }
  }

  const experiment = result?.experiment;
  const summary = experiment?.summary;
  const investigation = result?.investigation;
  const verification = result?.generated_test_verification;

  const mutants = experiment?.results ?? [];
  const advice = investigation?.investigations ?? [];
  const verificationResults = verification?.results ?? [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <FlaskConical size={23} />
          </div>
          <div>
            <h2>MutationLab</h2>
            <span>AI Testing Laboratory</span>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>

        <div className="nav-item active">
          <Activity size={18} />
          Dashboard
        </div>

        <div className="nav-item">
          <Bug size={18} />
          Mutation Testing
        </div>

        <div className="nav-item">
          <Sparkles size={18} />
          AI Investigator
        </div>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <span>MutationLab Engine</span>
          <span className="online">Ready</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Workspace / Dashboard
            </div>
            <h1>Mutation Testing Dashboard</h1>
            <p>
              Discover weaknesses in your tests. Strengthen your code.
            </p>
          </div>

          <div className="version-tag">VERSION 0.5.0</div>
        </header>

        <section className="welcome-panel">
          <div>
            <div className="eyebrow">
              <Sparkles size={15} />
              INTELLIGENT TESTING
            </div>

            <h2>Break your code to build stronger tests.</h2>

            <p>
              Generate mutations, detect surviving bugs, and let AI
              investigate weaknesses in your test suite.
            </p>
          </div>

          <div className="welcome-icon">
            <ShieldCheck size={70} />
          </div>
        </section>

        <section className="editor-grid">
          <div className="panel editor-panel">
            <div className="panel-heading">
              <div>
                <Code2 size={18} />
                <h3>Source Code</h3>
              </div>
              <span>PYTHON</span>
            </div>

            <textarea
              value={sourceCode}
              onChange={(event) => setSourceCode(event.target.value)}
              spellCheck={false}
              aria-label="Python source code"
            />
          </div>

          <div className="panel editor-panel">
            <div className="panel-heading">
              <div>
                <Terminal size={18} />
                <h3>Test Suite</h3>
              </div>
              <span>PYTEST</span>
            </div>

            <textarea
              value={testCode}
              onChange={(event) => setTestCode(event.target.value)}
              spellCheck={false}
              aria-label="Pytest test code"
            />
          </div>
        </section>

        <div className="run-section">
          <div className="run-description">
            <strong>Ready to test your code?</strong>
            <span>
              MutationLab will run your tests inside Docker.
            </span>
          </div>

          <button
            className="run-button"
            onClick={runAnalysis}
            disabled={
              loading ||
              !sourceCode.trim() ||
              !testCode.trim()
            }
          >
            {loading ? (
              <Activity size={18} className="spin" />
            ) : (
              <Play size={18} />
            )}

            {loading ? "Running Analysis..." : "Run Analysis"}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <XCircle size={19} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <>
            <section className="results-section">
              <div className="section-heading">
                <div>
                  <h2>Experiment Results</h2>
                  <p>Your mutation testing summary</p>
                </div>

                <span className="result-badge">
                  ANALYSIS COMPLETE
                </span>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <span>Mutation Score</span>
                  <strong>
                    {Number(
                      summary?.mutation_score ?? 0
                    ).toFixed(2)}%
                  </strong>
                  <small>Test effectiveness</small>
                </div>

                <div className="stat-card">
                  <span>Total Mutants</span>
                  <strong>
                    {summary?.total_mutants ?? 0}
                  </strong>
                  <small>Generated mutations</small>
                </div>

                <div className="stat-card">
                  <span>Killed</span>
                  <strong className="success-text">
                    {summary?.killed ?? 0}
                  </strong>
                  <small>Detected by tests</small>
                </div>

                <div className="stat-card">
                  <span>Survived</span>
                  <strong className="danger-text">
                    {summary?.survived ?? 0}
                  </strong>
                  <small>Need stronger tests</small>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="panel-heading">
                  <div>
                    <Bug size={18} />
                    <h3>Mutation Report</h3>
                  </div>
                </div>

                {mutants.length > 0 ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Mutant</th>
                          <th>Mutation</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {mutants.map((mutant) => {
                          const killed =
                            mutant.status === "killed";

                          return (
                            <tr key={mutant.id}>
                              <td>{mutant.id}</td>

                              <td>
                                {mutant.original_operator}
                                {" → "}
                                {mutant.mutated_operator}
                              </td>

                              <td>
                                <span
                                  className={`status-pill ${
                                    killed
                                      ? "killed"
                                      : mutant.status === "survived"
                                      ? "survived"
                                      : ""
                                  }`}
                                >
                                  {killed ? (
                                    <CheckCircle2 size={14} />
                                  ) : (
                                    <XCircle size={14} />
                                  )}

                                  {mutant.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-message">
                    No mutation details were returned by the API.
                  </p>
                )}
              </div>
            </section>

            <section className="ai-section">
              <div className="section-heading">
                <div>
                  <h2>
                    <Sparkles size={21} />
                    AI Investigator
                  </h2>
                  <p>
                    Gemini's analysis of surviving mutations
                  </p>
                </div>

                <span className="ai-badge">
                  {investigation?.ai_used
                    ? "AI POWERED"
                    : "RULE-BASED"}
                </span>
              </div>

              {advice.length > 0 ? (
                advice.map((item, index) => (
                  <div
                    className="panel advice-card"
                    key={item.mutant_id ?? index}
                  >
                    <div className="advice-title">
                      <Sparkles size={17} />
                      <strong>
                        {item.mutant_id ?? `Mutant ${index + 1}`}
                      </strong>
                      {item.mutation && (
                        <span>{item.mutation}</span>
                      )}
                    </div>

                    <p>
                      {item.reason ?? "No explanation provided."}
                    </p>

                    {item.suggestion && (
                      <div className="suggestion">
                        <strong>Suggested improvement</strong>
                        <p>{item.suggestion}</p>
                      </div>
                    )}

                    {item.example && (
                      <div className="suggestion">
                        <strong>Example assertion</strong>
                        <pre>{item.example}</pre>
                      </div>
                    )}

                    {item.generated_test && (
                      <div className="generated-test">
                        <strong>Generated pytest</strong>
                        <pre>{item.generated_test}</pre>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="panel empty-message">
                  No AI investigation advice was returned.
                </div>
              )}
            </section>

            <section className="panel verification-panel">
              <div className="panel-heading">
                <div>
                  <ShieldCheck size={19} />
                  <h3>Generated Test Verification</h3>
                </div>
              </div>

              <div className="verification-content">
                <div>
                  <strong>
                    {verification?.verified ?? 0}
                    {" / "}
                    {verification?.total ?? 0}
                  </strong>
                  <span>Generated tests verified</span>
                </div>

                <span
                  className={`verification-status ${
                    verification?.success
                      ? "verified"
                      : "not-verified"
                  }`}
                >
                  {verification?.success
                    ? "Verification successful"
                    : "Check results"}
                </span>
              </div>

              {verificationResults.length > 0 && (
                <div className="verification-list">
                  {verificationResults.map((item, index) => (
                    <div
                      className="verification-item"
                      key={item.mutant_id ?? index}
                    >
                      <span>{item.mutant_id}</span>

                      <span
                        className={
                          item.verified
                            ? "success-text"
                            : "danger-text"
                        }
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {!result && !error && (
          <div className="empty-state">
            <FlaskConical size={35} />
            <h3>Your laboratory is ready</h3>
            <p>
              Run an analysis to see mutation results and AI
              recommendations.
            </p>
          </div>
        )}

        <footer>
          MutationLab <span>•</span> AI-assisted mutation testing
        </footer>
      </main>
    </div>
  );
}

export default App;
