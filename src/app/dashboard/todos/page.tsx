"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, Circle, Clock, AlertCircle, Pencil, Trash2, Plus, Filter, ListTodo } from "lucide-react"

interface Todo {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  completedAt: string | null
  creatorId: string
  assigneeId: string | null
  creator: { id: string; name: string | null; email: string }
  assignee: { id: string; name: string | null; email: string } | null
}

interface TeamMember {
  id: string
  name: string | null
  email: string
}

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-600",
  URGENT: "bg-red-100 text-red-600"
}

const priorityLabels: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急"
}

const statusLabels: Record<string, string> = {
  TODO: "待办",
  IN_PROGRESS: "进行中",
  DONE: "已完成"
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"all" | "my" | "assigned">("my")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [priorityFilter, setPriorityFilter] = useState<string>("")

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
    assigneeId: ""
  })

  const fetchTodos = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("view", view)
      if (statusFilter) params.set("status", statusFilter)
      if (priorityFilter) params.set("priority", priorityFilter)

      const res = await fetch(`/api/todos?${params}`)
      const data = await res.json()
      setTodos(data.todos || [])
      setTeamMembers(data.teamMembers || [])
    } catch (error) {
      console.error("Failed to fetch todos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [view, statusFilter, priorityFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTodo) {
        await fetch(`/api/todos/${editingTodo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        })
      } else {
        await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        })
      }
      setIsDialogOpen(false)
      setEditingTodo(null)
      setForm({
        title: "",
        description: "",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: "",
        assigneeId: ""
      })
      fetchTodos()
    } catch (error) {
      console.error("Failed to save todo:", error)
    }
  }

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo)
    setForm({
      title: todo.title,
      description: todo.description || "",
      status: todo.status,
      priority: todo.priority,
      dueDate: todo.dueDate ? todo.dueDate.split("T")[0] : "",
      assigneeId: todo.assigneeId || ""
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此待办吗？")) return
    try {
      await fetch(`/api/todos/${id}`, { method: "DELETE" })
      fetchTodos()
    } catch (error) {
      console.error("Failed to delete todo:", error)
    }
  }

  const handleToggleStatus = async (todo: Todo) => {
    const newStatus = todo.status === "DONE" ? "TODO" : "DONE"
    try {
      await fetch(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: todo.title,
          description: todo.description,
          status: newStatus,
          priority: todo.priority,
          dueDate: todo.dueDate,
          assigneeId: todo.assigneeId
        })
      })
      fetchTodos()
    } catch (error) {
      console.error("Failed to update todo:", error)
    }
  }

  const openNewDialog = () => {
    setEditingTodo(null)
    setForm({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: "",
      assigneeId: ""
    })
    setIsDialogOpen(true)
  }

  // 统计
  const totalTodos = todos.length
  const completedTodos = todos.filter(t => t.status === "DONE").length
  const overdueTodos = todos.filter(t => {
    if (!t.dueDate || t.status === "DONE") return false
    return new Date(t.dueDate) < new Date()
  }).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">待办事项</h1>
          <p className="text-muted-foreground">管理个人和团队任务</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          新增待办
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <ListTodo className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTodos}</p>
                <p className="text-sm text-muted-foreground">总待办</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTodos}</p>
                <p className="text-sm text-muted-foreground">已完成</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTodos}</p>
                <p className="text-sm text-muted-foreground">已逾期</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant={view === "my" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("my")}
              >
                我创建的
              </Button>
              <Button
                variant={view === "assigned" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("assigned")}
              >
                分配给我
              </Button>
              <Button
                variant={view === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("all")}
              >
                全部
              </Button>
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="TODO">待办</SelectItem>
                <SelectItem value="IN_PROGRESS">进行中</SelectItem>
                <SelectItem value="DONE">已完成</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter || "all"} onValueChange={(v) => setPriorityFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="LOW">低</SelectItem>
                <SelectItem value="MEDIUM">中</SelectItem>
                <SelectItem value="HIGH">高</SelectItem>
                <SelectItem value="URGENT">紧急</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 待办列表 */}
      <Card>
        <CardHeader>
          <CardTitle>
            {view === "my" && "我创建的待办"}
            {view === "assigned" && "分配给我的待办"}
            {view === "all" && "全部待办"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : todos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无待办事项</div>
          ) : (
            <div className="space-y-3">
              {todos.map((todo) => {
                const isOverdue = todo.dueDate && todo.status !== "DONE" && new Date(todo.dueDate) < new Date()
                return (
                  <div
                    key={todo.id}
                    className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                      todo.status === "DONE" ? "bg-gray-50 opacity-60" : ""
                    }`}
                  >
                    <button
                      onClick={() => handleToggleStatus(todo)}
                      className="mt-1 flex-shrink-0"
                    >
                      {todo.status === "DONE" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <span className={`font-medium ${todo.status === "DONE" ? "line-through text-gray-500" : ""}`}>
                          {todo.title}
                        </span>
                        <Badge className={priorityColors[todo.priority]}>
                          {priorityLabels[todo.priority]}
                        </Badge>
                        <Badge variant="outline">
                          {statusLabels[todo.status]}
                        </Badge>
                      </div>
                      {todo.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {todo.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {todo.dueDate && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                            <Clock className="w-3 h-3" />
                            {new Date(todo.dueDate).toLocaleDateString("zh-CN")}
                            {isOverdue && " (已逾期)"}
                          </span>
                        )}
                        {todo.assignee && (
                          <span>负责人: {todo.assignee.name || todo.assignee.email}</span>
                        )}
                        <span>创建人: {todo.creator.name || todo.creator.email}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(todo)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(todo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新建/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTodo ? "编辑待办" : "新建待办"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="请输入待办标题"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="请输入描述（可选）"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">待办</SelectItem>
                      <SelectItem value="IN_PROGRESS">进行中</SelectItem>
                      <SelectItem value="DONE">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>优先级</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">低</SelectItem>
                      <SelectItem value="MEDIUM">中</SelectItem>
                      <SelectItem value="HIGH">高</SelectItem>
                      <SelectItem value="URGENT">紧急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>截止日期</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>负责人</Label>
                  <Select
                    value={form.assigneeId || "unassigned"}
                    onValueChange={(v) => setForm({ ...form, assigneeId: v === "unassigned" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择负责人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">不指定</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit">{editingTodo ? "保存" : "创建"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
