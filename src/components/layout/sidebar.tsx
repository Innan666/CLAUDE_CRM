"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  FolderKanban,
  DollarSign,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  UserCog,
  Truck,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ListTodo,
  Sparkles,
  Handshake,
} from "lucide-react"
import { signOut } from "next-auth/react"

const navigation = [
  {
    section: "主要功能",
    items: [
      { name: "仪表盘", href: "/dashboard", icon: LayoutDashboard },
      { name: "客户管理", href: "/dashboard/customers", icon: Users },
      { name: "商机管理", href: "/dashboard/opportunities", icon: Target },
      { name: "合同管理", href: "/dashboard/contracts", icon: FileText },
      { name: "合作伙伴", href: "/dashboard/partners", icon: Handshake },
    ],
  },
  {
    section: "运营管理",
    items: [
      { name: "供应商管理", href: "/dashboard/suppliers", icon: Truck },
      { name: "项目管理", href: "/dashboard/projects", icon: FolderKanban },
      { name: "财务管理", href: "/dashboard/finance", icon: DollarSign },
      { name: "待办事项", href: "/dashboard/todos", icon: ListTodo },
      { name: "日历拜访", href: "/dashboard/calendar", icon: Calendar },
    ],
  },
  {
    section: "分析与工具",
    items: [
      { name: "统计报表", href: "/dashboard/reports", icon: BarChart3 },
      { name: "AI 助手", href: "/dashboard/chat", icon: MessageCircle },
    ],
  },
]

const bottomNav = [
  { name: "用户管理", href: "/dashboard/users", icon: UserCog },
  { name: "设置", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setCollapsed(JSON.parse(saved))
    }
  }, [])

  const toggleCollapse = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
  }

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/dashboard/"
      : pathname === href || pathname.startsWith(href + "/")

  return (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-300 ease-in-out relative",
        "bg-[#0f1729] text-slate-300",
        collapsed ? "w-16" : "w-64",
        "hidden md:flex"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-white/8 flex-shrink-0",
          collapsed ? "justify-center px-0" : "px-5"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-900/40">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-bold text-white truncate tracking-tight">中德智研AI</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">CRM 管理系统</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5 scrollbar-none">
        {navigation.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  {group.section}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg transition-all duration-150 text-sm font-medium",
                      collapsed ? "justify-center px-0 py-3 mx-0" : "px-3 py-2",
                      active
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                        : "text-slate-400 hover:bg-white/6 hover:text-slate-100"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "flex-shrink-0 transition-colors",
                        collapsed ? "w-[18px] h-[18px]" : "w-[17px] h-[17px]",
                        active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                    {active && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-4 border-t border-white/8 pt-4 space-y-0.5 flex-shrink-0">
        {!collapsed && (
          <div className="px-3 mb-1.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">系统</span>
          </div>
        )}
        {bottomNav.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all duration-150 text-sm font-medium",
                collapsed ? "justify-center px-0 py-3" : "px-3 py-2",
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-white/6 hover:text-slate-100"
              )}
            >
              <item.icon className="w-[17px] h-[17px] flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
        <button
          onClick={async () => {
            await signOut()
            if (typeof window !== "undefined") {
              window.location.href = `${window.location.origin}/login`
            }
          }}
          title={collapsed ? "退出登录" : undefined}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg transition-all duration-150 text-sm font-medium",
            "text-slate-400 hover:bg-red-500/10 hover:text-red-400",
            collapsed ? "justify-center px-0 py-3" : "px-3 py-2"
          )}
        >
          <LogOut className="w-[17px] h-[17px] flex-shrink-0" />
          {!collapsed && <span>退出登录</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        className="absolute top-[72px] -right-3 w-6 h-6 bg-[#1e2d4d] border border-white/10 rounded-full shadow-md flex items-center justify-center hover:bg-[#253860] transition-colors hidden md:flex z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-slate-400" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-slate-400" />
        )}
      </button>
    </div>
  )
}
