import { useState, useRef, useEffect, useCallback } from "react";

const LANGUAGES = [
  {
    id: "python", label: "Python", version: "3.10.0", ext: "py", judge0Id: 71,
    icon: "🐍", color: "#3b82f6", desc: "General purpose scripting",
    starter: `# Python — ready to run\nprint("Hello, World!")\n\n# Try something:\nnums = [1, 2, 3, 4, 5]\nprint(f"Sum: {sum(nums)}")\nprint(f"Squares: {[x**2 for x in nums]}")\n`
  },
  {
    id: "javascript", label: "JavaScript", version: "18.15.0", ext: "js", judge0Id: 63,
    icon: "⚡", color: "#f59e0b", desc: "Web & Node.js runtime",
    starter: `// JavaScript — ready to run\nconsole.log("Hello, World!");\n\n// Try something:\nconst nums = [1, 2, 3, 4, 5];\nconsole.log("Sum:", nums.reduce((a, b) => a + b, 0));\nconsole.log("Squares:", nums.map(x => x ** 2));\n`
  },
  {
    id: "typescript", label: "TypeScript", version: "5.0.3", ext: "ts", judge0Id: 74,
    icon: "🔷", color: "#06b6d4", desc: "Typed JavaScript",
    starter: `// TypeScript — ready to run\nconst greet = (name: string): string => \`Hello, \${name}!\`;\nconsole.log(greet("World"));\n\ninterface User { name: string; age: number; }\nconst user: User = { name: "Nithin", age: 21 };\nconsole.log(\`User: \${user.name}, Age: \${user.age}\`);\n`
  },
  {
    id: "java", label: "Java", version: "15.0.2", ext: "java", judge0Id: 62,
    icon: "☕", color: "#ef4444", desc: "Class-based OOP",
    starter: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n\n    int[] nums = {1, 2, 3, 4, 5};\n    int sum = 0;\n    for (int n : nums) sum += n;\n    System.out.println("Sum: " + sum);\n  }\n}\n`
  },
  {
    id: "c", label: "C", version: "10.2.0", ext: "c", judge0Id: 50,
    icon: "⚙️", color: "#8b5cf6", desc: "Low-level systems",
    starter: `#include <stdio.h>\n\nint main() {\n  printf("Hello, World!\\n");\n\n  int nums[] = {1, 2, 3, 4, 5};\n  int sum = 0;\n  for (int i = 0; i < 5; i++) sum += nums[i];\n  printf("Sum: %d\\n", sum);\n\n  return 0;\n}\n`
  },
  {
    id: "cpp", label: "C++", version: "10.2.0", ext: "cpp", judge0Id: 53,
    icon: "🔧", color: "#10b981", desc: "High-perf systems",
    starter: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n  cout << "Hello, World!" << endl;\n\n  vector<int> nums = {1, 2, 3, 4, 5};\n  int sum = 0;\n  for (int n : nums) sum += n;\n  cout << "Sum: " << sum << endl;\n\n  return 0;\n}\n`
  },
];

const CODE_EXECUTION_API = "/api/execute";

const DARK = {
  bg: "#070710", surface: "#0d0d1c", panel: "#0a0a18", border: "#1a1a30",
  text: "#dde2f0", muted: "#3a3a5c", subtle: "#6b7280", accent: "#00ffa3",
  accentDim: "rgba(0,255,163,0.12)", error: "#ff5e5e", errorDim: "rgba(255,94,94,0.08)",
  lineNum: "#252545",
};

const LIGHT = {
  bg: "#f4f6fb", surface: "#ffffff", panel: "#f0f2f9", border: "#d8dce8",
  text: "#1e2030", muted: "#c0c4d6", subtle: "#8a93a8", accent: "#0066ff",
  accentDim: "rgba(0,102,255,0.1)", error: "#dc2626", errorDim: "rgba(220,38,38,0.07)",
  lineNum: "#c8ccd8",
};

export default function App() {
  const [theme, setTheme] = useState("dark");
  const T = theme === "dark" ? DARK : LIGHT;

  const [phase, setPhase] = useState("splash");
  const [lang, setLang] = useState(null);
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [execTime, setExecTime] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [splashAnim, setSplashAnim] = useState(false);

  const textareaRef = useRef(null);
  const lineNumRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setSplashAnim(true), 50);
  }, []);

  // Fix #9: Re-sync scroll when fontSize changes so line numbers stay aligned
  useEffect(() => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [fontSize]);

  const selectLang = (l) => {
    setLang(l);
    setCode(l.starter);
    setOutput(null);
    setExecTime(null);
    // Fix #7 & #8: Clear stdin and execTime when picking a language from splash
    setStdin("");
    setShowStdin(false);
    setSplashAnim(false);
    setTimeout(() => setPhase("editor"), 300);
  };

  const switchLang = (l) => {
    setLang(l);
    setCode(l.starter);
    setOutput(null);
    // Fix #7 & #8: Also clear stdin and execTime when switching via editor tab
    setStdin("");
    setShowStdin(false);
    setExecTime(null);
  };

  const syncScroll = () => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Fix #2: run defined with useCallback so handleKeyDown can safely depend on it
  const run = useCallback(async () => {
    if (!lang) return;
    setRunning(true);
    setOutput(null);
    const t0 = Date.now();
    try {
      const res = await fetch(CODE_EXECUTION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language_id: lang.judge0Id, source_code: code, stdin }),
      });

      // Fix #1: Check res.ok BEFORE calling res.json()
      // If the server returns a non-JSON error page, res.json() would crash and hide the real error
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
      }

      const data = await res.json();
      const r = data.run || data;

      setExecTime(((Date.now() - t0) / 1000).toFixed(2));
      setOutput({ stdout: r.stdout || "", stderr: r.stderr || "", code: r.code ?? 0 });
    } catch (err) {
      setOutput({
        stdout: "",
        stderr: `❌ Error: ${err.message}${err.message.includes("Network") ? "" : "\n\nTip: Check if backend is running on :3002"}`,
        code: -1,
      });
    }
    setRunning(false);
  }, [lang, code, stdin]);

  // Fix #2: handleKeyDown now depends on run (which is stable via useCallback)
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
  }, [code, run]);

  const updateCursor = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const text = ta.value.substring(0, ta.selectionStart);
    const lines = text.split("\n");
    setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });
  };

  const exportCode = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `main.${lang?.ext || "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyOutput = () => {
    const text = output ? (output.stdout + output.stderr).trim() : "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const lineCount = code.split("\n").length;
  const hasError = output && (output.stderr || output.code !== 0);

  // ─── SPLASH SCREEN ────────────────────────────────────────────────
  if (phase === "splash") {
    return (
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: T.bg, minHeight: "100vh", color: T.text,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 20px", transition: "opacity 0.3s", opacity: splashAnim ? 1 : 0,
        position: "relative", overflow: "hidden",
      }}>
        {/* Grid bg */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
          backgroundSize: "40px 40px", opacity: 0.4,
        }} />

        {/* Glow */}
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "300px",
          background: `radial-gradient(ellipse, ${theme === "dark" ? "rgba(0,255,163,0.07)" : "rgba(0,102,255,0.06)"} 0%, transparent 70%)`,
          zIndex: 0,
        }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "860px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              {/* Fix #10: Replace garbled {">"}_ with a proper terminal-style icon using text */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "8px",
                background: `linear-gradient(135deg, ${T.accent}, ${theme === "dark" ? "#00cfff" : "#0044cc"})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#000", fontWeight: "900", fontSize: "14px",
              }}>&gt;_</div>
              <span style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "4px", color: T.accent }}>CODERUN</span>
            </div>
            <p style={{ fontSize: "13px", color: T.subtle, letterSpacing: "1px", margin: 0 }}>
              Pick a language. Start coding. Nothing saved. Ever.
            </p>
          </div>

          {/* Theme toggle */}
          <div style={{ position: "absolute", top: "-60px", right: "0" }}>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: "6px", padding: "6px 12px", cursor: "pointer",
              color: T.subtle, fontSize: "11px", letterSpacing: "0.5px",
            }}>
              {theme === "dark" ? "☀ Light" : "☾ Dark"}
            </button>
          </div>

          {/* Language Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
            {LANGUAGES.map((l, i) => (
              <button key={l.id} onClick={() => selectLang(l)} style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: "10px", padding: "20px", cursor: "pointer",
                textAlign: "left", transition: "all 0.18s ease",
                animationDelay: `${i * 60}ms`, position: "relative", overflow: "hidden",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = l.color;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 8px 24px ${l.color}22`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  position: "absolute", top: 0, right: 0, width: "60px", height: "60px",
                  background: `radial-gradient(circle at top right, ${l.color}18, transparent 70%)`,
                }} />
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>{l.icon}</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: T.text, marginBottom: "4px" }}>{l.label}</div>
                <div style={{ fontSize: "10px", color: T.subtle, letterSpacing: "0.5px" }}>{l.desc}</div>
                <div style={{ marginTop: "14px", fontSize: "10px", letterSpacing: "1px", color: l.color, display: "flex", alignItems: "center", gap: "4px" }}>
                  SELECT →
                </div>
              </button>
            ))}
          </div>
        </div>

        <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      </div>
    );
  }

  // ─── EDITOR ───────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      background: T.bg, height: "100vh", color: T.text,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Topbar */}
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "0 16px", height: "46px",
        display: "flex", alignItems: "center", gap: "12px", flexShrink: 0,
      }}>
        {/* Logo + back */}
        <button onClick={() => { setSplashAnim(false); setTimeout(() => { setPhase("splash"); setTimeout(() => setSplashAnim(true), 50); }, 50); }} style={{
          background: "none", border: "none", cursor: "pointer",
          color: T.accent, fontSize: "13px", fontWeight: "800",
          letterSpacing: "3px", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px",
        }}>
          {"<"} CODERUN
        </button>

        <div style={{ width: "1px", height: "20px", background: T.border }} />

        {/* Lang tabs — Fix #7 #8: use switchLang which also clears stdin/execTime */}
        <div style={{ display: "flex", gap: "3px", flex: 1, overflowX: "auto" }}>
          {LANGUAGES.map(l => (
            <button key={l.id} onClick={() => switchLang(l)} style={{
              padding: "4px 10px", borderRadius: "4px",
              border: lang?.id === l.id ? `1px solid ${l.color}` : `1px solid transparent`,
              background: lang?.id === l.id ? `${l.color}18` : "transparent",
              color: lang?.id === l.id ? l.color : T.subtle,
              fontSize: "10px", fontWeight: "700", cursor: "pointer", letterSpacing: "0.5px",
              whiteSpace: "nowrap", transition: "all 0.12s", fontFamily: "inherit",
            }}>{l.icon} {l.label}</button>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* Font size */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${T.border}`, borderRadius: "4px", padding: "2px 6px" }}>
            <button onClick={() => setFontSize(f => Math.max(10, f - 1))} style={{ background: "none", border: "none", color: T.subtle, cursor: "pointer", fontSize: "12px", fontFamily: "inherit", padding: "0 2px" }}>−</button>
            <span style={{ fontSize: "10px", color: T.subtle, minWidth: "22px", textAlign: "center" }}>{fontSize}</span>
            <button onClick={() => setFontSize(f => Math.min(22, f + 1))} style={{ background: "none", border: "none", color: T.subtle, cursor: "pointer", fontSize: "12px", fontFamily: "inherit", padding: "0 2px" }}>+</button>
          </div>

          {/* Theme */}
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
            background: "none", border: `1px solid ${T.border}`, borderRadius: "4px",
            padding: "4px 8px", cursor: "pointer", color: T.subtle, fontSize: "11px", fontFamily: "inherit",
          }}>{theme === "dark" ? "☀" : "☾"}</button>

          {/* Export */}
          <button onClick={exportCode} style={{
            background: "none", border: `1px solid ${T.border}`, borderRadius: "4px",
            padding: "4px 10px", cursor: "pointer", color: T.subtle, fontSize: "10px",
            fontFamily: "inherit", letterSpacing: "0.5px",
          }}>↓ EXPORT</button>

          {/* STDIN */}
          <button onClick={() => setShowStdin(s => !s)} style={{
            background: showStdin ? T.accentDim : "none",
            border: `1px solid ${showStdin ? T.accent : T.border}`,
            borderRadius: "4px", padding: "4px 10px", cursor: "pointer",
            color: showStdin ? T.accent : T.subtle, fontSize: "10px",
            fontFamily: "inherit", letterSpacing: "0.5px",
          }}>STDIN</button>

          {/* Run */}
          <button onClick={run} disabled={running} style={{
            padding: "5px 18px", borderRadius: "4px", border: "none",
            background: running ? T.muted : `linear-gradient(135deg, ${T.accent}, ${theme === "dark" ? "#00d4ff" : "#0044cc"})`,
            color: running ? T.subtle : (theme === "dark" ? "#000" : "#fff"),
            fontSize: "11px", fontWeight: "800",
            cursor: running ? "not-allowed" : "pointer",
            letterSpacing: "1.5px", fontFamily: "inherit", transition: "opacity 0.15s",
          }}>
            {running ? "◌ RUN" : "▶ RUN"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Editor pane */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.border}` }}>
          {/* File tab */}
          <div style={{
            background: T.panel, borderBottom: `1px solid ${T.border}`,
            padding: "5px 16px", fontSize: "10px", color: T.subtle,
            display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
          }}>
            <span style={{ color: lang?.color }}>{lang?.icon}</span>
            <span>main.{lang?.ext}</span>
            <span style={{ color: T.accent, fontSize: "8px" }}>●</span>
            <span style={{ marginLeft: "auto", fontSize: "9px", color: T.muted }}>Ctrl+Enter to run · Tab = 2 spaces</span>
          </div>

          {/* Code */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden", background: T.bg }}>
            <div ref={lineNumRef} style={{
              width: "48px", padding: `${fontSize * 1.1}px 8px ${fontSize * 1.1}px 0`,
              textAlign: "right", color: T.lineNum, fontSize: `${fontSize - 1}px`,
              lineHeight: `${fontSize * 1.6}px`, userSelect: "none",
              overflowY: "hidden", flexShrink: 0, borderRight: `1px solid ${T.border}`,
            }}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              onScroll={syncScroll}
              onKeyDown={handleKeyDown}
              onClick={updateCursor}
              onKeyUp={updateCursor}
              spellCheck={false}
              style={{
                flex: 1, padding: `${fontSize * 1.1}px 16px`,
                background: "transparent", border: "none", outline: "none",
                color: T.text, fontSize: `${fontSize}px`,
                lineHeight: `${fontSize * 1.6}px`,
                resize: "none", fontFamily: "inherit", tabSize: 2,
                caretColor: T.accent,
              }}
            />
          </div>

          {/* STDIN */}
          {showStdin && (
            <div style={{ borderTop: `1px solid ${T.border}`, background: T.panel, flexShrink: 0 }}>
              <div style={{ padding: "5px 16px", fontSize: "9px", color: T.subtle, letterSpacing: "1px", borderBottom: `1px solid ${T.border}` }}>STDIN</div>
              <textarea
                value={stdin}
                onChange={e => setStdin(e.target.value)}
                placeholder="Input for your program..."
                style={{
                  width: "100%", height: "72px", background: "transparent",
                  border: "none", outline: "none", color: T.text,
                  fontSize: `${fontSize - 1}px`, padding: "8px 16px",
                  resize: "none", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Status bar */}
          <div style={{
            background: lang?.color ? `${lang.color}18` : T.surface,
            borderTop: `1px solid ${T.border}`,
            padding: "3px 16px", fontSize: "9px", color: T.subtle,
            display: "flex", gap: "16px", letterSpacing: "0.5px", flexShrink: 0,
          }}>
            <span style={{ color: lang?.color }}>{lang?.label}</span>
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span>{lineCount} lines</span>
            <span style={{ marginLeft: "auto" }}>UTF-8 · No autosave</span>
          </div>
        </div>

        {/* Output pane */}
        <div style={{ width: "38%", minWidth: "260px", display: "flex", flexDirection: "column", background: T.panel }}>
          <div style={{
            padding: "5px 16px", background: T.surface, borderBottom: `1px solid ${T.border}`,
            fontSize: "9px", color: T.subtle, letterSpacing: "1px",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
          }}>
            <span>OUTPUT</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {execTime && <span style={{ color: T.muted }}>{execTime}s</span>}
              {output && (
                <span style={{ color: hasError ? T.error : T.accent }}>
                  {hasError ? `✗ ERR ${output.code}` : `✓ EXIT ${output.code}`}
                </span>
              )}
              {output && (
                <button onClick={copyOutput} style={{
                  background: "none", border: `1px solid ${T.border}`,
                  borderRadius: "3px", padding: "2px 7px", cursor: "pointer",
                  color: copied ? T.accent : T.subtle, fontSize: "9px",
                  fontFamily: "inherit", letterSpacing: "0.5px",
                }}>
                  {copied ? "✓ COPIED" : "COPY"}
                </button>
              )}
              {output && (
                <button onClick={() => { setOutput(null); setExecTime(null); }} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: T.muted, fontSize: "11px", fontFamily: "inherit",
                }}>✕</button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, padding: "16px", overflowY: "auto", fontSize: `${fontSize - 1}px`, lineHeight: "1.7" }}>
            {!output && !running && (
              <div style={{ color: T.muted, textAlign: "center", marginTop: "80px" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.5 }}>▶</div>
                <div style={{ fontSize: "11px", letterSpacing: "1px" }}>Press RUN or Ctrl+Enter</div>
              </div>
            )}

            {running && (
              <div style={{ textAlign: "center", marginTop: "80px" }}>
                <div style={{ fontSize: "28px", marginBottom: "14px", color: T.accent, animation: "spin 1.2s linear infinite", display: "inline-block" }}>◌</div>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: T.subtle }}>EXECUTING...</div>
              </div>
            )}

            {output && !running && (
              <>
                {output.stdout && (
                  <pre style={{
                    color: T.text, margin: 0, whiteSpace: "pre-wrap",
                    wordBreak: "break-word", fontFamily: "inherit", fontSize: `${fontSize - 1}px`,
                  }}>{output.stdout}</pre>
                )}
                {output.stderr && (
                  <pre style={{
                    color: T.error, margin: output.stdout ? "12px 0 0" : 0,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    fontFamily: "inherit", fontSize: `${fontSize - 1}px`,
                    padding: "10px 12px", background: T.errorDim, borderRadius: "4px",
                    borderLeft: `2px solid ${T.error}`,
                  }}>{output.stderr}</pre>
                )}
                {!output.stdout && !output.stderr && (
                  <div style={{ color: T.muted, fontStyle: "italic", fontSize: "11px" }}>Program exited with no output.</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        textarea::placeholder { color: ${T.muted}; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
