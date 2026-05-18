"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Target, DollarSign, Calendar, Pencil, Trash2, List, LayoutGrid, Search } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Opportunity {
  id: string
  name: string
  amount: number
  stage: string
  probability: number
  expectedDate: string | null
  description: string | null
  customer: {
    id: string
    name: string
  }
}

const stages = [
  { id: 'PROSPECTING', name: '线索', color: 'bg-blue-500' },
  { id: 'QUALIFICATION', name: '资格验证', color: 'bg-cyan-500' },
  { id: 'PROPOSAL', name: '方案提交', color: 'bg-purple-500' },
  { id: 'NEGOTIATION', name: '商务谈判', color: 'bg-orange-500' },
  { id: 'CLOSED_WON', name: '赢单', color: 'bg-green-500' },
  { id: 'CLOSED_LOST', name: '输单', color: 'bg-gray-500' }
]

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState("")
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    stage: "PROSPECTING",
    probability: 10,
    expectedDate: "",
    description: "",
    customerId: ""
  })

  useEffect(() => {
    fetchOpportunities()
    fetchCustomers()
  }, [])

  const fetchOpportunities = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/opportunities")
      const data = await res.json()
      setOpportunities(data || [])
    } catch (error) {
      console.error("Failed to fetch opportunities:", error)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        setIsDialogOpen(false)
        setFormData({
          name: "",
          amount: 0,
          stage: "PROSPECTING",
          probability: 10,
          expectedDate: "",
          description: "",
          customerId: ""
        })
        fetchOpportunities()
      } else {
        setError(data.error || "创建失败")
      }
    } catch (error) {
      console.error("Failed to create opportunity:", error)
      setError("创建失败，请重试")
    }
  }

  const handleStageChange = async (opportunityId: string, newStage: string) => {
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage })
      })
      if (res.ok) {
        fetchOpportunities()
      } else {
        const data = await res.json()
        console.error("Failed to update stage:", data.error)
      }
    } catch (error) {
      console.error("Failed to update opportunity stage:", error)
    }
  }

  const handleEdit = (opp: Opportunity) => {
    setEditingOpportunity(opp)
    setFormData({
      name: opp.name,
      amount: opp.amount,
      stage: opp.stage,
      probability: opp.probability,
      expectedDate: opp.expectedDate ? opp.expectedDate.split('T')[0] : "",
      description: opp.description || "",
      customerId: opp.customer.id
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOpportunity) return
    setError("")
    try {
      const res = await fetch(`/api/opportunities/${editingOpportunity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        setIsEditDialogOpen(false)
        setEditingOpportunity(null)
        fetchOpportunities()
      } else {
        setError(data.error || "更新失败")
      }
    } catch (error) {
      console.error("Failed to update opportunity:", error)
      setError("更新失败，请重试")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个商机吗？")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        fetchOpportunities()
      } else {
        const data = await res.json()
        alert(data.error || "删除失败")
      }
    } catch (error) {
      console.error("Failed to delete opportunity:", error)
      alert("删除失败，请重试")
    } finally {
      setDeletingId(null)
    }
  }

  const getOpportunitiesByStage = (stage: string) => {
    return opportunities.filter(opp => opp.stage === stage)
  }

  const filteredOpportunities = opportunities.filter(opp => {
    const matchSearch = search === "" ||
      opp.name.toLowerCase().includes(search.toLowerCase()) ||
      opp.customer.name.toLowerCase().includes(search.toLowerCase())
    const matchStage = stageFilter === "all" || opp.stage === stageFilter
    return matchSearch && matchStage
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">商机管理</h1>
          <p className="text-muted-foreground">管理销售商机</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              看板
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4 mr-1" />
              列表
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新增商机
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新增商机</DialogTitle>
              <DialogDescription>填写商机信息</DialogDescription>
            </DialogHeader>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">商机名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer">客户 *</Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">金额</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probability">赢单概率</Label>
                    <Input
                      id="probability"
                      type="number"
                      min={0}
                      max={100}
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedDate">预计成交日期</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={!formData.customerId}>保存</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>编辑商机</DialogTitle>
              <DialogDescription>修改商机信息</DialogDescription>
            </DialogHeader>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleUpdate}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">商机名称 *</Label>
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
                  <Label htmlFor="edit-stage">阶段</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value) => setFormData({ ...formData, stage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount">金额</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-probability">赢单概率</Label>
                    <Input
                      id="edit-probability"
                      type="number"
                      min={0}
                      max={100}
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expectedDate">预计成交日期</Label>
                  <Input
                    id="edit-expectedDate"
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">描述</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
      </div>

      {/* Kanban Board */}
      {viewMode === "kanban" && (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                  <Badge className={stage.color}>{getOpportunitiesByStage(stage.id).length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <p className="text-center text-muted-foreground py-4">加载中...</p>
                ) : getOpportunitiesByStage(stage.id).length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">暂无商机</p>
                ) : (
                  getOpportunitiesByStage(stage.id).map((opp) => (
                    <div
                      key={opp.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 transition-colors relative group"
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleEdit(opp)
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDelete(opp.id)
                          }}
                          disabled={deletingId === opp.id}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Link href={`/dashboard/opportunities/${opp.id}`}>
                        <div className="font-medium mb-1">{opp.name}</div>
                        <div className="text-sm text-muted-foreground mb-2">{opp.customer.name}</div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {opp.amount.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">{opp.probability}%</span>
                        </div>
                      </Link>
                      {stage.id !== 'CLOSED_WON' && stage.id !== 'CLOSED_LOST' && (
                        <Select
                          value={opp.stage}
                          onValueChange={(value) => {
                            handleStageChange(opp.id, value)
                          }}
                        >
                          <SelectTrigger className="mt-2 h-8" onClick={(e) => e.preventDefault()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.filter(s => s.id !== 'CLOSED_WON' && s.id !== 'CLOSED_LOST').map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>商机列表</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索商机..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="全部阶段" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部阶段</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商机名称</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>阶段</TableHead>
                  <TableHead>概率</TableHead>
                  <TableHead>预计成交日期</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">加载中...</TableCell>
                  </TableRow>
                ) : filteredOpportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">暂无数据</TableCell>
                  </TableRow>
                ) : (
                  filteredOpportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell>
                        <Link href={`/dashboard/opportunities/${opp.id}`} className="font-medium hover:underline">
                          {opp.name}
                        </Link>
                      </TableCell>
                      <TableCell>{opp.customer.name}</TableCell>
                      <TableCell>¥{opp.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={stages.find(s => s.id === opp.stage)?.color}>
                          {stages.find(s => s.id === opp.stage)?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{opp.probability}%</TableCell>
                      <TableCell>
                        {opp.expectedDate ? new Date(opp.expectedDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(opp)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(opp.id)}
                            disabled={deletingId === opp.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
