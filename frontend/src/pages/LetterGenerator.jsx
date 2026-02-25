import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000";

// Simple markdown renderer
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

export default function LetterGenerator() {
    const [form, setForm] = useState({
        code: "",
        patient_name: "",
        claim_number: "",
        insurance_company: "",
        provider_name: "",
        date_of_service: "",
        additional_context: "",
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.code.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const payload = {
                code: form.code.trim(),
                patient_name: form.patient_name || "[Patient Name]",
                claim_number: form.claim_number || "[Claim Number]",
                insurance_company: form.insurance_company || "[Insurance Company]",
                provider_name: form.provider_name || "[Provider Name]",
                date_of_service: form.date_of_service || "[Date of Service]",
                additional_context: form.additional_context || "",
            };

            const response = await axios.post(`${API_URL}/denial/appeal-letter`, payload);
            setResult(response.data);
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                "Something went wrong. Check your backend is running and Groq API key is set."
            );
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (result?.letter) {
            navigator.clipboard.writeText(result.letter);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadLetter = () => {
        if (!result?.letter) return;
        const blob = new Blob([result.letter], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `appeal_letter_${result.code || "denial"}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const loadExample = () => {
        setForm({
            code: "CO-4",
            patient_name: "Sarah Johnson",
            claim_number: "CLM-2026-00847",
            insurance_company: "Blue Cross Blue Shield",
            provider_name: "Dr. Michael Chen, MD - Valley Medical Group",
            date_of_service: "2026-02-15",
            additional_context:
                "Patient underwent a medically necessary procedure. All prior authorization was obtained. Supporting documentation including medical records and physician notes are attached.",
        });
        setResult(null);
        setError(null);
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📝 Appeal Letter Generator</h2>
                <p>
                    Generate a professional, ready-to-send appeal letter for any denied claim —
                    powered by AI with all the right medical billing language.
                </p>
            </div>

            <div className="glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div className="glass-card-header" style={{ marginBottom: 0 }}>
                        <div
                            className="glass-card-header-icon"
                            style={{
                                background: "var(--info-bg)",
                                border: "1px solid rgba(96, 165, 250, 0.3)",
                            }}
                        >
                            ✉️
                        </div>
                        <h3>Appeal Details</h3>
                    </div>
                    <button className="btn-secondary" onClick={loadExample} style={{ fontSize: "12px" }}>
                        📝 Load Example
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-field">
                            <label htmlFor="appeal-code">Denial Code *</label>
                            <input
                                id="appeal-code"
                                name="code"
                                className="input-field"
                                placeholder="e.g. CO-4, PR-96"
                                value={form.code}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="patient_name">Patient Name</label>
                            <input
                                id="patient_name"
                                name="patient_name"
                                className="input-field"
                                placeholder="e.g. John Doe"
                                value={form.patient_name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="claim_number">Claim Number</label>
                            <input
                                id="claim_number"
                                name="claim_number"
                                className="input-field"
                                placeholder="e.g. CLM-2026-00847"
                                value={form.claim_number}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="insurance_company">Insurance Company</label>
                            <input
                                id="insurance_company"
                                name="insurance_company"
                                className="input-field"
                                placeholder="e.g. Blue Cross Blue Shield"
                                value={form.insurance_company}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="provider_name">Provider / Facility</label>
                            <input
                                id="provider_name"
                                name="provider_name"
                                className="input-field"
                                placeholder="e.g. Dr. Smith, MD"
                                value={form.provider_name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="appeal-dos">Date of Service</label>
                            <input
                                id="appeal-dos"
                                name="date_of_service"
                                type="date"
                                className="input-field"
                                value={form.date_of_service}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-field" style={{ marginTop: "16px" }}>
                        <label htmlFor="additional_context">Additional Context / Notes</label>
                        <textarea
                            id="additional_context"
                            name="additional_context"
                            className="input-field"
                            placeholder="Any additional details about the claim, medical necessity, prior authorizations, etc."
                            value={form.additional_context}
                            onChange={handleChange}
                            rows={3}
                            style={{ resize: "vertical", minHeight: "80px" }}
                        />
                    </div>

                    <div style={{ marginTop: "24px" }}>
                        <button
                            id="appeal-generate-btn"
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !form.code.trim()}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                    Generating...
                                </>
                            ) : (
                                <>🤖 Generate Appeal Letter</>
                            )}
                        </button>
                    </div>
                </form>
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
                        AI is crafting your appeal letter for <strong>{form.code.toUpperCase()}</strong>...
                    </div>
                </div>
            )}

            {/* Result */}
            {result && !loading && (
                <div className="result-container animate-in">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span className="status-badge pass">✅ Letter Generated</span>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-accent)" }}>
                                {result.code}
                            </span>
                        </div>

                        <div className="letter-actions">
                            <button className="btn-secondary" onClick={copyToClipboard} style={{ fontSize: "12px" }}>
                                {copied ? "✅ Copied!" : "📋 Copy"}
                            </button>
                            <button className="btn-secondary" onClick={downloadLetter} style={{ fontSize: "12px" }}>
                                📥 Download .md
                            </button>
                        </div>
                    </div>

                    <MarkdownRenderer content={result.letter} />
                </div>
            )}
        </div>
    );
}
