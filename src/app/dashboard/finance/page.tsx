"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, FileText, DollarSign, AlertCircle, TrendingUp, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { FileUploader } from "@/components/file-uploader"

interface Invoice {
  id: string
  number: string
  amount: number
  taxAmount: number
  totalAmount: number
  issueDate: string
  dueDate: string
  status: string
  type: string
  description: string | null
  contract: {
    id: string
    name: string
    customer: { name: string }
  } | null
  supplier: {
    id: string
    name: string
  } | null
  payments: { amount: number; status: string }[]
}

interface Attachment {
  id: string
  name: string
  filename: string
  path: string
  size: number
  mimeType: string
  createdAt: string
}

interface Payment {
  id: string
  amount: number
  paymentDate: string
  method: string | null
  reference: string | null
  status: string
  invoice: {
    id: string
    number: string
    contract: { customer: { name: string } } | null
  } | null
  contract: {
    id: string
    name: string
    customer: { name: string }
  } | null
}

interface Payable {
  id: string
  amount: number
  paymentDate: string | null
  dueDate: string
  method: string | null
  reference: string | null
  status: string
  notes: string | null
  contract: {
    id: string
    name: string
    customer: { name: string }
  } | null
  supplier: {
    id: string
    name: string
  } | null
}

const invoiceStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  ISSUED: "bg-blue-500",
  PAID: "bg-green-500",
  OVERDUE: "bg-red-500",
  CANCELLED: "bg-gray-300"
}

const invoiceStatusNames: Record<string, string> = {
  DRAFT: "草稿",
  ISSUED: "已开",
  PAID: "已付款",
  OVERDUE: "逾期",
  CANCELLED: "已取消"
}

const invoiceTypeColors: Record<string, string> = {
  SALES: "bg-blue-500",
  PURCHASE: "bg-orange-500"
}

const invoiceTypeNames: Record<string, string> = {
  SALES: "销售发票",
  PURCHASE: "采购发票"
}

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500"
}

const paymentStatusNames: Record<string, string> = {
  PENDING: "待确认",
  COMPLETED: "已完成",
  FAILED: "失败"
}

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [payables, setPayables] = useState<Payable[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("invoices")
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isPayableDialogOpen, setIsPayableDialogOpen] = useState(false)
  const [isEditInvoiceDialogOpen, setIsEditInvoiceDialogOpen] = useState(false)
  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false)
  const [isEditPayableDialogOpen, setIsEditPayableDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [invoiceAttachments, setInvoiceAttachments] = useState<Attachment[]>([])
  const [attachmentLoading, setAttachmentLoading] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [contracts, setContracts] = useState<{ id: string; name: string; type: string; customer: { id: string; name: string }; supplier: { id: string; name: string } | null }[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [showInvoiceHint, setShowInvoiceHint] = useState(false)
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])

  const [invoiceForm, setInvoiceForm] = useState({
    number: "",
    amount: 0,
    taxAmount: 0,
    totalAmount: 0,
    issueDate: "",
    dueDate: "",
    status: "DRAFT",
    type: "SALES",
    description: "",
    contractId: "",
    supplierId: ""
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentDate: "",
    method: "",
    reference: "",
    status: "PENDING",
    invoiceId: "",
    contractId: ""
  })

  const [payableForm, setPayableForm] = useState({
    amount: 0,
    paymentDate: "",
    dueDate: "",
    method: "",
    reference: "",
    status: "PENDING",
    notes: "",
    contractId: "",
    supplierId: ""
  })

  useEffect(() => {
    fetchData()
    fetchContracts()
    fetchSuppliers()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [invoicesRes, paymentsRes, payablesRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/payments"),
        fetch("/api/payables")
      ])
      const invoicesData = await invoicesRes.json()
      const paymentsData = await paymentsRes.json()
      const payablesData = await payablesRes.json()
      setInvoices(invoicesData || [])
      setPayments(paymentsData || [])
      setPayables(payablesData || [])
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchContracts = async () => {
    try {
      const res = await fetch("/api/contracts")
      const data = await res.json()
      setContracts(data || [])
    } catch (error) {
      console.error("Failed to fetch contracts:", error)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers")
      const data = await res.json()
      setSuppliers(data || [])
    } catch (error) {
      console.error("Failed to fetch suppliers:", error)
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // 确保 totalAmount 有值
      const totalAmount = invoiceForm.totalAmount || (invoiceForm.amount + invoiceForm.taxAmount)
      await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...invoiceForm,
          totalAmount
        })
      })
      setIsInvoiceDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error("Failed to create invoice:", error)
    }
  }

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm)
      })
      setIsPaymentDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error("Failed to create payment:", error)
    }
  }

  const handleEditInvoice = async (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setInvoiceForm({
      number: invoice.number,
      amount: invoice.amount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      issueDate: new Date(invoice.issueDate).toISOString().split('T')[0],
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      status: invoice.status,
      type: invoice.type || "SALES",
      description: invoice.description || "",
      contractId: invoice.contract?.id || "",
      supplierId: invoice.supplier?.id || ""
    })
    setIsEditInvoiceDialogOpen(true)

    // Load attachments for this invoice
    setAttachmentLoading(true)
    try {
      const res = await fetch(`/api/attachments?invoiceId=${invoice.id}`)
      if (res.ok) {
        const data = await res.json()
        setInvoiceAttachments(data)
      }
    } catch (error) {
      console.error("Failed to fetch attachments:", error)
    } finally {
      setAttachmentLoading(false)
    }
  }

  const handleInvoiceAttachmentUpload = () => {
    if (editingInvoice) {
      fetch(`/api/attachments?invoiceId=${editingInvoice.id}`)
        .then(res => res.json())
        .then(data => setInvoiceAttachments(data))
    }
  }

  const handleInvoiceAttachmentDelete = (deletedId: string) => {
    setInvoiceAttachments(invoiceAttachments.filter(a => a.id !== deletedId))
  }

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingInvoice) return
    try {
      const totalAmount = invoiceForm.totalAmount || (invoiceForm.amount + invoiceForm.taxAmount)
      const res = await fetch(`/api/invoices/${editingInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...invoiceForm,
          totalAmount
        })
      })
      if (res.ok) {
        setIsEditInvoiceDialogOpen(false)
        setEditingInvoice(null)
        fetchData()
      }
    } catch (error) {
      console.error("Failed to update invoice:", error)
    }
  }

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("确定要删除此发票吗？")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Failed to delete invoice:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment)
    // Filter invoices by contract
    if (payment.contract?.id) {
      const contractInvoices = invoices.filter(inv => inv.contract?.id === payment.contract?.id)
      setFilteredInvoices(contractInvoices)
    } else {
      setFilteredInvoices([])
    }
    setPaymentForm({
      amount: payment.amount,
      paymentDate: new Date(payment.paymentDate).toISOString().split('T')[0],
      method: payment.method || "",
      reference: payment.reference || "",
      status: payment.status,
      invoiceId: payment.invoice?.id || "",
      contractId: payment.contract?.id || ""
    })
    setIsEditPaymentDialogOpen(true)
  }

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPayment) return
    try {
      const res = await fetch(`/api/payments/${editingPayment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm)
      })
      if (res.ok) {
        setIsEditPaymentDialogOpen(false)
        setEditingPayment(null)
        fetchData()
      }
    } catch (error) {
      console.error("Failed to update payment:", error)
    }
  }

  const handleDeletePayment = async (id: string) => {
    if (!confirm("确定要删除此回款吗？")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Failed to delete payment:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payableForm.contractId) {
      alert("请选择关联的委外合同")
      return
    }
    try {
      const res = await fetch("/api/payables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payableForm)
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "创建失败")
        return
      }
      setIsPayableDialogOpen(false)
      setPayableForm({
        amount: 0,
        paymentDate: "",
        dueDate: "",
        method: "",
        reference: "",
        status: "PENDING",
        notes: "",
        contractId: "",
        supplierId: ""
      })
      fetchData()
    } catch (error) {
      console.error("Failed to create payable:", error)
    }
  }

  const handleEditPayable = (payable: Payable) => {
    setEditingPayable(payable)
    setPayableForm({
      amount: payable.amount,
      paymentDate: payable.paymentDate ? new Date(payable.paymentDate).toISOString().split('T')[0] : "",
      dueDate: new Date(payable.dueDate).toISOString().split('T')[0],
      method: payable.method || "",
      reference: payable.reference || "",
      status: payable.status,
      notes: payable.notes || "",
      contractId: payable.contract?.id || "",
      supplierId: payable.supplier?.id || ""
    })
    setIsEditPayableDialogOpen(true)
  }

  const handleUpdatePayable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPayable) return
    if (!payableForm.contractId) {
      alert("请选择关联的委外合同")
      return
    }
    try {
      const res = await fetch(`/api/payables/${editingPayable.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payableForm)
      })
      if (res.ok) {
        setIsEditPayableDialogOpen(false)
        setEditingPayable(null)
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || "更新失败")
      }
    } catch (error) {
      console.error("Failed to update payable:", error)
    }
  }

  const handleDeletePayable = async (id: string) => {
    if (!confirm("确定要删除此付款记录吗？")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/payables/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Failed to delete payable:", error)
    } finally {
      setDeletingId(null)
    }
  }

  // Calculate stats - only include SALES invoices (开票), exclude PURCHASE invoices (收票)
  const salesInvoices = invoices.filter(inv => inv.type !== 'PURCHASE')
  const totalInvoiced = salesInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const totalPaid = salesInvoices.reduce((sum, inv) => {
    return sum + inv.payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((s, p) => s + p.amount, 0)
  }, 0)
  const overdueInvoices = salesInvoices.filter(inv => {
    return inv.status !== 'PAID' && new Date(inv.dueDate) < new Date()
  })
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.payments.reduce((s, p) => s + (p.status === 'COMPLETED' ? p.amount : 0), 0)), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">财务管理</h1>
          <p className="text-muted-foreground">发票与回款管理</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总开票金额</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalInvoiced.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">已回款金额</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">¥{totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">待回款金额</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{(totalInvoiced - totalPaid).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">逾期金额</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">¥{overdueAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - 移动端全宽度 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices" className="text-xs sm:text-sm">发票</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm">回款</TabsTrigger>
          <TabsTrigger value="payables" className="text-xs sm:text-sm">付款</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>发票列表</CardTitle>
                <Dialog open={isInvoiceDialogOpen} onOpenChange={(open) => {
                  if (!open) {
                    setInvoiceForm({
                      number: "",
                      amount: 0,
                      taxAmount: 0,
                      totalAmount: 0,
                      issueDate: "",
                      dueDate: "",
                      status: "DRAFT",
                      type: "SALES",
                      description: "",
                      contractId: "",
                      supplierId: ""
                    })
                  }
                  setIsInvoiceDialogOpen(open)
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      新增发票
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增发票</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateInvoice}>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label>发票号（留空自动生成）</Label>
                          <Input
                            value={invoiceForm.number}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, number: e.target.value })}
                            placeholder="手动输入或留空自动生成"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>关联合同</Label>
                          <Select
                            value={invoiceForm.contractId}
                            onValueChange={(v) => {
                              const contract = contracts.find(c => c.id === v)
                              const isOutsourcing = contract?.type === 'OUTSOURCING'
                              setInvoiceForm({
                                ...invoiceForm,
                                contractId: v,
                                type: isOutsourcing ? 'PURCHASE' : 'SALES',
                                supplierId: isOutsourcing ? (contract?.supplier?.id || '') : ''
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择合同" />
                            </SelectTrigger>
                            <SelectContent>
                              {contracts.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.type === 'OUTSOURCING' ? c.supplier?.name : c.customer?.name} - {c.name} ({c.type === 'OUTSOURCING' ? '委外' : '销售'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>总金额（含税）</Label>
                            <Input
                              type="number"
                              value={invoiceForm.totalAmount || ""}
                              placeholder="填写后自动计算税额"
                              onChange={(e) => {
                                const total = Number(e.target.value)
                                const taxRate = 0.06
                                const taxAmount = total > 0 ? Math.round(total * taxRate * 100) / 100 : 0
                                const amount = total > 0 ? Math.round((total / (1 + taxRate)) * 100) / 100 : 0
                                setInvoiceForm({
                                  ...invoiceForm,
                                  totalAmount: total,
                                  taxAmount,
                                  amount
                                })
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>金额（不含税）</Label>
                            <Input
                              type="number"
                              value={invoiceForm.amount}
                              onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>税额（6%）</Label>
                            <Input
                              type="number"
                              value={invoiceForm.taxAmount}
                              readOnly
                              className="bg-muted"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>开票日期</Label>
                            <Input
                              type="date"
                              value={invoiceForm.issueDate}
                              onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>到期日期</Label>
                            <Input
                              type="date"
                              value={invoiceForm.dueDate}
                              onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>取消</Button>
                        <Button type="submit">保存</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>发票号</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>客户/供应商</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>开票日期</TableHead>
                    <TableHead>到期日期</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">加载中...</TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">暂无数据</TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>
                          <Badge className={invoice.type === 'PURCHASE' ? 'bg-orange-500' : 'bg-blue-500'}>
                            {invoice.type === 'PURCHASE' ? '收票' : '开票'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.type === 'PURCHASE'
                            ? invoice.supplier?.name || '-'
                            : invoice.contract?.customer?.name || '-'}
                        </TableCell>
                        <TableCell>¥{invoice.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(invoice.issueDate), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>{format(new Date(invoice.dueDate), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>
                          <Badge className={invoiceStatusColors[invoice.status]}>
                            {invoiceStatusNames[invoice.status] || invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(invoice)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              disabled={deletingId === invoice.id}
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
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>回款列表</CardTitle>
                <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
                  if (!open) {
                    setFilteredInvoices([])
                    setPaymentForm({
                      amount: 0,
                      paymentDate: "",
                      method: "",
                      reference: "",
                      status: "PENDING",
                      invoiceId: "",
                      contractId: ""
                    })
                  }
                  setIsPaymentDialogOpen(open)
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      新增回款
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增回款</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreatePayment}>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label>关联合同（销售合同）</Label>
                          <Select
                            value={paymentForm.contractId}
                            onValueChange={(v) => {
                              const contractInvoices = invoices.filter(inv => inv.contract?.id === v)
                              setFilteredInvoices(contractInvoices)
                              setPaymentForm({
                                ...paymentForm,
                                contractId: v,
                                invoiceId: "",
                                amount: 0
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择销售合同" />
                            </SelectTrigger>
                            <SelectContent>
                              {contracts.filter(c => c.type === 'SALES').map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.customer?.name} - {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {paymentForm.contractId && (
                          <div className="space-y-2">
                            <Label>关联发票（可选）</Label>
                            <Select
                              value={paymentForm.invoiceId}
                              onValueChange={(v) => {
                                const invoice = invoices.find(inv => inv.id === v)
                                setPaymentForm({
                                  ...paymentForm,
                                  invoiceId: v,
                                  amount: invoice?.totalAmount || 0
                                })
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择发票（可选）" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">不关联发票</SelectItem>
                                {filteredInvoices.map((inv) => (
                                  <SelectItem key={inv.id} value={inv.id}>
                                    {inv.number} - ¥{inv.totalAmount}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>金额</Label>
                          <Input
                            type="number"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>回款日期</Label>
                            <Input
                              type="date"
                              value={paymentForm.paymentDate}
                              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>回款方式</Label>
                            <Select
                              value={paymentForm.method}
                              onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择方式" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BANK_TRANSFER">银行转账</SelectItem>
                                <SelectItem value="CASH">现金</SelectItem>
                                <SelectItem value="CHECK">支票</SelectItem>
                                <SelectItem value="OTHER">其他</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>取消</Button>
                        <Button type="submit">保存</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>客户</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>回款日期</TableHead>
                    <TableHead>方式</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">加载中...</TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">暂无数据</TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.invoice?.contract?.customer.name ||
                            payment.contract?.customer.name || '-'}
                        </TableCell>
                        <TableCell className="font-medium">¥{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(payment.paymentDate), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>{payment.method || '-'}</TableCell>
                        <TableCell>
                          <Badge className={paymentStatusColors[payment.status]}>
                            {paymentStatusNames[payment.status] || payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditPayment(payment)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeletePayment(payment.id)}
                              disabled={deletingId === payment.id}
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
        </TabsContent>

      <Dialog open={isEditInvoiceDialogOpen} onOpenChange={setIsEditInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑发票</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateInvoice}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>关联合同</Label>
                <Select
                  value={invoiceForm.contractId}
                  onValueChange={(v) => setInvoiceForm({ ...invoiceForm, contractId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择合同" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.type === 'OUTSOURCING' ? c.supplier?.name : c.customer?.name} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>总金额（含税）</Label>
                  <Input
                    type="number"
                    value={invoiceForm.totalAmount || ""}
                    placeholder="填写后自动计算税额"
                    onChange={(e) => {
                      const total = Number(e.target.value)
                      const taxRate = 0.06
                      const taxAmount = total > 0 ? Math.round(total * taxRate * 100) / 100 : 0
                      const amount = total > 0 ? Math.round((total / (1 + taxRate)) * 100) / 100 : 0
                      setInvoiceForm({
                        ...invoiceForm,
                        totalAmount: total,
                        taxAmount,
                        amount
                      })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>金额（不含税）</Label>
                  <Input
                    type="number"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>税额（6%）</Label>
                  <Input
                    type="number"
                    value={invoiceForm.taxAmount}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={invoiceForm.status}
                  onValueChange={(v) => setInvoiceForm({ ...invoiceForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">草稿</SelectItem>
                    <SelectItem value="ISSUED">已开</SelectItem>
                    <SelectItem value="PAID">已付款</SelectItem>
                    <SelectItem value="OVERDUE">逾期</SelectItem>
                    <SelectItem value="CANCELLED">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开票日期</Label>
                  <Input
                    type="date"
                    value={invoiceForm.issueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>到期日期</Label>
                  <Input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>附件</Label>
                {attachmentLoading ? (
                  <p className="text-sm text-muted-foreground">加载中...</p>
                ) : editingInvoice ? (
                  <FileUploader
                    invoiceId={editingInvoice.id}
                    attachments={invoiceAttachments}
                    onUpload={handleInvoiceAttachmentUpload}
                    onDelete={handleInvoiceAttachmentDelete}
                  />
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditInvoiceDialogOpen(false)}>取消</Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditPaymentDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setFilteredInvoices([])
        }
        setIsEditPaymentDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑回款</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePayment}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>关联合同</Label>
                <Select
                  value={paymentForm.contractId}
                  onValueChange={(v) => {
                    const contractInvoices = invoices.filter(inv => inv.contract?.id === v)
                    setFilteredInvoices(contractInvoices)
                    setPaymentForm({
                      ...paymentForm,
                      contractId: v,
                      invoiceId: "",
                      amount: 0
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择合同" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.filter(c => c.type === 'SALES').map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.customer?.name} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {paymentForm.contractId && (
                <div className="space-y-2">
                  <Label>关联发票（可选）</Label>
                  <Select
                    value={paymentForm.invoiceId || "none"}
                    onValueChange={(v) => {
                      const invoice = invoices.find(inv => inv.id === v)
                      setPaymentForm({
                        ...paymentForm,
                        invoiceId: v === "none" ? "" : v,
                        amount: v === "none" ? 0 : (invoice?.totalAmount || paymentForm.amount)
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择发票（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不关联发票</SelectItem>
                      {filteredInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.number} - ¥{inv.totalAmount}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>金额</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={paymentForm.status}
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">待确认</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                    <SelectItem value="FAILED">失败</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>回款日期</Label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>回款方式</Label>
                  <Select
                    value={paymentForm.method}
                    onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">银行转账</SelectItem>
                      <SelectItem value="CASH">现金</SelectItem>
                      <SelectItem value="CHECK">支票</SelectItem>
                      <SelectItem value="OTHER">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditPaymentDialogOpen(false)}>取消</Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payables Tab Content */}
      <TabsContent value="payables">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>付款列表</CardTitle>
              <Dialog open={isPayableDialogOpen} onOpenChange={setIsPayableDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    新增付款
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新增付款记录</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePayable}>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>关联委外合同 *</Label>
                        <Select
                          value={payableForm.contractId}
                          onValueChange={(value) => {
                            const contract = contracts.find(c => c.id === value)
                            setPayableForm({
                              ...payableForm,
                              contractId: value,
                              supplierId: contract?.supplier?.id || ""
                            })
                          }}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择委外合同" />
                          </SelectTrigger>
                          <SelectContent>
                            {contracts.filter(c => c.type === 'OUTSOURCING').map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.supplier?.name} - {c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>应付金额</Label>
                          <Input
                            type="number"
                            value={payableForm.amount}
                            onChange={(e) => setPayableForm({ ...payableForm, amount: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>到期日期</Label>
                          <Input
                            type="date"
                            value={payableForm.dueDate}
                            onChange={(e) => setPayableForm({ ...payableForm, dueDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>状态</Label>
                        <Select
                          value={payableForm.status}
                          onValueChange={(value) => setPayableForm({ ...payableForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">待确认</SelectItem>
                            <SelectItem value="COMPLETED">已完成</SelectItem>
                            <SelectItem value="FAILED">失败</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>付款日期</Label>
                          <Input
                            type="date"
                            value={payableForm.paymentDate}
                            onChange={(e) => setPayableForm({ ...payableForm, paymentDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>付款方式</Label>
                          <Select
                            value={payableForm.method}
                            onValueChange={(value) => setPayableForm({ ...payableForm, method: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择方式" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BANK_TRANSFER">银行转账</SelectItem>
                              <SelectItem value="CASH">现金</SelectItem>
                              <SelectItem value="CHECK">支票</SelectItem>
                              <SelectItem value="OTHER">其他</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>备注</Label>
                        <Input
                          value={payableForm.notes}
                          onChange={(e) => setPayableForm({ ...payableForm, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsPayableDialogOpen(false)}>取消</Button>
                      <Button type="submit">保存</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>供应商</TableHead>
                  <TableHead>关联合同</TableHead>
                  <TableHead>应付金额</TableHead>
                  <TableHead>到期日期</TableHead>
                  <TableHead>付款日期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">加载中...</TableCell>
                  </TableRow>
                ) : payables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">暂无数据</TableCell>
                  </TableRow>
                ) : (
                  payables.map((payable) => (
                    <TableRow key={payable.id}>
                      <TableCell>{payable.supplier?.name || "-"}</TableCell>
                      <TableCell>{payable.contract?.name || "-"}</TableCell>
                      <TableCell>¥{payable.amount.toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(payable.dueDate), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>{payable.paymentDate ? format(new Date(payable.paymentDate), 'yyyy-MM-dd') : "-"}</TableCell>
                      <TableCell>
                        <Badge className={paymentStatusColors[payable.status]}>
                          {paymentStatusNames[payable.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditPayable(payable)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePayable(payable.id)}>
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
      </TabsContent>
      </Tabs>

      {/* Edit Payable Dialog */}
      <Dialog open={isEditPayableDialogOpen} onOpenChange={setIsEditPayableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑付款记录</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePayable}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>关联委外合同 *</Label>
                <Select
                  value={payableForm.contractId}
                  onValueChange={(value) => {
                    const contract = contracts.find(c => c.id === value)
                    setPayableForm({
                      ...payableForm,
                      contractId: value,
                      supplierId: contract?.supplier?.id || ""
                    })
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择委外合同" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.filter(c => c.type === 'OUTSOURCING').map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.supplier?.name} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>应付金额</Label>
                  <Input
                    type="number"
                    value={payableForm.amount}
                    onChange={(e) => setPayableForm({ ...payableForm, amount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>到期日期</Label>
                  <Input
                    type="date"
                    value={payableForm.dueDate}
                    onChange={(e) => setPayableForm({ ...payableForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={payableForm.status}
                  onValueChange={(value) => setPayableForm({ ...payableForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">待确认</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                    <SelectItem value="FAILED">失败</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>付款日期</Label>
                  <Input
                    type="date"
                    value={payableForm.paymentDate}
                    onChange={(e) => setPayableForm({ ...payableForm, paymentDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>付款方式</Label>
                  <Select
                    value={payableForm.method}
                    onValueChange={(value) => setPayableForm({ ...payableForm, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">银行转账</SelectItem>
                      <SelectItem value="CASH">现金</SelectItem>
                      <SelectItem value="CHECK">支票</SelectItem>
                      <SelectItem value="OTHER">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Input
                  value={payableForm.notes}
                  onChange={(e) => setPayableForm({ ...payableForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditPayableDialogOpen(false)}>取消</Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
