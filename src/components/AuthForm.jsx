import { useState } from "react";
import { useAuth } from "../AuthContext";

export default function AuthForm() {
  const { user, signUp, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        await signUp(email, password);
        alert("Check your email for confirmation link (if enabled).");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      alert(err.message || "Auth error");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="p-4">
        <div>Signed in as: {user.email}</div>
        <button onClick={() => signOut()} className="mt-2 btn">Sign out</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="p-4 space-y-3">
      <h2 className="text-xl font-semibold">{isSignup ? "Create account" : "Sign in"}</h2>
      <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <div className="flex gap-2">
        <button disabled={loading} className="btn" type="submit">{loading ? "Working..." : isSignup ? "Sign up" : "Sign in"}</button>
        <button type="button" onClick={() => setIsSignup(s => !s)} className="btn-outline">
          {isSignup ? "Have an account? Sign in" : "Create account"}
        </button>
      </div>
    </form>
  );
}
