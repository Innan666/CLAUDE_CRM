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
} from "lucide-react"
import { signOut } from "next-auth/react"

const navigation = [
  { name: "仪表盘", href: "/dashboard", icon: LayoutDashboard },
  { name: "客户管理", href: "/dashboard/customers", icon: Users },
  { name: "商机管理", href: "/dashboard/opportunities", icon: Target },
  { name: "合同管理", href: "/dashboard/contracts", icon: FileText },
  { name: "供应商管理", href: "/dashboard/suppliers", icon: Truck },
  { name: "项目管理", href: "/dashboard/projects", icon: FolderKanban },
  { name: "财务管理", href: "/dashboard/finance", icon: DollarSign },
  { name: "待办事项", href: "/dashboard/todos", icon: ListTodo },
  { name: "日历拜访", href: "/dashboard/calendar", icon: Calendar },
  { name: "统计报表", href: "/dashboard/reports", icon: BarChart3 },
  { name: "AI 助手", href: "/dashboard/chat", icon: MessageCircle },
  { name: "用户管理", href: "/dashboard/users", icon: UserCog },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // 从 localStorage 读取折叠状态
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setCollapsed(JSON.parse(saved))
    }
  }, [])

  // 保存折叠状态到 localStorage
  const toggleCollapse = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r transition-all duration-300 relative",
      collapsed ? "w-16" : "w-64",
      // 移动端隐藏侧边栏
      "hidden md:flex"
    )}>
      <div className={cn("flex items-center h-16 border-b", collapsed ? "justify-center px-2" : "px-6")}>
        {!collapsed && <h1 className="text-xl font-bold text-primary">中德智研AI</h1>}
        {collapsed && <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">AI</div>}
      </div>

      <nav className={cn("flex-1 py-4 space-y-1", collapsed ? "px-2" : "px-4")}>
        {navigation.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard" || pathname === "/dashboard/"
            : pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100",
                collapsed ? "justify-center px-2 py-3" : "px-3 py-2 text-sm font-medium"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("w-5 h-5", collapsed ? "" : "mr-3")} />
              {!collapsed && item.name}
            </Link>
          )
        })}
      </nav>

      <div className={cn("border-t", collapsed ? "px-2 py-4 space-y-2" : "p-4")}>
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center rounded-md text-gray-700 hover:bg-gray-100",
            collapsed ? "justify-center px-2 py-3" : "px-3 py-2 text-sm font-medium"
          )}
          title={collapsed ? "设置" : undefined}
        >
          <Settings className={cn("w-5 h-5", collapsed ? "" : "mr-3")} />
          {!collapsed && "设置"}
        </Link>
        <button
          onClick={async () => {
            await signOut()
            if (typeof window !== 'undefined') {
              window.location.href = `${window.location.origin}/login`
            }
          }}
          className={cn(
            "flex items-center w-full rounded-md text-gray-700 hover:bg-gray-100",
            collapsed ? "justify-center px-2 py-3" : "px-3 py-2 mt-1 text-sm font-medium"
          )}
          title={collapsed ? "退出登录" : undefined}
        >
          <LogOut className={cn("w-5 h-5", collapsed ? "" : "mr-3")} />
          {!collapsed && "退出登录"}
        </button>
      </div>

      {/* 折叠按钮 - 移动端隐藏 */}
      <button
        onClick={toggleCollapse}
        className="absolute top-20 -right-3 w-6 h-6 bg-white border rounded-full shadow-sm flex items-center justify-center hover:bg-gray-100 hidden md:flex"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  )
}
