"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar, MapPin, User, Phone, Mail, Clock, Star, ArrowLeft, Play, Check, X } from "lucide-react"
import { format, differenceInMinutes } from "date-fns"

interface Visit {
  id: string
  title: string
  type: string
  status: string
  startTime: string
  endTime: string
  location: string | null
  description: string | null
  notes: string | null
  keyPoints: string | null
  nextSteps: string | null
  rating: number | null
  nextContactDate: string | null
  attendees: string[]
  customer: {
    id: string
    name: string
  }
  contact: {
    id: string
    name: string
    phone: string | null
    email: string | null
  } | null
  opportunity: {
    id: string
    name: string
  } | null
  project: {
    id: string
    name: string
  } | null
  createdBy: {
    name: string | null
  }
}

const visitTypeNames: Record<string, string> = {
  FIRST_MEETING: "首次拜访",
  FOLLOW_UP: "跟进拜访",
  DEMO: "产品演示",
  CONTRACT: "合同洽谈",
  SUPPORT: "客户支持",
  OTHER: "其他"
}

const statusColors: Record<string, string> = {
  PLANNED: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-gray-500"
}

const statusNames: Record<string, string> = {
  PLANNED: "计划中",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
}

export default function VisitDetailPage() {
  const router = useRouter()
  const params = useParams()
  const visitId = params.id as string
  const [visit, setVisit] = useState<Visit | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [completeForm, setCompleteForm] = useState({
    notes: "",
    keyPoints: "",
    nextSteps: "",
    rating: 5,
    nextContactDate: ""
  })

  useEffect(() => {
    fetchVisit()
  }, [visitId])

  const fetchVisit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/visits/${visitId}`)
      if (res.ok) {
        const data = await res.json()
        setVisit(data)
        if (data.notes) setCompleteForm(prev => ({ ...prev, notes: data.notes }))
        if (data.keyPoints) setCompleteForm(prev => ({ ...prev, keyPoints: data.keyPoints }))
        if (data.nextSteps) setCompleteForm(prev => ({ ...prev, nextSteps: data.nextSteps }))
        if (data.rating) setCompleteForm(prev => ({ ...prev, rating: data.rating }))
      }
    } catch (error) {
      console.error("Failed to fetch visit:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    setUpdating(true)
    try {
      await fetch(`/api/visits/${visitId}/start`, { method: "POST" })
      fetchVisit()
    } catch (error) {
      console.error("Failed to start visit:", error)
    } finally {
      setUpdating(false)
    }
  }

  const handleComplete = async () => {
    setUpdating(true)
    try {
      await fetch(`/api/visits/${visitId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeForm)
      })
      setShowCompleteForm(false)
      fetchVisit()
    } catch (error) {
      console.error("Failed to complete visit:", error)
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("确定要取消此拜访吗？")) return
    setUpdating(true)
    try {
      await fetch(`/api/visits/${visitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" })
      })
      fetchVisit()
    } catch (error) {
      console.error("Failed to cancel visit:", error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  if (!visit) {
    return <div className="p-6">拜访不存在</div>
  }

  const isPlanned = visit.status === 'PLANNED'
  const isInProgress = visit.status === 'IN_PROGRESS'
  const isCompleted = visit.status === 'COMPLETED'
  const isCancelled = visit.status === 'CANCELLED'

  // Calculate duration for completed visits
  let duration = 0
  if (isCompleted && visit.startTime && visit.endTime) {
    duration = differenceInMinutes(new Date(visit.endTime), new Date(visit.startTime))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{visit.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[visit.status]}>{statusNames[visit.status]}</Badge>
              <Badge variant="outline">{visitTypeNames[visit.type]}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isPlanned && (
            <Button onClick={handleStart} disabled={updating}>
              <Play className="w-4 h-4 mr-1" />
              开始拜访
            </Button>
          )}
          {isInProgress && (
            <Button onClick={() => setShowCompleteForm(true)} disabled={updating}>
              <Check className="w-4 h-4 mr-1" />
              完成拜访
            </Button>
          )}
          {(isPlanned || isInProgress) && (
            <Button variant="destructive" onClick={handleCancel} disabled={updating}>
              <X className="w-4 h-4 mr-1" />
              取消拜访
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>拜访信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">客户</div>
                <Link
                  href={`/dashboard/customers/${visit.customer.id}`}
                  className="font-medium hover:underline"
                >
                  {visit.customer.name}
                </Link>
              </div>
              {visit.contact && (
                <div>
                  <div className="text-sm text-muted-foreground">联系人</div>
                  <div>{visit.contact.name}</div>
                </div>
              )}
              {visit.opportunity && (
                <div>
                  <div className="text-sm text-muted-foreground">关联商机</div>
                  <Link
                    href={`/dashboard/opportunities/${visit.opportunity.id}`}
                    className="hover:underline"
                  >
                    {visit.opportunity.name}
                  </Link>
                </div>
              )}
              {visit.project && (
                <div>
                  <div className="text-sm text-muted-foreground">关联项目</div>
                  <Link
                    href={`/dashboard/projects/${visit.project.id}`}
                    className="hover:underline"
                  >
                    {visit.project.name}
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  开始时间
                </div>
                <div>{format(new Date(visit.startTime), 'yyyy-MM-dd HH:mm')}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  结束时间
                </div>
                <div>{format(new Date(visit.endTime), 'yyyy-MM-dd HH:mm')}</div>
              </div>
            </div>

            {visit.location && (
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  地点
                </div>
                <div>{visit.location}</div>
              </div>
            )}

            {visit.description && (
              <div>
                <div className="text-sm text-muted-foreground">备注</div>
                <div>{visit.description}</div>
              </div>
            )}

            {isInProgress && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Play className="w-5 h-5" />
                  <span className="font-medium">拜访进行中</span>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">拜访已完成</span>
                    {duration > 0 && <span className="text-sm">（时长: {duration}分钟）</span>}
                  </div>
                </div>

                {visit.notes && (
                  <div>
                    <div className="text-sm text-muted-foreground">纪要</div>
                    <div className="whitespace-pre-wrap">{visit.notes}</div>
                  </div>
                )}

                {visit.keyPoints && (
                  <div>
                    <div className="text-sm text-muted-foreground">关键要点</div>
                    <div className="whitespace-pre-wrap">{visit.keyPoints}</div>
                  </div>
                )}

                {visit.nextSteps && (
                  <div>
                    <div className="text-sm text-muted-foreground">下一步行动</div>
                    <div className="whitespace-pre-wrap">{visit.nextSteps}</div>
                  </div>
                )}

                {visit.rating && (
                  <div>
                    <div className="text-sm text-muted-foreground">满意度评分</div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= visit.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {visit.nextContactDate && (
                  <div>
                    <div className="text-sm text-muted-foreground">下次联系时间</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(visit.nextContactDate), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">创建信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="text-muted-foreground">创建人</div>
                <div>{visit.createdBy.name || '-'}</div>
              </div>
            </CardContent>
          </Card>

          {visit.contact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">联系人信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{visit.contact.name}</span>
                </div>
                {visit.contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{visit.contact.phone}</span>
                  </div>
                )}
                {visit.contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{visit.contact.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Complete Form Dialog */}
      <Dialog open={showCompleteForm} onOpenChange={setShowCompleteForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>完成拜访</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>拜访纪要</Label>
              <Textarea
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                placeholder="记录本次拜访的主要内容..."
              />
            </div>
            <div className="space-y-2">
              <Label>关键要点</Label>
              <Textarea
                value={completeForm.keyPoints}
                onChange={(e) => setCompleteForm({ ...completeForm, keyPoints: e.target.value })}
                placeholder="记录关键决策点、痛点等..."
              />
            </div>
            <div className="space-y-2">
              <Label>下一步行动</Label>
              <Textarea
                value={completeForm.nextSteps}
                onChange={(e) => setCompleteForm({ ...completeForm, nextSteps: e.target.value })}
                placeholder="记录后续跟进事项..."
              />
            </div>
            <div className="space-y-2">
              <Label>满意度评分</Label>
              <Select
                value={String(completeForm.rating)}
                onValueChange={(v) => setCompleteForm({ ...completeForm, rating: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1星</SelectItem>
                  <SelectItem value="2">2星</SelectItem>
                  <SelectItem value="3">3星</SelectItem>
                  <SelectItem value="4">4星</SelectItem>
                  <SelectItem value="5">5星</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>下次联系时间</Label>
              <Input
                type="datetime-local"
                value={completeForm.nextContactDate}
                onChange={(e) => setCompleteForm({ ...completeForm, nextContactDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteForm(false)}>取消</Button>
            <Button onClick={handleComplete} disabled={updating}>确认完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
