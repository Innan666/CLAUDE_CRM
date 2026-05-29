"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Handshake, Plus, Search, LayoutList, LayoutGrid, MoreHorizontal,
  Pencil, Trash2, Phone, Mail, Calendar, Tag, Building2, Globe
} from "lucide-react"

interface Partner {
  id: string
  name: string
  code: string
  type: string
  level: string | null
  status: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  industry: string | null
  region: string | null
  capabilities: string | null
  tags: string[]
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const TYPE_LABELS: Record<string, string> = {
  AGENT: "代理商", TECH: "技术伙伴", CHANNEL: "渠道商", STRATEGIC: "战略合作", OTHER: "其他",
}
const LEVEL_LABELS: Record<string, string> = { GOLD: "金牌", SILVER: "银牌", BRONZE: "铜牌" }
const STATUS_LABELS: Record<string, string> = {
  NEGOTIATING: "洽谈中", ACTIVE: "合作中", SUSPENDED: "已暂停", TERMINATED: "已终止",
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    AGENT: "bg-indigo-100 text-indigo-700",
    TECH: "bg-violet-100 text-violet-700",
    CHANNEL: "bg-blue-100 text-blue-700",
    STRATEGIC: "bg-purple-100 text-purple-700",
    OTHER: "bg-gray-100 text-gray-600",
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || colors.OTHER}`}>{TYPE_LABELS[type] || type}</span>
}

function LevelBadge({ level }: { level: string | null }) {
  if (!level) return null
  const colors: Record<string, string> = {
    GOLD: "bg-amber-100 text-amber-700", SILVER: "bg-slate-100 text-slate-600", BRONZE: "bg-orange-100 text-orange-700",
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || ""}`}>{LEVEL_LABELS[level] || level}</span>
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    NEGOTIATING: "bg-blue-100 text-blue-700",
    SUSPENDED: "bg-yellow-100 text-yellow-700",
    TERMINATED: "bg-red-100 text-red-600",
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || ""}`}>{STATUS_LABELS[status] || status}</span>
}

function PartnerAvatar({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
      {name.charAt(0)}
    </div>
  )
}

const EMPTY_FORM = {
  name: "", type: "OTHER", level: "", status: "NEGOTIATING",
  contact: "", phone: "", email: "", address: "",
  industry: "", region: "", capabilities: "", tags: "",
  startDate: "", endDate: "", notes: "",
}

// ── PartnerForm 必须定义在 PartnersPage 外部，否则每次父组件渲染都会销毁重建输入框 ──
interface PartnerFormProps {
  formData: typeof EMPTY_FORM
  setFormData: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
}

function PartnerForm({ formData, setFormData }: PartnerFormProps) {
  return (
    <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="col-span-2">
        <Label>名称 *</Label>
        <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="合作伙伴名称" className="mt-1" />
      </div>
      <div>
        <Label>合作类型 *</Label>
        <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>合作等级</Label>
        <Select value={formData.level || "NONE"} onValueChange={v => setFormData(p => ({ ...p, level: v === "NONE" ? "" : v }))}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="不设等级" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">不设等级</SelectItem>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>合作状态 *</Label>
        <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>联系人</Label>
        <Input value={formData.contact} onChange={e => setFormData(p => ({ ...p, contact: e.target.value }))} placeholder="主要联系人" className="mt-1" />
      </div>
      <div>
        <Label>电话</Label>
        <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="联系电话" className="mt-1" />
      </div>
      <div>
        <Label>邮箱</Label>
        <Input value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="邮箱地址" className="mt-1" />
      </div>
      <div>
        <Label>擅长行业</Label>
        <Input value={formData.industry} onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))} placeholder="如：制造业、金融" className="mt-1" />
      </div>
      <div>
        <Label>覆盖地区</Label>
        <Input value={formData.region} onChange={e => setFormData(p => ({ ...p, region: e.target.value }))} placeholder="如：华东、全国" className="mt-1" />
      </div>
      <div className="col-span-2">
        <Label>地址</Label>
        <Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="公司地址" className="mt-1" />
      </div>
      <div className="col-span-2">
        <Label>核心能力</Label>
        <Textarea value={formData.capabilities} onChange={e => setFormData(p => ({ ...p, capabilities: e.target.value }))} placeholder="描述该伙伴的核心能力或产品" className="mt-1" rows={2} />
      </div>
      <div className="col-span-2">
        <Label>资源标签</Label>
        <Input value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} placeholder="用逗号分隔，如：ERP实施, 云服务, 售后支持" className="mt-1" />
      </div>
      <div>
        <Label>合作开始日期</Label>
        <Input type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} className="mt-1" />
      </div>
      <div>
        <Label>合作到期日期</Label>
        <Input type="date" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} className="mt-1" />
      </div>
      <div className="col-span-2">
        <Label>备注</Label>
        <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="其他备注信息" className="mt-1" rows={2} />
      </div>
    </div>
  )
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"table" | "card">("card")
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterLevel, setFilterLevel] = useState("ALL")
  const [page, setPage] = useState(1)
  const limit = 20

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const fetchPartners = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set("search", search)
      if (filterType !== "ALL") params.set("type", filterType)
      if (filterStatus !== "ALL") params.set("status", filterStatus)
      if (filterLevel !== "ALL") params.set("level", filterLevel)
      const res = await fetch(`/api/partners?${params}`)
      const data = await res.json()
      setPartners(data.data || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterType, filterStatus, filterLevel])

  useEffect(() => { fetchPartners() }, [fetchPartners])
  useEffect(() => { setPage(1) }, [search, filterType, filterStatus, filterLevel])

  function openEdit(partner: Partner) {
    setEditingPartner(partner)
    setFormData({
      name: partner.name,
      type: partner.type,
      level: partner.level || "",
      status: partner.status,
      contact: partner.contact || "",
      phone: partner.phone || "",
      email: partner.email || "",
      address: partner.address || "",
      industry: partner.industry || "",
      region: partner.region || "",
      capabilities: partner.capabilities || "",
      tags: partner.tags.join(", "),
      startDate: partner.startDate ? partner.startDate.slice(0, 10) : "",
      endDate: partner.endDate ? partner.endDate.slice(0, 10) : "",
      notes: partner.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  async function handleSubmit(isEdit: boolean) {
    if (!formData.name.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        level: formData.level || null,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      }
      if (isEdit && editingPartner) {
        await fetch(`/api/partners/${editingPartner.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        setIsEditDialogOpen(false)
      } else {
        await fetch("/api/partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        setIsDialogOpen(false)
      }
      setFormData(EMPTY_FORM)
      fetchPartners()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除该合作伙伴？")) return
    await fetch(`/api/partners/${id}`, { method: "DELETE" })
    fetchPartners()
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">合作伙伴</h1>
            <p className="text-sm text-muted-foreground">资源地图 · 共 {total} 家</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={o => { setIsDialogOpen(o); if (!o) setFormData(EMPTY_FORM) }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Plus className="w-4 h-4" /> 新增伙伴
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>新增合作伙伴</DialogTitle></DialogHeader>
            <PartnerForm formData={formData} setFormData={setFormData} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
              <Button onClick={() => handleSubmit(false)} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {submitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 筛选工具栏 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索名称、联系人、行业、标签..." className="pl-9" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="全部类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部类型</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="全部状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-32"><SelectValue placeholder="全部等级" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部等级</SelectItem>
                {Object.entries(LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 transition-colors ${viewMode === "table" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`px-3 py-2 transition-colors ${viewMode === "card" ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 列表视图 */}
      {viewMode === "table" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>合作伙伴</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>行业 / 地区</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>合作周期</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : partners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Handshake className="w-10 h-10 opacity-30" />
                        <p className="text-sm">暂无合作伙伴，点击右上角新增</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : partners.map(p => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PartnerAvatar name={p.name} />
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><TypeBadge type={p.type} /></TableCell>
                    <TableCell><LevelBadge level={p.level} /></TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell>
                      <div className="text-sm space-y-0.5">
                        {p.industry && <p className="text-foreground">{p.industry}</p>}
                        {p.region && <p className="text-muted-foreground text-xs">{p.region}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-0.5">
                        {p.contact && <p>{p.contact}</p>}
                        {p.phone && <p className="text-muted-foreground text-xs">{p.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {p.startDate && <p>开始: {p.startDate.slice(0, 10)}</p>}
                        {p.endDate && <p>到期: {p.endDate.slice(0, 10)}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)} className="gap-2">
                            <Pencil className="w-4 h-4" /> 编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(p.id)} className="gap-2 text-red-600 focus:text-red-600">
                            <Trash2 className="w-4 h-4" /> 删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 卡片视图 */}
      {viewMode === "card" && (
        loading ? (
          <div className="text-center py-16 text-muted-foreground">加载中...</div>
        ) : partners.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Handshake className="w-10 h-10 opacity-30" />
            <p className="text-sm">暂无合作伙伴，点击右上角新增</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map(p => (
              <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <PartnerAvatar name={p.name} />
                      <div>
                        <p className="font-semibold text-sm leading-tight">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.code}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)} className="gap-2"><Pencil className="w-4 h-4" /> 编辑</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(p.id)} className="gap-2 text-red-600 focus:text-red-600"><Trash2 className="w-4 h-4" /> 删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <TypeBadge type={p.type} />
                    <LevelBadge level={p.level} />
                    <StatusBadge status={p.status} />
                  </div>

                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                          <Tag className="w-2.5 h-2.5" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-3">
                    {(p.contact || p.phone) && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{[p.contact, p.phone].filter(Boolean).join(" · ")}</span>
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{p.email}</span>
                      </div>
                    )}
                    {(p.industry || p.region) && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span>{[p.industry, p.region].filter(Boolean).join(" · ")}</span>
                      </div>
                    )}
                    {p.startDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>合作始于 {p.startDate.slice(0, 10)}</span>
                      </div>
                    )}
                    {p.capabilities && (
                      <div className="flex items-start gap-1.5 mt-1">
                        <Globe className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{p.capabilities}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* 分页 */}
      {total > limit && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {total} 条记录</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>上一页</Button>
            <span className="flex items-center px-3">第 {page} / {Math.ceil(total / limit)} 页</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / limit)}>下一页</Button>
          </div>
        </div>
      )}

      {/* 编辑 Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={o => { setIsEditDialogOpen(o); if (!o) { setEditingPartner(null); setFormData(EMPTY_FORM) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>编辑合作伙伴</DialogTitle></DialogHeader>
          <PartnerForm formData={formData} setFormData={setFormData} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
            <Button onClick={() => handleSubmit(true)} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {submitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
