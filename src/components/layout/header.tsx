"use client"

import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import { Bell, Search, Settings, LogOut, Menu, ChevronDown, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
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
  UserCog,
  Truck,
  MessageCircle,
  ListTodo,
} from "lucide-react"

const mobileNavigation = [
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

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(/\s+/)
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  return email?.slice(0, 2).toUpperCase() ?? "U"
}

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const initials = getInitials(session?.user?.name, session?.user?.email)
  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "用户"

  const handleLogout = async () => {
    await signOut()
    if (typeof window !== "undefined") {
      window.location.href = `${window.location.origin}/login`
    } else {
      router.push("/login")
    }
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-gray-100 shadow-[0_1px_0_0_#f0f2f5] flex-shrink-0">
      {/* Mobile menu */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-[#0f1729] border-white/10">
            <div className="flex flex-col h-full text-slate-300">
              <div className="flex items-center gap-3 h-16 px-5 border-b border-white/8">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-white">中德智研AI</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">CRM 管理系统</div>
                </div>
              </div>
              <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
                {mobileNavigation.map((item) => {
                  const active =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        active
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:bg-white/6 hover:text-slate-100"
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
              <div className="border-t border-white/8 px-2 py-4 space-y-0.5">
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800">中德智研AI</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center flex-1 max-w-sm hidden md:flex">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="搜索..."
            className="pl-9 pr-12 h-9 bg-gray-50 border-gray-200 focus:bg-white text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-indigo-300"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 select-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 ml-4">
        {/* Notification */}
        <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-[11px] font-bold leading-none">{initials}</span>
              </div>
              <span className="text-sm font-medium text-gray-700 hidden lg:block max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden lg:block transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 shadow-lg shadow-black/10">
            <DropdownMenuLabel className="font-normal pb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{initials}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-gray-900 truncate">
                    {session?.user?.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {session?.user?.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/users")} className="gap-2 cursor-pointer">
              <Settings className="h-4 w-4 text-gray-400" />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
              <LogOut className="h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
