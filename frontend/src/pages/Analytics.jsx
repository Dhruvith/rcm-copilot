import { useState, useRef } from "react";
import axios from "axios";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

const API_URL = "/api";

const CHART_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#a78bfa",
    "#818cf8",
    "#7c3aed",
    "#c084fc",
    "#60a5fa",
    "#34d399",
    "#fbbf24",
    "#f87171",
];

// Simple markdown renderer (reuse the same pattern)
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

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div
                style={{
                    background: "rgba(17, 24, 39, 0.95)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    backdropFilter: "blur(10px)",
                }}
            >
                <p style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{label}</p>
                {payload.map((entry, idx) => (
                    <p key={idx} style={{ color: entry.color || "#818cf8", fontSize: 12 }}>
                        {entry.name}: <strong>{entry.value}</strong>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Analytics() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState(null);
    const fileRef = useRef(null);

    const uploadFile = async (file) => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResult(null);
        setFileName(file.name);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post(`${API_URL}/analytics/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setResult(response.data);
        } catch (err) {
            console.error("API Error:", err);
            setError(
                err.response?.data?.detail ||
                err.message ||
                "Upload failed. Ensure backend is running and file is valid."
            );
        }
        finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) uploadFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const downloadSampleCSV = () => {
        const csv = `denial_code,department,amount,date
CO-4,Cardiology,1250.00,2026-01-15
PR-96,Orthopedics,890.50,2026-01-18
CO-97,Cardiology,2100.00,2026-01-20
CO-16,Radiology,450.00,2026-01-22
CO-4,Emergency,1800.00,2026-01-25
PR-96,Cardiology,670.00,2026-01-28
OA-23,Orthopedics,980.00,2026-02-01
CO-45,Radiology,1500.00,2026-02-03
CO-4,Emergency,3200.00,2026-02-05
CO-97,Cardiology,1150.00,2026-02-08
PR-1,Orthopedics,420.00,2026-02-10
CO-4,Radiology,2800.00,2026-02-12
CO-16,Emergency,560.00,2026-02-14
PR-96,Cardiology,1340.00,2026-02-16
CO-29,Orthopedics,750.00,2026-02-18`;

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sample_denials.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📊 Denial Pattern Analytics</h2>
                <p>
                    Upload your denied claims CSV and get instant charts, trends, and an
                    AI-powered executive summary of your denial patterns.
                </p>
            </div>

            {/* Upload Zone */}
            {!result && !loading && (
                <div className="glass-card">
                    <div
                        className={`upload-zone ${dragOver ? "dragover" : ""}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileRef.current?.click()}
                    >
                        <div className="upload-zone-icon">📁</div>
                        <h3>Drop your CSV file here</h3>
                        <p>or click to browse — must have a 'denial_code' or 'code' column</p>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            style={{ display: "none" }}
                        />
                    </div>

                    <div style={{ marginTop: "16px", textAlign: "center" }}>
                        <button
                            className="btn-secondary"
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadSampleCSV();
                            }}
                            style={{ fontSize: "12px" }}
                        >
                            📥 Download Sample CSV
                        </button>
                    </div>
                </div>
            )}

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
                        Analyzing <strong>{fileName}</strong>...
                    </div>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="animate-in">
                    {/* Summary Stats */}
                    <div className="summary-grid" style={{ marginBottom: "24px" }}>
                        <div className="summary-stat">
                            <div className="summary-stat-value total">{result.total_denials}</div>
                            <div className="summary-stat-label">Total Denials</div>
                        </div>
                        <div className="summary-stat">
                            <div className="summary-stat-value" style={{ color: "var(--warning)" }}>
                                {result.unique_codes}
                            </div>
                            <div className="summary-stat-label">Unique Codes</div>
                        </div>
                        {result.financial_impact?.total_denied_amount && (
                            <div className="summary-stat">
                                <div className="summary-stat-value fail">
                                    ${result.financial_impact.total_denied_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="summary-stat-label">Total Denied</div>
                            </div>
                        )}
                        {result.financial_impact?.average_denial_amount && (
                            <div className="summary-stat">
                                <div className="summary-stat-value" style={{ color: "var(--info)" }}>
                                    ${result.financial_impact.average_denial_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="summary-stat-label">Avg Denial</div>
                            </div>
                        )}
                    </div>

                    {/* Charts */}
                    <div className="charts-grid">
                        {/* Bar Chart — Top Denial Codes */}
                        {result.top_denial_codes?.length > 0 && (
                            <div className="chart-card">
                                <h4>🏷️ Top Denial Codes</h4>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={result.top_denial_codes} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis
                                            dataKey="code"
                                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                                        />
                                        <YAxis
                                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" name="Denials" radius={[6, 6, 0, 0]}>
                                            {result.top_denial_codes.map((_, index) => (
                                                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Pie Chart — Department Breakdown */}
                        {result.department_breakdown?.length > 0 && (
                            <div className="chart-card">
                                <h4>🏥 Denials by Department</h4>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={result.department_breakdown}
                                            dataKey="denial_count"
                                            nameKey="department"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            innerRadius={50}
                                            paddingAngle={3}
                                            label={({ department, denial_count }) => `${department} (${denial_count})`}
                                        >
                                            {result.department_breakdown.map((_, index) => (
                                                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* AI Summary */}
                    {result.ai_summary && (
                        <div className="result-container" style={{ marginTop: "24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                                <span className="status-badge pass">🤖 AI Executive Summary</span>
                            </div>
                            <MarkdownRenderer content={result.ai_summary} />
                        </div>
                    )}

                    {/* Upload another */}
                    <div style={{ marginTop: "24px", textAlign: "center" }}>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                setResult(null);
                                setFileName(null);
                                setError(null);
                            }}
                        >
                            📁 Upload Another CSV
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
