import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("agentToken")) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch('https://nexorabackend-eb0p.onrender.com/api/auth/agent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('agentToken', data.token);
        localStorage.setItem('agentUser', JSON.stringify(data.user));
        navigate("/dashboard", { replace: true });
      } else {
        const serverMsg =
          data.message ||
          (Array.isArray(data.errors) && data.errors[0]?.msg) ||
          'Login failed';
        setError(serverMsg);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span
            style={{
              width: 44, height: 44, display: 'grid', placeItems: 'center',
              background: '#0A2E1F', color: '#fff', borderRadius: 12,
              fontSize: 22, fontWeight: 900,
            }}
          >
            N
          </span>
          <span className="login-name">
            Nexora <em>AGENT</em>
          </span>
        </div>

        <h1 className="login-title">Welcome back, Agent</h1>
        <p className="login-sub">Sign in to review deposits, withdrawals and user tiers.</p>

        {error && <p className="login-error">{error}</p>}

        <div className="login-field">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="agent@nexora.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Password</label>
          <div className="login-passwrap">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="login-show"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button className="login-btn" type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {isLoading ? "Signing in…" : "Sign In"}
        </button>

        <p className="login-note">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Agent access only. Your credentials are created by the administrator —
            contact admin if you need access or forgot your password.
          </span>
        </p>
      </form>
    </div>
  );
};

export default Login;
