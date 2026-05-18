"use client"

import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import { User, Bell, Search, Settings, LogOut, Menu, X } from "lucide-react"
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
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

const mobileNavigation = [
  { name: "仪表盘", href: "/dashboard", icon: null },
  { name: "客户管理", href: "/dashboard/customers", icon: null },
  { name: "商机管理", href: "/dashboard/opportunities", icon: null },
  { name: "合同管理", href: "/dashboard/contracts", icon: null },
  { name: "供应商管理", href: "/dashboard/suppliers", icon: null },
  { name: "项目管理", href: "/dashboard/projects", icon: null },
  { name: "财务管理", href: "/dashboard/finance", icon: null },
  { name: "待办事项", href: "/dashboard/todos", icon: null },
  { name: "日历拜访", href: "/dashboard/calendar", icon: null },
  { name: "统计报表", href: "/dashboard/reports", icon: null },
  { name: "AI 助手", href: "/dashboard/chat", icon: null },
  { name: "用户管理", href: "/dashboard/users", icon: null },
]

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    if (typeof window !== 'undefined') {
      window.location.href = `${window.location.origin}/login`
    } else {
      router.push('/login')
    }
  }

  const handleProfile = () => {
    router.push("/dashboard/users")
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b">
      {/* 移动端菜单按钮 */}
      <div className="flex items-center md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <div className="flex flex-col h-full">
              <div className="flex items-center h-14 border-b">
                <h1 className="text-lg font-bold text-primary">中德智研AI</h1>
              </div>
              <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
                {mobileNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="border-t py-4 space-y-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  设置
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                >
                  退出登录
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="ml-2 text-lg font-bold text-primary md:hidden">中德智研AI</h1>
      </div>

      <div className="flex items-center flex-1">
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="全局搜索..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{session?.user?.name || session?.user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{session?.user?.name}</span>
                <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfile}>
              <Settings className="mr-2 h-4 w-4" />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
