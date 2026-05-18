"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, DollarSign, User, Pencil, Trash2, FolderKanban } from "lucide-react"
import { format } from "date-fns"

const statusStages = [
  { id: 'PLANNING', name: '规划中', color: 'bg-blue-500' },
  { id: 'IN_PROGRESS', name: '进行中', color: 'bg-green-500' },
  { id: 'ON_HOLD', name: '暂停', color: 'bg-yellow-500' },
  { id: 'COMPLETED', name: '已完成', color: 'bg-purple-500' },
  { id: 'CANCELLED', name: '已取消', color: 'bg-gray-500' }
]

const taskStatusNames: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
}

const milestoneStatusNames: Record<string, string> = {
  PENDING: "待完成",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
}

const visitStatusNames: Record<string, string> = {
  PLANNED: "计划中",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  endDate: string | null
  budget: number
  customer: {
    id: string
    name: string
  }
  owners: { user: { name: string | null } }[]
  tasks: {
    id: string
    title: string
    status: string
    dueDate: string | null
  }[]
  milestones: {
    id: string
    name: string
    dueDate: string | null
    status: string
  }[]
  visits: {
    id: string
    title: string
    startTime: string
    status: string
    customer: {
      name: string
    }
  }[]
  _count: {
    tasks: number
    milestones: number
    visits: number
  }
  createdAt: Date
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string | undefined

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "PLANNING",
    startDate: "",
    endDate: "",
    budget: 0,
    customerId: ""
  })

  useEffect(() => {
    if (id) {
      fetchProject()
      fetchCustomers()
    }
  }, [id])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      const data = await res.json()
      if (res.ok) {
        setProject(data)
        setFormData({
          name: data.name,
          description: data.description || "",
          status: data.status,
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "",
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : "",
          budget: data.budget,
          customerId: data.customer.id
        })
      } else {
        setError(data.error || "加载失败")
      }
    } catch (error) {
      console.error("Failed to fetch project:", error)
      setError("加载失败")
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers?limit=100")
      const data = await res.json()
      setCustomers(data.data || [])
    } catch (error) {
      console.error("Failed to fetch customers:", error)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsEditDialogOpen(false)
        fetchProject()
      } else {
        const data = await res.json()
        alert(data.error || "更新失败")
      }
    } catch (error) {
      console.error("Failed to update project:", error)
      alert("更新失败，请重试")
    }
  }

  const handleDelete = async () => {
    if (!confirm("确定要删除此项目吗？")) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        router.push("/dashboard/projects")
      } else {
        const data = await res.json()
        alert(data.error || "删除失败")
      }
    } catch (error) {
      console.error("Failed to delete project:", error)
      alert("删除失败，请重试")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  if (error || !project) {
    return <div className="p-6 text-red-600">错误: {error || "项目不存在"}</div>
  }

  const currentStatus = statusStages.find(s => s.id === project.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/projects">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回项目列表
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            编辑
          </Button>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? "删除中..." : "删除"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={currentStatus?.color}>
              {currentStatus?.name}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">预算</div>
              <div className="text-lg font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                {project.budget.toLocaleString()}
              </div>
            </div>
            {project.startDate && (
              <div>
                <div className="text-sm text-muted-foreground">开始日期</div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  {format(new Date(project.startDate), 'yyyy-MM-dd')}
                </div>
              </div>
            )}
            {project.endDate && (
              <div>
                <div className="text-sm text-muted-foreground">结束日期</div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  {format(new Date(project.endDate), 'yyyy-MM-dd')}
                </div>
              </div>
            )}
            {project.description && (
              <div>
                <div className="text-sm text-muted-foreground">项目描述</div>
                <div className="text-sm">{project.description}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">创建时间</div>
              <div>{format(new Date(project.createdAt), 'yyyy-MM-dd HH:mm')}</div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>关联客户</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/dashboard/customers/${project.customer.id}`}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">{project.customer.name}</div>
                <div className="text-sm text-muted-foreground">查看客户详情</div>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>团队成员</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {project.owners.map((owner, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span>{owner.user.name || '-'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>项目统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{project._count.tasks}</div>
                <div className="text-sm text-muted-foreground">任务</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{project._count.milestones}</div>
                <div className="text-sm text-muted-foreground">里程碑</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{project._count.visits}</div>
                <div className="text-sm text-muted-foreground">拜访</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>最近任务</CardTitle>
          </CardHeader>
          <CardContent>
            {!project.tasks || project.tasks.length === 0 ? (
              <p className="text-muted-foreground">暂无任务</p>
            ) : (
              <div className="space-y-2">
                {project.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.dueDate && (
                        <div className="text-sm text-muted-foreground">
                          截止: {format(new Date(task.dueDate), 'yyyy-MM-dd')}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">{taskStatusNames[task.status] || task.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>里程碑</CardTitle>
          </CardHeader>
          <CardContent>
            {!project.milestones || project.milestones.length === 0 ? (
              <p className="text-muted-foreground">暂无里程碑</p>
            ) : (
              <div className="space-y-2">
                {project.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{milestone.name}</div>
                      {milestone.dueDate && (
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(milestone.dueDate), 'yyyy-MM-dd')}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">{milestoneStatusNames[milestone.status] || milestone.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visits */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>最近拜访</CardTitle>
          </CardHeader>
          <CardContent>
            {!project.visits || project.visits.length === 0 ? (
              <p className="text-muted-foreground">暂无拜访记录</p>
            ) : (
              <div className="space-y-2">
                {project.visits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/dashboard/visits/${visit.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{visit.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {visit.customer.name} | {format(new Date(visit.startTime), 'yyyy-MM-dd HH:mm')}
                      </div>
                    </div>
                    <Badge variant="outline">{visitStatusNames[visit.status] || visit.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
            <DialogDescription>修改项目信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">项目名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-customer">客户 *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择客户" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNING">规划中</SelectItem>
                    <SelectItem value="IN_PROGRESS">进行中</SelectItem>
                    <SelectItem value="ON_HOLD">暂停</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                    <SelectItem value="CANCELLED">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">项目描述</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">开始日期</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">结束日期</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget">预算</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={!formData.customerId}>保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
