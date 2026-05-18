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
import { Checkbox } from "@/components/ui/checkbox"
import { Phone, Mail, MapPin, Calendar, Target, User, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"

interface Contact {
  id: string
  name: string
  position: string | null
  phone: string | null
  email: string | null
  isPrimary: boolean
}

interface Customer {
  id: string
  name: string
  industry: string | null
  source: string | null
  level: string | null
  phone: string | null
  email: string | null
  address: string | null
  description: string | null
  createdAt: string
  contacts: Contact[]
  contracts: {
    id: string
    name: string
    number: string
    amount: number
    status: string
    type: string
  }[]
}

const levelColors: Record<string, string> = {
  A: "bg-red-500",
  B: "bg-yellow-500",
  C: "bg-green-500"
}

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

const contractStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
 PENDING: "bg-yellow-500",
  SIGNED: "bg-blue-500",
  ACTIVE: "bg-green-500",
  COMPLETED: "bg-purple-500",
  CANCELLED: "bg-red-500"
}

const contractStatusNames: Record<string, string> = {
  DRAFT: "草稿",
  PENDING: "待签",
  SIGNED: "已签",
  ACTIVE: "执行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
}

const visitStatusColors: Record<string, string> = {
  PLANNED: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-gray-500"
}

const visitStatusNames: Record<string, string> = {
  PLANNED: "计划中",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
}

const visitTypeNames: Record<string, string> = {
  FIRST_MEETING: "首次拜访",
  FOLLOW_UP: "跟进拜访",
  DEMO: "产品演示",
  CONTRACT: "合同洽谈",
  SUPPORT: "客户支持",
  OTHER: "其他"
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string | undefined

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({
    name: "",
    position: "",
    phone: "",
    email: "",
    isPrimary: false
  })

  useEffect(() => {
    if (id) {
      fetchCustomer()
    }
  }, [id])

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${id}`)
      if (res.ok) {
        const data = await res.json()
        setCustomer(data)
      }
    } catch (error) {
      console.error("Failed to fetch customer:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contactForm,
          customerId: customer.id
        })
      })
      if (res.ok) {
        setIsContactDialogOpen(false)
        setContactForm({
          name: "",
          position: "",
          phone: "",
          email: "",
          isPrimary: false
        })
        fetchCustomer()
      }
    } catch (error) {
      console.error("Failed to create contact:", error)
    }
  }

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setContactForm({
      name: contact.name,
      position: contact.position || "",
      phone: contact.phone || "",
      email: contact.email || "",
      isPrimary: contact.isPrimary
    })
    setIsEditContactDialogOpen(true)
  }

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingContact || !customer) return
    try {
      const res = await fetch(`/api/contacts/${editingContact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contactForm,
          customerId: customer.id
        })
      })
      if (res.ok) {
        setIsEditContactDialogOpen(false)
        setEditingContact(null)
        fetchCustomer()
      }
    } catch (error) {
      console.error("Failed to update contact:", error)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("确定要删除此联系人吗？")) return
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE"
      })
      if (res.ok) {
        fetchCustomer()
      }
    } catch (error) {
      console.error("Failed to delete contact:", error)
    }
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  if (!customer) {
    return <div className="p-6">客户不存在</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {customer.industry && <span className="text-muted-foreground">{customer.industry}</span>}
            {customer.level && (
              <Badge className={levelColors[customer.level]}>
                {customer.level}级客户
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/calendar?customer=${customer.id}`}>
              <Calendar className="w-4 h-4 mr-2" />
              创建拜访
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/opportunities/new?customer=${customer.id}`}>
              <Target className="w-4 h-4 mr-2" />
              创建商机
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.source && (
              <div>
                <div className="text-sm text-muted-foreground">来源</div>
                <div>{customer.source}</div>
              </div>
            )}
            {customer.description && (
              <div>
                <div className="text-sm text-muted-foreground">备注</div>
                <div>{customer.description}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">创建时间</div>
              <div>{format(new Date(customer.createdAt), 'yyyy-MM-dd')}</div>
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>联系人</span>
              <Button size="sm" variant="outline" onClick={() => setIsContactDialogOpen(true)}>新增联系人</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.contacts.length === 0 ? (
              <p className="text-muted-foreground">暂无联系人</p>
            ) : (
              <div className="space-y-2">
                {customer.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {contact.name}
                          {contact.isPrimary && <Badge variant="secondary" className="ml-2">主要</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">{contact.position}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm mr-2">
                        {contact.phone && <div>{contact.phone}</div>}
                        {contact.email && <div className="text-muted-foreground">{contact.email}</div>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleEditContact(contact)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteContact(contact.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opportunities - just show links since this is a basic implementation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>商机</span>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/opportunities?customer=${customer.id}`}>查看全部</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">暂无商机</p>
          </CardContent>
        </Card>

        {/* Contracts */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>合同</span>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/contracts?customer=${customer.id}`}>查看全部</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.contracts && customer.contracts.length > 0 ? (
              <div className="space-y-3">
                {customer.contracts.map((contract) => (
                  <Link
                    key={contract.id}
                    href={`/dashboard/contracts/${contract.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{contract.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {contract.number} · ¥{contract.amount.toLocaleString()}
                      </div>
                    </div>
                    <Badge className={contractStatusColors[contract.status]}>
                      {contractStatusNames[contract.status] || contract.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">暂无合同</p>
            )}
          </CardContent>
        </Card>

        {/* Visit Timeline */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>拜访记录</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">暂无拜访记录</p>
          </CardContent>
        </Card>
      </div>

      {/* New Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增联系人</DialogTitle>
            <DialogDescription>填写联系人信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateContact}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input
                  id="name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">职位</Label>
                <Input
                  id="position"
                  value={contactForm.position}
                  onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">电话</Label>
                  <Input
                    id="phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPrimary"
                  checked={contactForm.isPrimary}
                  onCheckedChange={(checked) => setContactForm({ ...contactForm, isPrimary: checked as boolean })}
                />
                <Label htmlFor="isPrimary" className="cursor-pointer">设为主要联系人</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsContactDialogOpen(false)}>取消</Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditContactDialogOpen} onOpenChange={setIsEditContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑联系人</DialogTitle>
            <DialogDescription>修改联系人信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateContact}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">姓名 *</Label>
                <Input
                  id="edit-name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">职位</Label>
                <Input
                  id="edit-position"
                  value={contactForm.position}
                  onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">电话</Label>
                  <Input
                    id="edit-phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">邮箱</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-isPrimary"
                  checked={contactForm.isPrimary}
                  onCheckedChange={(checked) => setContactForm({ ...contactForm, isPrimary: checked as boolean })}
                />
                <Label htmlFor="edit-isPrimary" className="cursor-pointer">设为主要联系人</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditContactDialogOpen(false)}>取消</Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
