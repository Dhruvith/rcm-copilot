import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000";

// Simple markdown-to-JSX renderer
function MarkdownRenderer({ content }) {
    if (!content) return null;

    const lines = content.split("\n");
    const elements = [];
    let listItems = [];
    let listType = null;

    const flushList = () => {
        if (listItems.length > 0) {
            const Tag = listType === "ol" ? "ol" : "ul";
            elements.push(
                <Tag key={`list-${elements.length}`}>
                    {listItems.map((item, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
                    ))}
                </Tag>
            );
            listItems = [];
            listType = null;
        }
    };

    const inlineFormat = (text) => {
        return text
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/`(.+?)`/g, "<code>$1</code>");
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("### ")) {
            flushList();
            elements.push(<h3 key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed.slice(4)) }} />);
        } else if (trimmed.startsWith("## ")) {
            flushList();
            elements.push(<h2 key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed.slice(3)) }} />);
        } else if (trimmed.startsWith("# ")) {
            flushList();
            elements.push(<h1 key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed.slice(2)) }} />);
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            listType = "ul";
            listItems.push(trimmed.slice(2));
        } else if (/^\d+\.\s/.test(trimmed)) {
            listType = "ol";
            listItems.push(trimmed.replace(/^\d+\.\s/, ""));
        } else if (trimmed === "---") {
            flushList();
            elements.push(<hr key={i} />);
        } else if (trimmed.startsWith("> ")) {
            flushList();
            elements.push(<blockquote key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed.slice(2)) }} />);
        } else if (trimmed === "") {
            flushList();
        } else {
            flushList();
            elements.push(<p key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />);
        }
    });

    flushList();
    return <div className="markdown-content">{elements}</div>;
}

const EXAMPLE_CODES = ["CO-4", "PR-96", "CO-97", "CO-16", "OA-23", "CO-45", "PR-1", "CO-29", "PI-94", "CO-252"];

export default function DenialExplainer() {
    const [code, setCode] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (denialCode) => {
        const codeToUse = denialCode || code;
        if (!codeToUse.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axios.post(`${API_URL}/denial/explain`, {
                code: codeToUse,
            });
            setResult(response.data);
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                "Something went wrong. Please check your backend is running and your Groq API key is set."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleSubmit();
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>🔍 Denial Code Explainer</h2>
                <p>
                    Enter any insurance denial code and get an instant AI-powered
                    explanation with root causes, fix steps, and resubmission success
                    rates.
                </p>
            </div>

            {/* Input */}
            <div className="glass-card">
                <div className="input-group">
                    <input
                        id="denial-code-input"
                        type="text"
                        className="input-field"
                        placeholder="Enter denial code — e.g. CO-4, PR-96, CO-97"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                    />
                    <button
                        id="denial-explain-btn"
                        className="btn-primary"
                        onClick={() => handleSubmit()}
                        disabled={loading || !code.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                Analyzing...
                            </>
                        ) : (
                            <>🤖 Explain</>
                        )}
                    </button>
                </div>

                {/* Quick examples */}
                <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                        Try:
                    </span>
                    {EXAMPLE_CODES.map((c) => (
                        <button
                            key={c}
                            className="btn-secondary"
                            style={{ padding: "6px 14px", fontSize: "12px" }}
                            onClick={() => {
                                setCode(c);
                                handleSubmit(c);
                            }}
                            disabled={loading}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="error-message">
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="loading-container" style={{ marginTop: "24px" }}>
                    <div className="spinner" />
                    <div className="loading-text">
                        AI is analyzing denial code <strong>{code.toUpperCase()}</strong>...
                    </div>
                </div>
            )}

            {/* Result */}
            {result && !loading && (
                <div className="result-container animate-in">
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                        <span className="status-badge pass">✅ Analysis Complete</span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-accent)" }}>
                            {result.code}
                        </span>
                    </div>
                    <MarkdownRenderer content={result.explanation} />
                </div>
            )}
        </div>
    );
}
