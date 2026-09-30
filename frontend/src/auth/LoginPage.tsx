import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, currentUser } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        navigate("/admin/policies", { replace: true });
      } else {
        navigate("/app/dashboard", { replace: true });
      }
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signIn(email, password);
      // AuthContext will update currentUser and redirect via useEffect
    } catch (err: any) {
      console.error("Login failure:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password. For local demo, run the seed script first.");
      } else {
        setError(err.message || "Failed to authenticate. Ensure the Firebase Auth Emulator is running.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(circle at 50% 20%, #172554 0%, #090d16 70%)",
      }}
    >
      <div
        className="card-glass"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "36px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 16px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 25px rgba(59, 130, 246, 0.4)",
            }}
          >
            <Shield size={30} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            SOC Agent
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "6px" }}>
            Continuous Compliance & Security Release Gate
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fb7185",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "20px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Work Email
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="email-input"
                type="email"
                className="form-input"
                style={{ width: "100%", paddingLeft: "38px" }}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail
                size={18}
                color="#64748b"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "24px" }}>
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password-input"
                type="password"
                className="form-input"
                style={{ width: "100%", paddingLeft: "38px" }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock
                size={18}
                color="#64748b"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-button"
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: "0.95rem" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Authenticating..." : "Sign In to Organization"}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <Sparkles size={14} color="#38bdf8" />
            <span>Local Emulator Demo Accounts</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillCredentials("admin@socagent.local")}
            >
              Admin Demo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillCredentials("user@socagent.local")}
            >
              Member Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
