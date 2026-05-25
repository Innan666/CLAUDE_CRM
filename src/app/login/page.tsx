"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("邮箱或密码错误，请重试")
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("登录失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#060d1f]">
      {/* Background glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-indigo-500/8 blur-[80px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Left branding panel - desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 relative z-10 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg tracking-tight leading-none">中德智研AI</div>
            <div className="text-slate-500 text-xs mt-0.5">CRM 管理系统</div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              销售 · 项目 · 财务
              <br />
              <span className="text-transparent bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text">
                一体化智能管理
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              让 AI 赋能您的销售流程，从客户管理到财务结算，全链路智能协同。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { num: "12+", label: "核心业务模块" },
              { num: "AI", label: "智能分析助手" },
              { num: "100%", label: "数据安全隔离" },
              { num: "∞", label: "团队协作支持" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/4 border border-white/8 rounded-xl p-4 backdrop-blur-sm"
              >
                <div className="text-2xl font-bold text-white">{item.num}</div>
                <div className="text-sm text-slate-400 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">© 2024 中德智研AI · 保留所有权利</p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none">中德智研AI</div>
              <div className="text-slate-500 text-xs mt-0.5">CRM 管理系统</div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-black/40">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white tracking-tight">欢迎回来</h1>
              <p className="text-slate-400 text-sm mt-1.5">登录您的账号以继续</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                  邮箱地址
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@demo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 login-input"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderColor: "rgba(255,255,255,0.15)",
                    color: "white",
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                  密码
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl pr-11 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 login-input"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.08)",
                      borderColor: "rgba(255,255,255,0.15)",
                      color: "white",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl border-0 shadow-lg shadow-indigo-900/40 transition-all duration-200 mt-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    登录中...
                  </span>
                ) : (
                  "登 录"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/8">
              <p className="text-xs text-slate-500 text-center">
                演示账号：admin@demo.com · password123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
