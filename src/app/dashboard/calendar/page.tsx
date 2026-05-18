"use client"

import { useEffect, useState, useRef } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Calendar as CalendarIcon, List, Pencil, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"

interface Visit {
  id: string
  title: string
  type: string
  status: string
  startTime: string
  endTime: string
  location: string | null
  description: string | null
  customer: {
    id: string
    name: string
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

const visitTypeColors: Record<string, string> = {
  FIRST_MEETING: "#3B82F6",
  FOLLOW_UP: "#10B981",
  DEMO: "#8B5CF6",
  CONTRACT: "#F59E0B",
  SUPPORT: "#EF4444",
  OTHER: "#6B7280",
  // 中文类型兼容
  '初次拜访': "#3B82F6",
  '拜访': "#10B981",
  '会议': "#8B5CF6",
  '演示': "#8B5CF6",
  '其他': "#6B7280"
}

const statusColors: Record<string, string> = {
  PLANNED: "#3B82F6",     // 蓝色 - 计划中
  IN_PROGRESS: "#F59E0B", // 黄色 - 进行中
  COMPLETED: "#10B981",   // 绿色 - 已完成
  CANCELLED: "#6B7280"    // 灰色 - 已取消
}

const visitStatusNames: Record<string, string> = {
  PLANNED: "计划中",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
}

export default function CalendarPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const calendarRef = useRef<any>(null)

  const [formData, setFormData] = useState({
    title: "",
    type: "FOLLOW_UP",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    location: "",
    description: "",
    customerId: ""
  })

  useEffect(() => {
    fetchVisits()
    fetchCustomers()
  }, [])

  const fetchVisits = async () => {
    setLoading(true)
    try {
      const now = new Date()
      // 查询当前月份前后6个月的数据
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 7, 0)

      const res = await fetch(
        `/api/visits?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`
      )
      const data = await res.json()
      setVisits(data || [])
    } catch (error) {
      console.error("Failed to fetch visits:", error)
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

  const handleDateSelect = (selectInfo: any) => {
    setSelectedDate(format(selectInfo.start, 'yyyy-MM-dd'))
    setFormData({
      ...formData,
      startDate: format(selectInfo.start, 'yyyy-MM-dd'),
      endDate: format(selectInfo.start, 'yyyy-MM-dd')
    })
    setIsDialogOpen(true)
  }

  const handleEventClick = (clickInfo: any) => {
    const visit = visits.find(v => v.id === clickInfo.event.id)
    if (visit) {
      setSelectedVisit(visit)
    }
  }

  const handleEventDrop = async (dropInfo: any) => {
    try {
      const visit = visits.find(v => v.id === dropInfo.event.id)
      if (!visit) return

      const newStart = dropInfo.event.start
      const newEnd = dropInfo.event.end || new Date(newStart.getTime() + 60 * 60 * 1000)

      await fetch(`/api/visits/${visit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString()
        })
      })
      fetchVisits()
    } catch (error) {
      console.error("Failed to update visit:", error)
      dropInfo.revert()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const startTime = `${formData.startDate}T${formData.startTime}:00`
      const endTime = `${formData.endDate}T${formData.endTime}:00`

      await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startTime,
          endTime
        })
      })

      setIsDialogOpen(false)
      setFormData({
        title: "",
        type: "FOLLOW_UP",
        startDate: "",
        startTime: "09:00",
        endDate: "",
        endTime: "10:00",
        location: "",
        description: "",
        customerId: ""
      })
      fetchVisits()
    } catch (error) {
      console.error("Failed to create visit:", error)
    }
  }

  const handleEditClick = () => {
    if (!selectedVisit) return
    setFormData({
      title: selectedVisit.title,
      type: selectedVisit.type,
      startDate: new Date(selectedVisit.startTime).toISOString().split('T')[0],
      startTime: new Date(selectedVisit.startTime).toTimeString().slice(0, 5),
      endDate: new Date(selectedVisit.endTime).toISOString().split('T')[0],
      endTime: new Date(selectedVisit.endTime).toTimeString().slice(0, 5),
      location: selectedVisit.location || "",
      description: selectedVisit.description || "",
      customerId: selectedVisit.customer.id
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVisit) return
    try {
      const startTime = `${formData.startDate}T${formData.startTime}:00`
      const endTime = `${formData.endDate}T${formData.endTime}:00`

      await fetch(`/api/visits/${selectedVisit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startTime,
          endTime
        })
      })

      setIsEditDialogOpen(false)
      setSelectedVisit(null)
      fetchVisits()
    } catch (error) {
      console.error("Failed to update visit:", error)
    }
  }

  const handleDelete = async () => {
    if (!selectedVisit || !confirm("确定要删除此拜访吗？")) return
    setDeletingId(selectedVisit.id)
    try {
      const res = await fetch(`/api/visits/${selectedVisit.id}`, { method: "DELETE" })
      if (res.ok) {
        setSelectedVisit(null)
        fetchVisits()
      }
    } catch (error) {
      console.error("Failed to delete visit:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const calendarEvents = visits.map(visit => {
    const status = String(visit.status)
    const type = String(visit.type)
    // 状态灯颜色
    const statusDotColors: Record<string, string> = {
      PLANNED: '#3B82F6',     // 蓝色
      IN_PROGRESS: '#F59E0B',  // 黄色
      COMPLETED: '#10B981',    // 绿色
      CANCELLED: '#6B7280'    // 灰色
    }
    return {
      id: visit.id,
      title: `${visit.title} - ${visit.customer.name}`,
      start: visit.startTime,
      end: visit.endTime,
      backgroundColor: visitTypeColors[type] || '#3B82F6',
      borderColor: statusDotColors[status] || statusColors[status] || '#3B82F6',
      classNames: status === 'CANCELLED' ? ['fc-event-cancelled'] : [],
      extendedProps: {
        customer: visit.customer,
        type: visit.type,
        status: visit.status,
        location: visit.location
      }
    }
  })

  // Today's visits for sidebar
  const today = new Date()
  const todayVisits = visits.filter(v => {
    const visitDate = new Date(v.startTime)
    return visitDate.toDateString() === today.toDateString()
  })

  return (
    <div className="flex h-full gap-6">
      {/* Main Calendar */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>日历拜访</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                日历
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4 mr-1" />
                列表
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    新建拜访
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>新建拜访</DialogTitle>
                    <DialogDescription>填写拜访计划</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">拜访标题 *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                      <div className="space-y-2">
                        <Label htmlFor="type">拜访类型</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIRST_MEETING">首次拜访</SelectItem>
                            <SelectItem value="FOLLOW_UP">跟进拜访</SelectItem>
                            <SelectItem value="DEMO">产品演示</SelectItem>
                            <SelectItem value="CONTRACT">合同洽谈</SelectItem>
                            <SelectItem value="SUPPORT">客户支持</SelectItem>
                            <SelectItem value="OTHER">其他</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">开始日期 *</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="startTime">开始时间</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="endDate">结束日期 *</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endTime">结束时间</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">地点</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">备注</Label>
                        <Textarea
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
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10">加载中...</div>
            ) : viewMode === "calendar" ? (
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                }}
                events={calendarEvents}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                select={handleDateSelect}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                eventResize={handleEventDrop}
                height="auto"
                locale="zh-cn"
                buttonText={{
                  today: '今天',
                  month: '月',
                  week: '周',
                  day: '日',
                  list: '列表'
                }}
              />
            ) : (
              <div className="space-y-2">
                {visits.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">暂无拜访计划</p>
                ) : (
                  visits.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedVisit(visit)}
                    >
                      <div>
                        <div className="font-medium">{visit.title}</div>
                        <div className="text-sm text-muted-foreground">{visit.customer.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{format(parseISO(visit.startTime), 'MM/dd HH:mm')}</div>
                        <Badge variant="secondary">{visitTypeNames[visit.type]}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Sidebar */}
      <div className="w-80">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">今日待办</CardTitle>
          </CardHeader>
          <CardContent>
            {todayVisits.length === 0 ? (
              <p className="text-muted-foreground text-sm">今日暂无拜访</p>
            ) : (
              <div className="space-y-2">
                {todayVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedVisit(visit)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {format(parseISO(visit.startTime), 'HH:mm')}
                      </span>
                      <Badge
                        variant={visit.status === 'IN_PROGRESS' ? 'warning' : 'secondary'}
                        className="text-xs"
                      >
                        {visit.status === 'IN_PROGRESS' ? '进行中' : '计划中'}
                      </Badge>
                    </div>
                    <div className="font-medium text-sm">{visit.title}</div>
                    <div className="text-xs text-muted-foreground">{visit.customer.name}</div>
                    {visit.location && (
                      <div className="text-xs text-muted-foreground mt-1">{visit.location}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visit Detail Dialog */}
      <Dialog open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
        <DialogContent className="max-w-md">
          {selectedVisit && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedVisit.title}</DialogTitle>
                <DialogDescription>
                  {selectedVisit.customer.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {visitTypeNames[selectedVisit.type]}
                  </Badge>
                  <Badge
                    variant={selectedVisit.status === 'COMPLETED' ? 'success' :
                      selectedVisit.status === 'IN_PROGRESS' ? 'warning' : 'secondary'}
                  >
                    {visitStatusNames[selectedVisit.status] || selectedVisit.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">开始时间</div>
                    <div>{format(parseISO(selectedVisit.startTime), 'yyyy-MM-dd HH:mm')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">结束时间</div>
                    <div>{format(parseISO(selectedVisit.endTime), 'yyyy-MM-dd HH:mm')}</div>
                  </div>
                </div>
                {selectedVisit.location && (
                  <div>
                    <div className="text-sm text-muted-foreground">地点</div>
                    <div>{selectedVisit.location}</div>
                  </div>
                )}
                {selectedVisit.description && (
                  <div>
                    <div className="text-sm text-muted-foreground">备注</div>
                    <div>{selectedVisit.description}</div>
                  </div>
                )}
              </div>
              <DialogFooter className="justify-between">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deletingId === selectedVisit.id}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedVisit(null)}>
                    关闭
                  </Button>
                  <Button variant="outline" onClick={handleEditClick}>
                    <Pencil className="w-4 h-4 mr-2" />
                    编辑
                  </Button>
                  <Button asChild>
                    <a href={`/dashboard/visits/${selectedVisit.id}`}>查看详情</a>
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑拜访</DialogTitle>
            <DialogDescription>修改拜访计划</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">拜访标题 *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                <Label htmlFor="edit-type">拜访类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRST_MEETING">首次拜访</SelectItem>
                    <SelectItem value="FOLLOW_UP">跟进拜访</SelectItem>
                    <SelectItem value="DEMO">产品演示</SelectItem>
                    <SelectItem value="CONTRACT">合同洽谈</SelectItem>
                    <SelectItem value="SUPPORT">客户支持</SelectItem>
                    <SelectItem value="OTHER">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">开始日期 *</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-startTime">开始时间</Label>
                  <Input
                    id="edit-startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">结束日期 *</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endTime">结束时间</Label>
                  <Input
                    id="edit-endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">地点</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">备注</Label>
                <Textarea
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
  )
}
