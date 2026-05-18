import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, FolderKanban, Calendar, TrendingUp, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

async function getKPIs(teamId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Total contract amount
  const totalContractAmount = await prisma.contract.aggregate({
    where: { teamId, status: { in: ['SIGNED', 'ACTIVE', 'COMPLETED'] } },
    _sum: { amount: true }
  })

  // This month receivables
  const monthContractAmount = await prisma.contract.aggregate({
    where: {
      teamId,
      status: { in: ['SIGNED', 'ACTIVE'] },
      startDate: { gte: startOfMonth, lte: endOfMonth }
    },
    _sum: { amount: true }
  })

  // Overdue payments
  const overduePayments = await prisma.payment.findMany({
    where: {
      teamId,
      status: 'PENDING',
      paymentDate: { lt: now }
    },
    include: { invoice: true, contract: true }
  })
  const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0)

  // Active projects
  const activeProjects = await prisma.project.count({
    where: { teamId, status: 'IN_PROGRESS' }
  })

  // Today's visits
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const todayVisits = await prisma.visit.count({
    where: {
      teamId,
      startTime: { gte: today, lt: tomorrow },
      status: { in: ['PLANNED', 'IN_PROGRESS'] }
    }
  })

  return {
    totalContractAmount: totalContractAmount._sum.amount || 0,
    monthReceivables: monthContractAmount._sum.amount || 0,
    overdueAmount,
    activeProjects,
    todayVisits
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
      status: { in: ['PLANNED', 'IN_PROGRESS'] }
    },
    include: { customer: true },
    orderBy: { startTime: 'asc' },
    take: 5
  })
}

async function getOverduePayments(teamId: string) {
  const now = new Date()
  return await prisma.payment.findMany({
    where: {
      teamId,
      status: 'PENDING',
      paymentDate: { lt: now }
    },
    include: { invoice: true, contract: { include: { customer: true } } },
    orderBy: { paymentDate: 'asc' },
    take: 5
  })
}

async function getProjectStatusDistribution(teamId: string) {
  const distribution = await prisma.project.groupBy({
    by: ['status'],
    where: { teamId },
    _count: { id: true }
  })
  return distribution
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
    getProjectStatusDistribution(teamId)
  ])

  const statusColors: Record<string, string> = {
    PLANNING: 'bg-blue-500',
    IN_PROGRESS: 'bg-green-500',
    ON_HOLD: 'bg-yellow-500',
    COMPLETED: 'bg-gray-500',
    CANCELLED: 'bg-red-500'
  }

  const projectStatusNames: Record<string, string> = {
    PLANNING: '规划中',
    IN_PROGRESS: '进行中',
    ON_HOLD: '暂停',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground">欢迎回来，{session?.user?.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总合同金额</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpis.totalContractAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">本月应收</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpis.monthReceivables.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">逾期金额</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">¥{kpis.overdueAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">进行中项目</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日拜访</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.todayVisits}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Visits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">今日拜访</CardTitle>
          </CardHeader>
          <CardContent>
            {recentVisits.length === 0 ? (
              <p className="text-muted-foreground text-sm">今日暂无拜访计划</p>
            ) : (
              <div className="space-y-3">
                {recentVisits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/dashboard/visits/${visit.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{visit.title}</p>
                      <p className="text-sm text-muted-foreground">{visit.customer.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{format(visit.startTime, 'HH:mm')}</p>
                      <Badge variant={visit.status === 'IN_PROGRESS' ? 'warning' : 'secondary'}>
                        {visit.status === 'IN_PROGRESS' ? '进行中' : '计划中'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">逾期账款</CardTitle>
          </CardHeader>
          <CardContent>
            {overduePayments.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无逾期账款</p>
            ) : (
              <div className="space-y-3">
                {overduePayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-destructive/30"
                  >
                    <div>
                      <p className="font-medium">{payment.contract?.customer?.name || '-'}</p>
                      <p className="text-sm text-muted-foreground">
                        合同: {payment.contract?.name || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">¥{payment.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        逾期: {format(payment.paymentDate, 'MM/dd')}
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">项目状态分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            {projectDistribution.map((item) => (
              <div key={item.status} className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${statusColors[item.status] || 'bg-gray-500'} mr-2`} />
                <span className="text-sm">{projectStatusNames[item.status] || item.status}</span>
                <span className="ml-1 font-bold">{item._count.id}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
