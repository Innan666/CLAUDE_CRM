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
import { ArrowLeft, DollarSign, Calendar, User, Pencil, Trash2, FileText, Package } from "lucide-react"
import { format } from "date-fns"
import { FileUploader } from "@/components/file-uploader"
import { statusColors, statusNames } from "@/lib/contract-constants"

const invoiceStatusNames: Record<string, string> = {
  DRAFT: "草稿",
  ISSUED: "已开",
  PAID: "已付款",
  OVERDUE: "逾期",
  CANCELLED: "已取消"
}

const paymentStatusNames: Record<string, string> = {
  PENDING: "待确认",
  COMPLETED: "已完成",
  FAILED: "失败"
}

const statuses = Object.entries(statusNames).map(([id, name]) => ({ id, name }))

interface Attachment {
  id: string
  name: string
  filename: string
  path: string
  size: number
  mimeType: string
  createdAt: string
}

interface Contract {
  id: string
  name: string
  number: string
  amount: number
  status: string
  type: string
  startDate: string | null
  endDate: string | null
  terms: string | null
  customer: {
    id: string
    name: string
  } | null
  supplier: {
    id: string
    name: string
  } | null
  opportunity: {
    id: string
    name: string
  } | null
  salesContract: {
    id: string
    name: string
    amount: number
  } | null
  outsourcingContracts: {
    id: string
    name: string
    amount: number
    supplier: {
      id: string
      name: string
    } | null
  }[]
  grossProfit: number
  grossProfitRate: number
  invoices: {
    id: string
    amount: number
    type: string
    status: string
    issueDate: string
  }[]
  payments: {
    id: string
    amount: number
    status: string
    paymentDate: string
  }[]
  createdAt: Date
}

export default function ContractDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string | undefined

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachmentLoading, setAttachmentLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    amount: 0,
    status: "DRAFT",
    startDate: "",
    endDate: "",
    terms: "",
    salesContractId: ""
  })

  useEffect(() => {
    if (!id) return
    fetchContract()
    fetchAttachments()
  }, [id])

  if (!id) {
    return <div className="p-6">加载中...</div>
  }

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`)
      const data = await res.json()
      if (res.ok) {
        setContract(data)
        setFormData({
          name: data.name,
          number: data.number || "",
          amount: data.amount,
          status: data.status,
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "",
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : "",
          terms: data.terms || "",
          salesContractId: data.salesContract?.id || ""
        })
      } else {
        setError(data.error || "加载失败")
      }
    } catch (error) {
      console.error("Failed to fetch contract:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/attachments?contractId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setAttachments(data)
      }
    } catch (error) {
      console.error("Failed to fetch attachments:", error)
    } finally {
      setAttachmentLoading(false)
    }
  }

  const handleAttachmentUpload = () => {
    fetchAttachments()
  }

  const handleAttachmentDelete = (deletedId: string) => {
    setAttachments(attachments.filter(a => a.id !== deletedId))
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsEditDialogOpen(false)
        fetchContract()
      } else {
        const data = await res.json()
        alert(data.error || "更新失败")
      }
    } catch (error) {
      console.error("Failed to update contract:", error)
      alert("更新失败，请重试")
    }
  }

  const handleDelete = async () => {
    if (!confirm("确定要删除这个合同吗？")) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        router.push("/dashboard/contracts")
      } else {
        const data = await res.json()
        alert(data.error || "删除失败")
      }
    } catch (error) {
      console.error("Failed to delete contract:", error)
      alert("删除失败，请重试")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">错误: {error}</div>
  }

  if (!contract) {
    return <div className="p-6">合同不存在</div>
  }

  const isOutsourcing = contract.type === 'OUTSOURCING'
  const totalInvoiced = contract.invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0
  const totalPaid = contract.payments?.reduce((sum, pay) => sum + pay.amount, 0) || 0
  const remainingAmount = contract.amount - totalPaid

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/contracts">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回合同列表
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
          <h1 className="text-2xl font-bold">{contract.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground">合同编号: {contract.number}</span>
            <Badge className={statusColors[contract.status]}>
              {statusNames[contract.status]}
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
              <div className="text-sm text-muted-foreground">合同金额</div>
              <div className="text-lg font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                {contract.amount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{isOutsourcing ? '已收发票金额' : '已开票金额'}</div>
              <div>{totalInvoiced.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{isOutsourcing ? '已付款金额' : '已回款金额'}</div>
              <div className="text-green-600">{totalPaid.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{isOutsourcing ? '未付款金额' : '待回款金额'}</div>
              <div className="text-orange-600">{remainingAmount.toLocaleString()}</div>
            </div>
            {contract.startDate && (
              <div>
                <div className="text-sm text-muted-foreground">开始日期</div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  {format(new Date(contract.startDate), 'yyyy-MM-dd')}
                </div>
              </div>
            )}
            {contract.endDate && (
              <div>
                <div className="text-sm text-muted-foreground">结束日期</div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  {format(new Date(contract.endDate), 'yyyy-MM-dd')}
                </div>
              </div>
            )}
            {contract.terms && (
              <div>
                <div className="text-sm text-muted-foreground">合同条款</div>
                <div className="text-sm">{contract.terms}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">创建时间</div>
              <div>{format(new Date(contract.createdAt), 'yyyy-MM-dd HH:mm')}</div>
            </div>
          </CardContent>
        </Card>

        {/* Customer/Supplier Info */}
        <Card>
          <CardHeader>
            <CardTitle>{contract.type === 'OUTSOURCING' ? '关联供应商' : '关联客户'}</CardTitle>
          </CardHeader>
          <CardContent>
            {contract.type === 'OUTSOURCING' && contract.supplier ? (
              <Link
                href={`/dashboard/suppliers/${contract.supplier.id}`}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-medium">{contract.supplier.name}</div>
                  <div className="text-sm text-muted-foreground">查看供应商详情</div>
                </div>
              </Link>
            ) : contract.customer ? (
              <Link
                href={`/dashboard/customers/${contract.customer.id}`}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{contract.customer.name}</div>
                  <div className="text-sm text-muted-foreground">查看客户详情</div>
                </div>
              </Link>
            ) : (
              <div className="text-muted-foreground">无</div>
            )}
          </CardContent>
        </Card>

        {/* Opportunity */}
        {contract.opportunity && (
          <Card>
            <CardHeader>
              <CardTitle>关联商机</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/dashboard/opportunities/${contract.opportunity.id}`}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{contract.opportunity.name}</div>
                  <div className="text-sm text-muted-foreground">查看商机详情</div>
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Gross Profit Info - Only for Sales Contracts */}
        {contract.type === 'SALES' && (
          <Card>
            <CardHeader>
              <CardTitle>毛利信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">销售合同金额</div>
                  <div className="text-lg font-medium">¥{contract.amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">委外成本合计</div>
                  <div className="text-lg font-medium text-orange-600">
                    ¥{contract.outsourcingContracts.reduce((sum, oc) => sum + oc.amount, 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">毛利</div>
                  <div className={`text-xl font-bold ${contract.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ¥{contract.grossProfit.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">毛利率</div>
                  <div className={`text-xl font-bold ${contract.grossProfitRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {contract.grossProfitRate.toFixed(2)}%
                  </div>
                </div>
              </div>
              {contract.outsourcingContracts.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">关联委外合同</div>
                  <div className="space-y-2">
                    {contract.outsourcingContracts.map((oc) => (
                      <Link
                        key={oc.id}
                        href={`/dashboard/contracts/${oc.id}`}
                        className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                      >
                        <span className="text-sm">{oc.name}</span>
                        <span className="text-sm text-orange-600">¥{oc.amount.toLocaleString()}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Linked Sales Contract - Only for Outsourcing Contracts */}
        {contract.type === 'OUTSOURCING' && contract.salesContract && (
          <Card>
            <CardHeader>
              <CardTitle>关联销售合同</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/dashboard/contracts/${contract.salesContract.id}`}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{contract.salesContract.name}</div>
                  <div className="text-sm text-muted-foreground">
                    合同金额: ¥{contract.salesContract.amount.toLocaleString()}
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>合同附件</CardTitle>
          </CardHeader>
          <CardContent>
            {attachmentLoading ? (
              <p className="text-muted-foreground">加载中...</p>
            ) : (
              <FileUploader
                contractId={id}
                attachments={attachments}
                onUpload={handleAttachmentUpload}
                onDelete={handleAttachmentDelete}
              />
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{isOutsourcing ? '收票记录' : '发票记录'}</CardTitle>
          </CardHeader>
          <CardContent>
            {!contract.invoices || contract.invoices.length === 0 ? (
              <p className="text-muted-foreground">暂无发票记录</p>
            ) : (
              <div className="space-y-2">
                {contract.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">¥{invoice.amount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.type === 'PURCHASE' ? '收票' : '开票'}日: {format(new Date(invoice.issueDate), 'yyyy-MM-dd')}
                      </div>
                    </div>
                    <Badge className={statusColors[invoice.status]}>
                      {invoiceStatusNames[invoice.status] || invoice.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{isOutsourcing ? '付款记录' : '回款记录'}</CardTitle>
          </CardHeader>
          <CardContent>
            {!contract.payments || contract.payments.length === 0 ? (
              <p className="text-muted-foreground">{isOutsourcing ? '暂无付款记录' : '暂无回款记录'}</p>
            ) : (
              <div className="space-y-2">
                {contract.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-green-600">¥{payment.amount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {isOutsourcing ? '付款' : '回款'}日期: {format(new Date(payment.paymentDate), 'yyyy-MM-dd')}
                      </div>
                    </div>
                    <Badge className={statusColors[payment.status]}>
                      {paymentStatusNames[payment.status] || payment.status}
                    </Badge>
                  </div>
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
            <DialogTitle>编辑合同</DialogTitle>
            <DialogDescription>修改合同信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">合同名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-number">合同编号</Label>
                <Input
                  id="edit-number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                />
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
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">金额</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
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
                <Label htmlFor="edit-terms">合同条款</Label>
                <Input
                  id="edit-terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
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
