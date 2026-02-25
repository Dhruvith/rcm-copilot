import { useState } from "react";
import DenialExplainer from "./pages/DenialExplainer.jsx";
import ClaimChecker from "./pages/ClaimChecker.jsx";

import LetterGenerator from "./pages/LetterGenerator.jsx";

const NAV_ITEMS = [
    { id: "home", label: "Dashboard", icon: "🏠", section: "main" },
    { id: "denial", label: "Denial Explainer", icon: "🔍", section: "main", badge: "AI" },
    { id: "claim", label: "Claim Checker", icon: "✅", section: "main" },

    { id: "letter", label: "Appeal Letters", icon: "📝", section: "main", badge: "AI" },
];

function HomePage({ onNavigate }) {
    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Welcome to RCM Copilot</h2>
                <p>
                    Your AI-powered claim assistant — instantly explain denial codes,
                    validate claims, analyze patterns, and generate appeal letters.
                </p>
            </div>

            {/* Stats row */}
            <div className="summary-grid" style={{ marginBottom: "32px" }}>
                <div className="summary-stat">
                    <div className="summary-stat-value total">$262B</div>
                    <div className="summary-stat-label">Annual Denials (US)</div>
                </div>
                <div className="summary-stat">
                    <div className="summary-stat-value fail">65%</div>
                    <div className="summary-stat-label">Never Appealed</div>
                </div>
                <div className="summary-stat">
                    <div className="summary-stat-value pass">73%</div>
                    <div className="summary-stat-label">Appeal Win Rate</div>
                </div>
                <div className="summary-stat">
                    <div className="summary-stat-value" style={{ color: "var(--warning)" }}>5 days</div>
                    <div className="summary-stat-label">Avg Resolution</div>
                </div>
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "12px" }}>
                Quick Actions
            </h3>

            <div className="features-grid">
                <div className="feature-card" onClick={() => onNavigate("denial")}>
                    <div className="feature-card-icon">🔍</div>
                    <h3>Denial Code Explainer</h3>
                    <p>
                        Enter any denial code (CO-4, PR-96, etc.) and get an instant
                        AI-powered explanation with fix steps and success rates.
                    </p>
                    <span className="feature-card-arrow">→</span>
                </div>

                <div className="feature-card" onClick={() => onNavigate("claim")}>
                    <div className="feature-card-icon">✅</div>
                    <h3>Claim Pre-Submission Checker</h3>
                    <p>
                        Validate ICD-10 codes, CPT codes, modifiers, NPI, and more
                        before submitting — catch issues before they become denials.
                    </p>
                    <span className="feature-card-arrow">→</span>
                </div>


                <div className="feature-card" onClick={() => onNavigate("letter")}>
                    <div className="feature-card-icon">📝</div>
                    <h3>Appeal Letter Generator</h3>
                    <p>
                        One-click professional appeal letters powered by AI — ready to
                        send to the insurance company with all the right language.
                    </p>
                    <span className="feature-card-arrow">→</span>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const [activePage, setActivePage] = useState("home");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navigate = (pageId) => {
        setActivePage(pageId);
        setSidebarOpen(false);
    };

    const renderPage = () => {
        switch (activePage) {
            case "denial":
                return <DenialExplainer />;
            case "claim":
                return <ClaimChecker />;
            case "letter":
                return <LetterGenerator />;
            default:
                return <HomePage onNavigate={navigate} />;
        }
    };

    return (
        <div className="app-container">
            {/* Mobile toggle */}
            <button
                className="mobile-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                ☰
            </button>

            {/* Overlay */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay active"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🏥</div>
                    <div className="sidebar-logo-text">
                        <h1>RCM Copilot</h1>
                        <span>AI Claim Assistant</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-label">Navigation</div>
                    {NAV_ITEMS.map((item) => (
                        <div
                            key={item.id}
                            className={`nav-item ${activePage === item.id ? "active" : ""}`}
                            onClick={() => navigate(item.id)}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            <span>{item.label}</span>
                            {item.badge && (
                                <span className="nav-item-badge">{item.badge}</span>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <p>Powered by Groq + LLaMA 3</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">{renderPage()}</main>
        </div>
    );
}
