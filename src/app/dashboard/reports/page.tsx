"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Users, Target, Calendar } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts"

interface VisitStats {
  total: number
  completed: number
  cancelled: number
  byType: { type: string; count: number }[]
  byMonth: { month: string; count: number }[]
  conversionRate: number
}

interface SalesStats {
  name: string
  visits: number
  completed: number
  opportunities: number
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280']

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null)
  const [salesStats, setSalesStats] = useState<SalesStats[]>([])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/visits?status=COMPLETED")
      const visits = await res.json()

      // Calculate stats
      const completed = visits.filter((v: any) => v.status === 'COMPLETED').length
      const byTypeMap = new Map<string, number>()
      const byMonthMap = new Map<string, number>()

      visits.forEach((visit: any) => {
        // By type
        byTypeMap.set(visit.type, (byTypeMap.get(visit.type) || 0) + 1)

        // By month
        const month = new Date(visit.startTime).toLocaleString('zh-CN', { year: 'numeric', month: 'short' })
        byMonthMap.set(month, (byMonthMap.get(month) || 0) + 1)
      })

      const byType = Array.from(byTypeMap.entries()).map(([type, count]) => ({
        type: getTypeName(type),
        count
      }))

      const byMonth = Array.from(byMonthMap.entries()).map(([month, count]) => ({
        month,
        count
      })).sort((a, b) => a.month.localeCompare(b.month))

      setVisitStats({
        total: visits.length,
        completed,
        cancelled: visits.filter((v: any) => v.status === 'CANCELLED').length,
        byType,
        byMonth,
        conversionRate: 0 // Would need opportunity data to calculate
      })
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      FIRST_MEETING: '首次拜访',
      FOLLOW_UP: '跟进拜访',
      DEMO: '产品演示',
      CONTRACT: '合同洽谈',
      SUPPORT: '客户支持',
      OTHER: '其他'
    }
    return names[type] || type
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">统计报表</h1>
        <p className="text-muted-foreground">查看销售数据统计</p>
      </div>

      <Tabs defaultValue="visits">
        <TabsList>
          <TabsTrigger value="visits">拜访统计</TabsTrigger>
          <TabsTrigger value="sales">销售排行</TabsTrigger>
        </TabsList>

        <TabsContent value="visits">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">总拜访次数</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{visitStats?.total || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">已完成</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{visitStats?.completed || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">已取消</CardTitle>
                  <Calendar className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{visitStats?.cancelled || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">完成率</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {visitStats?.total ? Math.round((visitStats.completed / visitStats.total) * 100) : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Visit Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>拜访趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-64 flex items-center justify-center">加载中...</div>
                  ) : visitStats?.byMonth.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">暂无数据</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={visitStats?.byMonth || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          name="拜访次数"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Visit Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>拜访类型分布</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-64 flex items-center justify-center">加载中...</div>
                  ) : visitStats?.byType.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">暂无数据</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={visitStats?.byType || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="type"
                        >
                          {visitStats?.byType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Type Stats Table */}
            <Card>
              <CardHeader>
                <CardTitle>拜访类型统计</CardTitle>
              </CardHeader>
              <CardContent>
                {visitStats?.byType.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">暂无数据</p>
                ) : (
                  <div className="space-y-2">
                    {visitStats?.byType.map((item, index) => (
                      <div key={item.type} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span>{item.type}</span>
                        </div>
                        <span className="font-bold">{item.count}次</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>销售排行</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-4">暂无销售排行数据</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
