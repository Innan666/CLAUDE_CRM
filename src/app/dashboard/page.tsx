import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DollarSign,
  Users,
  FolderKanban,
  Calendar,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { format } from "date-fns"

async function getKPIs(teamId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const totalContractAmount = await prisma.contract.aggregate({
    where: { teamId, status: { in: ["SIGNED", "ACTIVE", "COMPLETED"] } },
    _sum: { amount: true },
  })

  const monthContractAmount = await prisma.contract.aggregate({
    where: {
      teamId,
      status: { in: ["SIGNED", "ACTIVE"] },
      startDate: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
  })

  const overduePayments = await prisma.payment.findMany({
    where: { teamId, status: "PENDING", paymentDate: { lt: now } },
    include: { invoice: true, contract: true },
  })
  const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0)

  const activeProjects = await prisma.project.count({
    where: { teamId, status: "IN_PROGRESS" },
  })

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const todayVisits = await prisma.visit.count({
    where: {
      teamId,
      startTime: { gte: today, lt: tomorrow },
      status: { in: ["PLANNED", "IN_PROGRESS"] },
    },
  })

  const totalCustomers = await prisma.customer.count({ where: { teamId } })

  return {
    totalContractAmount: totalContractAmount._sum.amount || 0,
    monthReceivables: monthContractAmount._sum.amount || 0,
    overdueAmount,
    activeProjects,
    todayVisits,
    totalCustomers,
  }
}

async function getRecentVisits(teamId: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  return await prisma.visit.findMany({
    where: {
      teamId,
      startTime: { gte: today, lt: tomorrow },
      status: { in: ["PLANNED", "IN_PROGRESS"] },
    },
    include: { customer: true },
    orderBy: { startTime: "asc" },
    take: 5,
  })
}

async function getOverduePayments(teamId: string) {
  const now = new Date()
  return await prisma.payment.findMany({
    where: { teamId, status: "PENDING", paymentDate: { lt: now } },
    include: { invoice: true, contract: { include: { customer: true } } },
    orderBy: { paymentDate: "asc" },
    take: 5,
  })
}

async function getProjectStatusDistribution(teamId: string) {
  return await prisma.project.groupBy({
    by: ["status"],
    where: { teamId },
    _count: { id: true },
  })
}

const kpiConfig = [
  {
    key: "totalContractAmount",
    label: "总合同金额",
    icon: DollarSign,
    format: (v: number) => `¥${v.toLocaleString()}`,
    color: "blue",
    bgClass: "bg-blue-50",
    iconClass: "text-blue-600",
    trend: "+8.2%",
    trendLabel: "较上月",
  },
  {
    key: "monthReceivables",
    label: "本月应收",
    icon: TrendingUp,
    format: (v: number) => `¥${v.toLocaleString()}`,
    color: "emerald",
    bgClass: "bg-emerald-50",
    iconClass: "text-emerald-600",
    trend: "+12.5%",
    trendLabel: "较上月",
  },
  {
    key: "overdueAmount",
    label: "逾期金额",
    icon: AlertCircle,
    format: (v: number) => `¥${v.toLocaleString()}`,
    color: "red",
    bgClass: "bg-red-50",
    iconClass: "text-red-500",
    trend: null,
    trendLabel: "需关注",
    alert: true,
  },
  {
    key: "activeProjects",
    label: "进行中项目",
    icon: FolderKanban,
    format: (v: number) => `${v}`,
    color: "violet",
    bgClass: "bg-violet-50",
    iconClass: "text-violet-600",
    trend: null,
    trendLabel: "个项目",
  },
  {
    key: "totalCustomers",
    label: "客户总数",
    icon: Users,
    format: (v: number) => `${v}`,
    color: "orange",
    bgClass: "bg-orange-50",
    iconClass: "text-orange-600",
    trend: null,
    trendLabel: "家客户",
  },
  {
    key: "todayVisits",
    label: "今日拜访",
    icon: Calendar,
    format: (v: number) => `${v}`,
    color: "sky",
    bgClass: "bg-sky-50",
    iconClass: "text-sky-600",
    trend: null,
    trendLabel: "次安排",
  },
]

const statusConfig: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  PLANNING:    { label: "规划中", dotClass: "bg-blue-500",    badgeClass: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "进行中", dotClass: "bg-emerald-500", badgeClass: "bg-emerald-100 text-emerald-700" },
  ON_HOLD:     { label: "暂停",   dotClass: "bg-amber-500",   badgeClass: "bg-amber-100 text-amber-700" },
  COMPLETED:   { label: "已完成", dotClass: "bg-gray-400",    badgeClass: "bg-gray-100 text-gray-600" },
  CANCELLED:   { label: "已取消", dotClass: "bg-red-500",     badgeClass: "bg-red-100 text-red-700" },
}

export default async function DashboardPage() {
  const session = await auth()
  const teamId = session?.user?.teamId

  if (!teamId) {
    return <div>加载中...</div>
  }

  const [kpis, recentVisits, overduePayments, projectDistribution] = await Promise.all([
    getKPIs(teamId),
    getRecentVisits(teamId),
    getOverduePayments(teamId),
    getProjectStatusDistribution(teamId),
  ])

  const kpiValues: Record<string, number> = {
    totalContractAmount: kpis.totalContractAmount,
    monthReceivables: kpis.monthReceivables,
    overdueAmount: kpis.overdueAmount,
    activeProjects: kpis.activeProjects,
    totalCustomers: kpis.totalCustomers,
    todayVisits: kpis.todayVisits,
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">仪表盘</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            欢迎回来，
            <span className="font-medium text-gray-700">{session?.user?.name}</span>
            &nbsp;· 今天是{new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>
        <Link
          href="/dashboard/reports"
          className="hidden md:flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          查看全部报表
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiConfig.map((config) => {
          const value = kpiValues[config.key] ?? 0
          const Icon = config.icon
          return (
            <Card
              key={config.key}
              className="relative overflow-hidden border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 col-span-1"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground truncate">{config.label}</p>
                    <p
                      className={`text-xl font-bold mt-1.5 tracking-tight leading-none ${
                        config.alert && value > 0 ? "text-red-600" : "text-gray-900"
                      }`}
                    >
                      {config.format(value)}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {config.trend ? (
                        <>
                          <ArrowUpRight className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          <span className="text-[11px] text-emerald-600 font-medium">{config.trend}</span>
                          <span className="text-[11px] text-muted-foreground">{config.trendLabel}</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">{config.trendLabel}</span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`w-9 h-9 rounded-xl ${config.bgClass} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${config.iconClass}`} style={{ width: 18, height: 18 }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Visits */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <CardTitle className="text-base font-semibold text-gray-900">今日拜访</CardTitle>
              </div>
              <Link
                href="/dashboard/calendar"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                全部 <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {recentVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-muted-foreground">今日暂无拜访计划</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentVisits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/dashboard/visits/${visit.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{visit.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{visit.customer.name}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-semibold text-gray-700">{format(visit.startTime, "HH:mm")}</p>
                      <Badge
                        variant={visit.status === "IN_PROGRESS" ? "warning" : "secondary"}
                        className="text-[10px] mt-0.5"
                      >
                        {visit.status === "IN_PROGRESS" ? "进行中" : "计划中"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Payments */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                </div>
                <CardTitle className="text-base font-semibold text-gray-900">逾期账款</CardTitle>
              </div>
              <Link
                href="/dashboard/finance"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                全部 <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {overduePayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">暂无逾期账款</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overduePayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-red-100 bg-red-50/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {payment.contract?.customer?.name || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {payment.contract?.name || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-bold text-red-600">¥{payment.amount.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        逾期 {format(payment.paymentDate, "MM/dd")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Status Distribution */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <FolderKanban className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <CardTitle className="text-base font-semibold text-gray-900">项目状态分布</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {projectDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无项目数据</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {projectDistribution.map((item) => {
                const cfg = statusConfig[item.status]
                return (
                  <div
                    key={item.status}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${cfg?.badgeClass || "bg-gray-100 text-gray-600"}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${cfg?.dotClass || "bg-gray-400"}`} />
                    <span>{cfg?.label || item.status}</span>
                    <span className="font-bold">{item._count.id}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
