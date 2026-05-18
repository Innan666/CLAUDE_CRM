"use client"

import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, DollarSign, Calendar, User, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"

const stageColors: Record<string, string> = {
  PROSPECTING: "bg-blue-500",
  QUALIFICATION: "bg-cyan-500",
  PROPOSAL: "bg-purple-500",
  NEGOTIATION: "bg-orange-500",
  CLOSED_WON: "bg-green-500",
  CLOSED_LOST: "bg-gray-500"
}

const stageNames: Record<string, string> = {
  PROSPECTING: "线索",
  QUALIFICATION: "资格验证",
  PROPOSAL: "方案提交",
  NEGOTIATION: "商务谈判",
  CLOSED_WON: "赢单",
  CLOSED_LOST: "输单"
}

const stages = [
  { id: 'PROSPECTING', name: '线索' },
  { id: 'QUALIFICATION', name: '资格验证' },
  { id: 'PROPOSAL', name: '方案提交' },
  { id: 'NEGOTIATION', name: '商务谈判' },
  { id: 'CLOSED_WON', name: '赢单' },
  { id: 'CLOSED_LOST', name: '输单' }
]

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
  owners: {
    id: string
    user: {
      name: string | null
    }
  }[]
  createdAt: Date
}

export default function OpportunityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    stage: "PROSPECTING",
    probability: 10,
    expectedDate: "",
    description: ""
  })

  useEffect(() => {
    if (id) {
      fetchOpportunity()
    }
  }, [id])

  const fetchOpportunity = async () => {
    try {
      const res = await fetch(`/api/opportunities/${id}`)
      if (res.ok) {
        const data = await res.json()
        setOpportunity(data)
        setFormData({
          name: data.name,
          amount: data.amount,
          stage: data.stage,
          probability: data.probability,
          expectedDate: data.expectedDate ? new Date(data.expectedDate).toISOString().split('T')[0] : "",
          description: data.description || ""
        })
      }
    } catch (error) {
      console.error("Failed to fetch opportunity:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsEditDialogOpen(false)
        fetchOpportunity()
      } else {
        const data = await res.json()
        alert(data.error || "更新失败")
      }
    } catch (error) {
      console.error("Failed to update opportunity:", error)
      alert("更新失败，请重试")
    }
  }

  const handleDelete = async () => {
    if (!confirm("确定要删除这个商机吗？")) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        router.push("/dashboard/opportunities")
      } else {
        const data = await res.json()
        alert(data.error || "删除失败")
      }
    } catch (error) {
      console.error("Failed to delete opportunity:", error)
      alert("删除失败，请重试")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  if (!opportunity) {
    return <div className="p-6">商机不存在</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/opportunities">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回商机列表
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
          <h1 className="text-2xl font-bold">{opportunity.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Link
              href={`/dashboard/customers/${opportunity.customer.id}`}
              className="text-muted-foreground hover:underline"
            >
              {opportunity.customer.name}
            </Link>
            <Badge className={stageColors[opportunity.stage]}>
              {stageNames[opportunity.stage]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">商机金额</div>
              <div className="text-lg font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                {opportunity.amount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">赢单概率</div>
              <div>{opportunity.probability}%</div>
            </div>
            {opportunity.expectedDate && (
              <div>
                <div className="text-sm text-muted-foreground">预计成交日期</div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  {format(new Date(opportunity.expectedDate), 'yyyy-MM-dd')}
                </div>
              </div>
            )}
            {opportunity.description && (
              <div>
                <div className="text-sm text-muted-foreground">描述</div>
                <div>{opportunity.description}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">创建时间</div>
              <div>{format(new Date(opportunity.createdAt), 'yyyy-MM-dd HH:mm')}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>关联客户</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/dashboard/customers/${opportunity.customer.id}`}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">{opportunity.customer.name}</div>
                <div className="text-sm text-muted-foreground">查看客户详情</div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>负责人</CardTitle>
          </CardHeader>
          <CardContent>
            {opportunity.owners.length === 0 ? (
              <p className="text-muted-foreground">暂无负责人</p>
            ) : (
              <div className="space-y-2">
                {opportunity.owners.map((owner) => (
                  <div key={owner.id} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>{owner.user.name}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑商机</DialogTitle>
            <DialogDescription>修改商机信息</DialogDescription>
          </DialogHeader>
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
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
