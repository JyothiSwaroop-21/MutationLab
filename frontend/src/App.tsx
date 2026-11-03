
import { useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Bug, Check, CheckCircle2,
  ChevronRight, Code2, Command, Cpu, FlaskConical, GraduationCap,
  Lightbulb, Play, ShieldCheck, Sparkles, Terminal, XCircle, Zap
} from "lucide-react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

type Language = "python" | "javascript" | "c" | "cpp" | "java";

const languages: { id: Language; name: string; extension: string; version: string }[] = [
  { id: "python", name: "Python", extension: "py", version: "3.12" },
  { id: "javascript", name: "JavaScript", extension: "js", version: "Node 20" },
  { id: "c", name: "C", extension: "c", version: "GCC 14" },
  { id: "cpp", name: "C++", extension: "cpp", version: "G++ 14" },
  { id: "java", name: "Java", extension: "java", version: "JDK 21" },
];

const starterCodes: Record<Language, string> = {
  python: `numbers = [10, 20, 30]

print(numbers[3])`,
  javascript: `const numbers = [10, 20, 30];

console.log(numbers[3].toString());`,
  c: `#include <stdio.h>

int main() {
    int numbers[] = {10, 20, 30};
    printf("%d\\n", numbers[3]);
    return 0;
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    int numbers[] = {10, 20, 30};
    cout << numbers[3] << endl;
    return 0;
}`,
  java: `public class Main {
    public static void main(String[] args) {
        int[] numbers = {10, 20, 30};
        System.out.println(numbers[3]);
    }
}`,
};

type LearningResult = {
  success: boolean;
  status?: string;
  message?: string;
  language?: string;
  output?: string;
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

const starterSource = `def calculate_discount(price, discount):
    return price - (price * discount / 100)`;

const starterTests = `from subject import calculate_discount

def test_discount():
    result = calculate_discount(100, 10)
    assert result > 0`;

function App() {
  const [tab, setTab] = useState<"learning" | "mutation">("learning");

  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(starterCodes.python);
  const [mode, setMode] = useState("guided");
  const [learning, setLearning] = useState<LearningResult | null>(null);
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningError, setLearningError] = useState("");

  const [source, setSource] = useState(starterSource);
  const [tests, setTests] = useState(starterTests);
  const [mutation, setMutation] = useState<ApiResult | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState("");

  const selectedLanguage = languages.find(item => item.id === language)!;
  const lines = code.split("\n");

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setCode(starterCodes[nextLanguage]);
    setLearning(null);
    setLearningError("");
  }

  async function runLearning() {
    setLearningLoading(true);
    setLearningError("");
    setLearning(null);

    try {
      const response = await fetch(`${API}/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Analysis failed.");
      }

      if (data.status === "sandbox_error" || data.status === "ai_error") {
        setLearning(data);
        if (data.status === "sandbox_error") {
          setLearningError(data.message || "Execution environment unavailable.");
        }
      } else {
        setLearning(data);
      }
    } catch (error) {
      setLearningError(
        error instanceof Error
          ? error.message
          : "Could not connect to the backend."
      );
    } finally {
      setLearningLoading(false);
    }
  }

  async function runMutation() {
    setMutationLoading(true);
    setMutationError("");
    setMutation(null);

    try {
      const response = await fetch(`${API}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: source,
          test_code: tests,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Mutation analysis failed.");
      }

      setMutation(data);
    } catch (error) {
      setMutationError(
        error instanceof Error
          ? error.message
          : "Could not connect to the backend."
      );
    } finally {
      setMutationLoading(false);
    }
  }

  const stats = mutation?.experiment?.summary;
  const mutants = mutation?.experiment?.results ?? [];
  const advice = mutation?.investigation?.investigations ?? [];
  const verification = mutation?.generated_test_verification;

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><FlaskConical size={22} /></div>
          <div className="brand-name">
            <strong>Mutation<span>Lab</span></strong>
            <small>INTELLIGENCE WORKSPACE</small>
          </div>
        </div>

        <div className="sidebar-label">YOUR WORKSPACE</div>

        <button
          className={`nav-item ${tab === "learning" ? "active" : ""}`}
          onClick={() => setTab("learning")}
        >
          <GraduationCap size={18} />
          <span>Learning Lab</span>
          {tab === "learning" && <ChevronRight size={15} className="nav-arrow" />}
        </button>

        <button
          className={`nav-item ${tab === "mutation" ? "active" : ""}`}
          onClick={() => setTab("mutation")}
        >
          <Bug size={18} />
          <span>Mutation Testing</span>
          {tab === "mutation" && <ChevronRight size={15} className="nav-arrow" />}
        </button>

        <div className="sidebar-card">
          <div className="sidebar-card-icon"><Zap size={17} /></div>
          <strong>Build better code.</strong>
          <p>Understand the why, not just the fix.</p>
          <div className="sidebar-card-line" />
          <small>LEARN · DEBUG · IMPROVE</small>
        </div>

        <div className="sidebar-footer">
          <span className="online-dot" />
          <span>Local engine</span>
          <span className="ready-label">READY</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>WORKSPACE</span>
            <ChevronRight size={13} />
            <strong>{tab === "learning" ? "Learning Lab" : "Mutation Testing"}</strong>
          </div>
          <div className="topbar-right">
            <div className="system-status">
              <span className="online-dot" /> SYSTEM ONLINE
            </div>
            <div className="version-tag">v0.7.0</div>
          </div>
        </header>

        {tab === "learning" ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <Sparkles size={14} /> MULTI-LANGUAGE AI MENTOR
                </div>
                <h1>Think like a <span>developer.</span><br />Debug like a pro.</h1>
                <p>
                  Write code. Find the problem. Understand the concept.
                  Become a better programmer, one bug at a time.
                </p>
                <div className="hero-pills">
                  <span><Check size={13} /> Beginner friendly</span>
                  <span><ShieldCheck size={13} /> Sandboxed execution</span>
                  <span><Zap size={13} /> AI guided</span>
                </div>
              </div>

              <div className="hero-art">
                <div className="orbit orbit-a" />
                <div className="orbit orbit-b" />
                <div className="orbit orbit-c" />
                <div className="core-glow"><FlaskConical size={54} /></div>
                <span className="floating-code code-a">{"{ }"}</span>
                <span className="floating-code code-b">{"</>"}</span>
                <span className="floating-code code-c">01</span>
              </div>
              <div className="hero-index">01 <span>/ LEARN</span></div>
            </section>

            <div className="section-intro">
              <div>
                <div className="section-kicker">THE PLAYGROUND</div>
                <h2>Your coding workspace</h2>
                <p>Choose your language and experiment in an isolated environment.</p>
              </div>
              <div className="language-chip">
                <span className="python-dot" /> {selectedLanguage.name.toUpperCase()}
              </div>
            </div>

            <section className="language-selector-panel">
              <div className="language-selector-heading">
                <div>
                  <span className="section-kicker">SELECT YOUR LANGUAGE</span>
                  <h3>What are we coding today?</h3>
                </div>
                <span className="language-count">05 LANGUAGES</span>
              </div>

              <div className="language-options">
                {languages.map(item => (
                  <button
                    key={item.id}
                    className={`language-option ${language === item.id ? "selected" : ""}`}
                    onClick={() => changeLanguage(item.id)}
                    aria-pressed={language === item.id}
                  >
                    <span className="language-option-icon">
                      {item.id === "python" ? "Py" :
                        item.id === "javascript" ? "JS" :
                          item.id === "cpp" ? "C+" :
                            item.id === "java" ? "J" : "C"}
                    </span>
                    <span className="language-option-text">
                      <strong>{item.name}</strong>
                      <small>{item.version}</small>
                    </span>
                    {language === item.id && <CheckCircle2 size={17} />}
                  </button>
                ))}
              </div>
            </section>

            <section className="workspace-grid">
              <div className="editor-card">
                <div className="window-bar">
                  <div className="window-dots"><i /><i /><i /></div>
                  <div className="file-tab">
                    <Code2 size={13} /> main.{selectedLanguage.extension}
                    <span className="unsaved-dot" />
                  </div>
                  <div className="window-meta">UTF-8 · {selectedLanguage.name.toUpperCase()}</div>
                </div>

                <div className="editor-body">
                  <div className="line-numbers">
                    {lines.map((_, index) => <span key={index}>{index + 1}</span>)}
                  </div>
                  <textarea
                    className="code-editor"
                    value={code}
                    onChange={event => {
                      setCode(event.target.value);
                      setLearning(null);
                      setLearningError("");
                    }}
                    spellCheck={false}
                    aria-label={`${selectedLanguage.name} code editor`}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                  />
                </div>

                <div className="editor-footer">
                  <span><span className="online-dot" /> EDITOR READY</span>
                  <span>{lines.length} LINES <i /> {code.length} CHARACTERS</span>
                </div>
              </div>

              <div className="tutor-card">
                <div className="tutor-heading">
                  <div className="tutor-avatar"><Sparkles size={19} /></div>
                  <div>
                    <strong>Mutation AI</strong>
                    <small>Your personal coding mentor</small>
                  </div>
                  <span className="ai-live"><i /> LIVE</span>
                </div>

                <div className="tutor-content">
                  <div className="tutor-welcome">
                    <span className="tutor-greeting">HEY, DEVELOPER 👋</span>
                    <h3>What are we<br />working on today?</h3>
                    <p>
                      I'll help you understand your {selectedLanguage.name} code,
                      spot mistakes, and learn how to solve them.
                    </p>
                  </div>

                  <div className="mode-title">CHOOSE YOUR LEARNING STYLE</div>

                  <button
                    className={`mode-option ${mode === "guided" ? "selected" : ""}`}
                    onClick={() => setMode("guided")}
                  >
                    <div className="mode-icon"><Lightbulb size={17} /></div>
                    <div><strong>Guide me</strong><small>Hints first. You solve it yourself.</small></div>
                    <span className="mode-radio">{mode === "guided" && <i />}</span>
                  </button>

                  <button
                    className={`mode-option ${mode === "solution" ? "selected" : ""}`}
                    onClick={() => setMode("solution")}
                  >
                    <div className="mode-icon solution-icon"><CheckCircle2 size={17} /></div>
                    <div><strong>Show me the solution</strong><small>See corrected code and explanations.</small></div>
                    <span className="mode-radio">{mode === "solution" && <i />}</span>
                  </button>

                  <div className="tutor-tip">
                    <Sparkles size={14} />
                    <span><strong>Learning tip</strong> Try to understand the error before revealing the solution.</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="execute-bar">
              <div className="execute-info">
                <div className="execute-icon"><Terminal size={19} /></div>
                <div>
                  <strong>Ready when you are.</strong>
                  <small>Run your {selectedLanguage.name} code and let your AI mentor inspect the result.</small>
                </div>
              </div>
              <button
                className="execute-button"
                onClick={runLearning}
                disabled={learningLoading || !code.trim()}
              >
                {learningLoading
                  ? <Activity size={17} className="spin" />
                  : <Play size={17} fill="currentColor" />}
                {learningLoading ? "ANALYZING..." : "RUN ANALYSIS"}
                {!learningLoading && <ArrowRight size={16} />}
              </button>
            </section>

            {learningError && (
              <div className="error-banner"><XCircle size={18} />{learningError}</div>
            )}

            <section className="output-section">
              <div className="output-heading">
                <div>
                  <div className="section-kicker">LIVE FEEDBACK</div>
                  <h2>Execution & intelligence</h2>
                </div>
                <span className="terminal-label"><Terminal size={14} /> OUTPUT CONSOLE</span>
              </div>

              {!learning && !learningError && !learningLoading && (
                <div className="console-empty">
                  <div className="empty-terminal"><Terminal size={25} /></div>
                  <div>
                    <strong>Waiting for your code...</strong>
                    <p>Your execution results and AI tutor feedback will appear here.</p>
                  </div>
                  <span className="console-cursor" />
                </div>
              )}

              {learningLoading && (
                <div className="console-empty loading-state">
                  <div className="loading-orb"><Activity size={25} className="spin" /></div>
                  <div>
                    <strong>Inspecting your code</strong>
                    <p>Executing safely and preparing your learning report...</p>
                  </div>
                </div>
              )}

              {learning?.status === "success" && (
                <div className="result-panel success-panel">
                  <div className="result-title">
                    <CheckCircle2 size={20} />
                    <strong>Execution successful</strong>
                    <span className="result-tag success-tag">PASSED</span>
                  </div>
                  <pre>{learning.output || "Program completed without producing output."}</pre>
                  <p>{learning.message || "Your code ran successfully."}</p>
                </div>
              )}

              {learning && learning.status !== "success" && (
                <div className="result-stack">
                  <div className="result-panel error-panel">
                    <div className="result-title">
                      <AlertTriangle size={19} />
                      <strong>{learning.error?.type || "Error detected"}</strong>
                      <span className="result-tag error-tag">NEEDS ATTENTION</span>
                    </div>
                    <p>{learning.error?.message || learning.message}</p>
                    {learning.error?.line && (
                      <div className="error-location">
                        LOCATION <strong>Line {learning.error.line}</strong>
                      </div>
                    )}
                  </div>

                  {learning.explanation && (
                    <div className="result-panel ai-explanation">
                      <div className="result-title">
                        <div className="mini-ai"><Sparkles size={15} /></div>
                        <strong>Your AI tutor explains</strong>
                        <span className="result-tag ai-tag">GEMINI</span>
                      </div>
                      <pre>{learning.explanation}</pre>
                    </div>
                  )}

                  {learning.status === "ai_error" && (
                    <div className="error-banner">
                      {learning.message || "AI explanation unavailable."}
                    </div>
                  )}

                  {learning.status === "sandbox_error" && (
                    <div className="error-banner">
                      {learning.message || "The execution environment is unavailable."}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="hero mutation-hero">
              <div className="hero-copy">
                <div className="eyebrow"><ShieldCheck size={14} /> INTELLIGENT SOFTWARE TESTING</div>
                <h1>Don't just test code.<br /><span>Challenge it.</span></h1>
                <p>Mutation testing reveals whether your test suite catches real bugs—or lets them slip through.</p>
                <div className="hero-pills">
                  <span><Check size={13} /> Mutation analysis</span>
                  <span><ShieldCheck size={13} /> Docker sandbox</span>
                  <span><Zap size={13} /> AI investigation</span>
                </div>
              </div>
              <div className="hero-art mutation-art">
                <div className="orbit orbit-a" />
                <div className="orbit orbit-b" />
                <div className="orbit orbit-c" />
                <div className="core-glow"><Bug size={54} /></div>
                <span className="floating-code code-a">MUT</span>
                <span className="floating-code code-b">!</span>
                <span className="floating-code code-c">02</span>
              </div>
              <div className="hero-index">02 <span>/ TEST</span></div>
            </section>

            <div className="section-intro">
              <div>
                <div className="section-kicker">MUTATION WORKBENCH</div>
                <h2>Put your tests to the test</h2>
                <p>Provide your Python function and its pytest test suite.</p>
              </div>
              <div className="language-chip"><span className="python-dot" /> PYTHON + PYTEST</div>
            </div>

            <section className="workspace-grid mutation-workspace">
              <div className="editor-card">
                <div className="window-bar">
                  <div className="window-dots"><i /><i /><i /></div>
                  <div className="file-tab"><Code2 size={13} /> subject.py</div>
                  <div className="window-meta">SOURCE</div>
                </div>
                <textarea
                  className="mutation-editor"
                  value={source}
                  onChange={event => setSource(event.target.value)}
                  spellCheck={false}
                  aria-label="Source code"
                />
              </div>

              <div className="editor-card">
                <div className="window-bar">
                  <div className="window-dots"><i /><i /><i /></div>
                  <div className="file-tab"><Terminal size={13} /> test_subject.py</div>
                  <div className="window-meta">PYTEST</div>
                </div>
                <textarea
                  className="mutation-editor"
                  value={tests}
                  onChange={event => setTests(event.target.value)}
                  spellCheck={false}
                  aria-label="Test code"
                />
              </div>
            </section>

            <section className="execute-bar">
              <div className="execute-info">
                <div className="execute-icon"><FlaskConical size={19} /></div>
                <div>
                  <strong>Launch mutation experiment</strong>
                  <small>Generate mutants, run tests, and investigate survivors.</small>
                </div>
              </div>
              <button
                className="execute-button"
                onClick={runMutation}
                disabled={mutationLoading || !source.trim() || !tests.trim()}
              >
                {mutationLoading
                  ? <Activity size={17} className="spin" />
                  : <Play size={17} fill="currentColor" />}
                {mutationLoading ? "RUNNING..." : "RUN EXPERIMENT"}
                {!mutationLoading && <ArrowRight size={16} />}
              </button>
            </section>

            {mutationError && (
              <div className="error-banner"><XCircle size={18} />{mutationError}</div>
            )}

            {mutationLoading && (
              <div className="console-empty loading-state">
                <div className="loading-orb"><Activity size={25} className="spin" /></div>
                <div>
                  <strong>Mutation experiment in progress</strong>
                  <p>Running your tests against generated code mutations...</p>
                </div>
              </div>
            )}

            {mutation && (
              <>
                <div className="section-intro results-intro">
                  <div>
                    <div className="section-kicker">EXPERIMENT REPORT</div>
                    <h2>Your mutation results</h2>
                    <p>Here's how effectively your tests detect unexpected changes.</p>
                  </div>
                  <span className="result-tag success-tag">COMPLETE</span>
                </div>

                <section className="stats-grid">
                  <div className="stat-card score-card">
                    <span>MUTATION SCORE</span>
                    <strong>{(stats?.mutation_score ?? 0).toFixed(2)}<small>%</small></strong>
                    <div className="stat-track">
                      <i style={{ width: `${Math.max(0, Math.min(100, stats?.mutation_score ?? 0))}%` }} />
                    </div>
                  </div>
                  <div className="stat-card">
                    <span>TOTAL MUTANTS</span>
                    <strong>{stats?.total_mutants ?? 0}</strong>
                    <small>Generated changes</small>
                  </div>
                  <div className="stat-card">
                    <span>KILLED</span>
                    <strong className="green-number">{stats?.killed ?? 0}</strong>
                    <small>Caught by your tests</small>
                  </div>
                  <div className="stat-card">
                    <span>SURVIVED</span>
                    <strong className="red-number">{stats?.survived ?? 0}</strong>
                    <small>Escaped detection</small>
                  </div>
                </section>

                <section className="report-card">
                  <div className="report-heading">
                    <div><Bug size={18} /><strong>Mutation report</strong></div>
                    <span>{mutants.length} MUTANTS</span>
                  </div>
                  {mutants.length ? mutants.map(mutant => (
                    <div className="mutant-row" key={mutant.id}>
                      <div>
                        <strong>{mutant.id}</strong>
                        <small>{mutant.original_operator} → {mutant.mutated_operator}</small>
                      </div>
                      <span className={`mutant-status ${mutant.status.toLowerCase()}`}>
                        {mutant.status.toUpperCase()}
                      </span>
                    </div>
                  )) : <p className="no-data">No mutants were returned for this experiment.</p>}
                </section>

                <section className="report-card ai-report">
                  <div className="report-heading">
                    <div><Sparkles size={18} /><strong>AI Investigator</strong></div>
                    <span>GEMINI</span>
                  </div>
                  {advice.length ? advice.map((item, index) => (
                    <div className="investigation" key={item.mutant_id ?? index}>
                      <strong>{item.mutant_id || "Surviving mutant"}</strong>
                      <p>{item.reason}</p>
                      {item.suggestion && (
                        <div className="investigation-tip">
                          <Lightbulb size={15} />{item.suggestion}
                        </div>
                      )}
                    </div>
                  )) : <p className="no-data">No AI investigation details were returned.</p>}
                </section>

                <section className="verification-card">
                  <div className="verification-icon"><ShieldCheck size={21} /></div>
                  <div>
                    <strong>Generated test verification</strong>
                    <p>
                      {verification?.success
                        ? "Generated tests passed verification."
                        : "Review the verification details from this experiment."}
                    </p>
                  </div>
                  <div className="verification-count">
                    {verification?.verified ?? 0}
                    <small> / {verification?.total ?? 0} verified</small>
                  </div>
                </section>
              </>
            )}

            {!mutation && !mutationLoading && !mutationError && (
              <div className="console-empty">
                <div className="empty-terminal"><Cpu size={25} /></div>
                <div>
                  <strong>Your experiment starts here</strong>
                  <p>Run a mutation experiment to see the report, AI investigation, and test verification.</p>
                </div>
              </div>
            )}
          </>
        )}

        <footer className="app-footer">
          <div className="footer-brand"><FlaskConical size={15} /> MUTATIONLAB</div>
          <span>Understand. Debug. Learn. Improve.</span>
          <span className="footer-version"><Command size={12} /> BUILT FOR DEVELOPERS</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
