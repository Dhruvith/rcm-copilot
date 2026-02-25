import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function ClaimChecker() {
    const [form, setForm] = useState({
        icd_codes: "",
        cpt_code: "",
        modifiers: "",
        patient_gender: "",
        date_of_service: "",
        provider_npi: "",
        billed_amount: "",
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const payload = {
                icd_codes: form.icd_codes
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean),
                cpt_code: form.cpt_code.trim(),
                modifiers: form.modifiers
                    .split(",")
                    .map((m) => m.trim())
                    .filter(Boolean),
                patient_gender: form.patient_gender || null,
                date_of_service: form.date_of_service || null,
                provider_npi: form.provider_npi || null,
                billed_amount: form.billed_amount ? parseFloat(form.billed_amount) : null,
            };

            const response = await axios.post(`${API_URL}/claim/validate`, payload);
            setResult(response.data);
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                "Validation failed. Check your backend is running."
            );
        } finally {
            setLoading(false);
        }
    };

    const loadExample = () => {
        setForm({
            icd_codes: "J06.9, R05.9",
            cpt_code: "99213",
            modifiers: "25",
            patient_gender: "F",
            date_of_service: "2026-02-20",
            provider_npi: "1234567890",
            billed_amount: "150.00",
        });
        setResult(null);
        setError(null);
    };

    const statusIcon = (status) => {
        if (status === "PASS") return "✅";
        if (status === "FAIL") return "❌";
        return "⚠️";
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>✅ Claim Pre-Submission Checker</h2>
                <p>
                    Validate your claim before submission — catch ICD-10 errors, CPT
                    mismatches, missing modifiers, and other issues that cause denials.
                </p>
            </div>

            <div className="glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div className="glass-card-header" style={{ marginBottom: 0 }}>
                        <div className="glass-card-header-icon" style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)" }}>
                            📋
                        </div>
                        <h3>Claim Details</h3>
                    </div>
                    <button className="btn-secondary" onClick={loadExample} style={{ fontSize: "12px" }}>
                        📝 Load Example
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-field">
                            <label htmlFor="icd_codes">ICD-10 Diagnosis Codes *</label>
                            <input
                                id="icd_codes"
                                name="icd_codes"
                                className="input-field"
                                placeholder="e.g. J06.9, R05.9 (comma-separated)"
                                value={form.icd_codes}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="cpt_code">CPT Procedure Code *</label>
                            <input
                                id="cpt_code"
                                name="cpt_code"
                                className="input-field"
                                placeholder="e.g. 99213"
                                value={form.cpt_code}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="modifiers">Modifiers</label>
                            <input
                                id="modifiers"
                                name="modifiers"
                                className="input-field"
                                placeholder="e.g. 25, 59 (comma-separated)"
                                value={form.modifiers}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="patient_gender">Patient Gender</label>
                            <select
                                id="patient_gender"
                                name="patient_gender"
                                value={form.patient_gender}
                                onChange={handleChange}
                            >
                                <option value="">— Select —</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="date_of_service">Date of Service</label>
                            <input
                                id="date_of_service"
                                name="date_of_service"
                                type="date"
                                className="input-field"
                                value={form.date_of_service}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="provider_npi">Provider NPI</label>
                            <input
                                id="provider_npi"
                                name="provider_npi"
                                className="input-field"
                                placeholder="e.g. 1234567890"
                                value={form.provider_npi}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="billed_amount">Billed Amount ($)</label>
                            <input
                                id="billed_amount"
                                name="billed_amount"
                                type="number"
                                step="0.01"
                                className="input-field"
                                placeholder="e.g. 150.00"
                                value={form.billed_amount}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: "24px" }}>
                        <button
                            id="claim-validate-btn"
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !form.icd_codes || !form.cpt_code}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                    Validating...
                                </>
                            ) : (
                                <>⚡ Validate Claim</>
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
                    <div className="loading-text">Running validation rules...</div>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="result-container animate-in">
                    {/* Overall status */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                        <span className={`status-badge ${result.overall_status.toLowerCase()}`}>
                            {statusIcon(result.overall_status)} {result.overall_status === "PASS" ? "All Checks Passed" : result.overall_status === "WARN" ? "Warnings Found" : "Issues Detected"}
                        </span>
                    </div>

                    {/* Summary stats */}
                    <div className="summary-grid">
                        <div className="summary-stat">
                            <div className="summary-stat-value total">{result.summary.total_rules}</div>
                            <div className="summary-stat-label">Total Rules</div>
                        </div>
                        <div className="summary-stat">
                            <div className="summary-stat-value pass">{result.summary.passed}</div>
                            <div className="summary-stat-label">Passed</div>
                        </div>
                        <div className="summary-stat">
                            <div className="summary-stat-value fail">{result.summary.failed}</div>
                            <div className="summary-stat-label">Failed</div>
                        </div>
                        <div className="summary-stat">
                            <div className="summary-stat-value warn">{result.summary.warnings}</div>
                            <div className="summary-stat-label">Warnings</div>
                        </div>
                    </div>

                    {/* Individual rules */}
                    <div className="rules-list">
                        {result.results.map((rule, i) => (
                            <div key={i} className={`rule-item ${rule.status.toLowerCase()}`}>
                                <span className="rule-icon">{statusIcon(rule.status)}</span>
                                <div className="rule-content">
                                    <div className="rule-name">{rule.rule}</div>
                                    <div className="rule-message">{rule.message}</div>
                                    {rule.fix && <div className="rule-fix">💡 Fix: {rule.fix}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
