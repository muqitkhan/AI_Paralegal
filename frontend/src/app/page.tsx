"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, Shield, Brain, FileText, Clock, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/store";
import toast from "react-hot-toast";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        const res = await api.register(email, name, password);
        login(res.user);
        toast.success("Account created successfully!");
      } else {
        const res = await api.login(email, password);
        login(res.user);
        toast.success("Welcome back!");
      }
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      <div className="flex flex-1">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <Scale className="h-10 w-10 text-blue-400" />
            <h1 className="text-4xl font-semibold tracking-tight">AI Paralegal</h1>
          </div>
          <p className="text-xl text-blue-200 mb-12 leading-relaxed max-w-xl">
            Automate your legal practice with AI-powered tools built for modern firms.
          </p>

          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: FileText, title: "Document Drafting", desc: "Auto-generate contracts and legal documents" },
              { icon: Users, title: "Client Management", desc: "Streamlined intake and case tracking" },
              { icon: Brain, title: "Legal Research", desc: "AI-powered case law analysis" },
              { icon: Clock, title: "Billing & Time", desc: "Automatic time tracking and invoicing" },
              { icon: Shield, title: "Document Review", desc: "AI risk analysis and clause extraction" },
              { icon: Scale, title: "Deadline Tracking", desc: "Never miss a filing deadline" },
            ].map((feature, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <feature.icon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-sm">{feature.title}</h3>
                  <p className="text-xs text-blue-300 mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Login/Register */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-white/40">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
                <Scale className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-semibold tracking-tight text-slate-800">AI Paralegal</h1>
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-slate-800 mb-2">
                {isRegister ? "Create an account" : "Welcome back"}
              </h2>
              <p className="text-slate-500 mb-8">
                {isRegister
                  ? "Sign up to get started with your legal dashboard"
                  : "Sign in to your legal practice dashboard"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-slate-700"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@lawfirm.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-slate-700"
                />
              </div>

              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-slate-700"
                  />
                </div>
              )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Please wait..."
                    : isRegister
                    ? "Create Account"
                    : "Sign In"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {isRegister
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Create one"}
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  By signing in, you agree to our Terms of Service and Privacy Policy.
                  <br />
                  Your data is encrypted and secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer dark className="mt-auto" />
    </div>
  );
}
