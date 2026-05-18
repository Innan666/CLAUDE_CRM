"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Plus, FileText, Search, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { statusColors, statusNames, typeColors, typeNames } from "@/lib/contract-constants"

interface Contract {
  id: string
  name: string
  number: string
  amount: number
  startDate: string | null
  endDate: string | null
  status: string
  type: string
  invoicedAmount: number
  paidAmount: number
  customer: {
    id: string
    name: string
  }
  supplier: {
    id: string
    name: string
  } | null
  _count: {
    invoices: number
    payments: number
    payables: number
  }
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [salesContracts, setSalesContracts] = useState<{ id: string; name: string; amount: number }[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    amount: 0,
    startDate: "",
    endDate: "",
    status: "DRAFT",
    type: "SALES",
    customerId: "",
    supplierId: "",
    salesContractId: ""
  })

  useEffect(() => {
    fetchContracts()
  }, [typeFilter])

  useEffect(() => {
    fetchCustomers()
    fetchSuppliers()
    fetchSalesContracts()
  }, [])

  const fetchContracts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== "all") params.append("type", typeFilter)
      const res = await fetch(`/api/contracts?${params}`)
      const data = await res.json()
      setContracts(data || [])
    } catch (error) {
      console.error("Failed to fetch contracts:", error)
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

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers")
      const data = await res.json()
      setSuppliers(data || [])
    } catch (error) {
      console.error("Failed to fetch suppliers:", error)
    }
  }

  const fetchSalesContracts = async () => {
    try {
      const res = await fetch("/api/contracts?type=SALES")
      const data = await res.json()
      setSalesContracts(data || [])
    } catch (error) {
      console.error("Failed to fetch sales contracts:", error)
    }
  }

  const buildContractPayload = (data: typeof formData) => {
    const payload: Record<string, unknown> = {
      name: data.name,
      number: data.number || undefined,
      amount: data.amount || 0,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      status: data.status,
      type: data.type
    }
    if (data.type === "OUTSOURCING") {
      payload.supplierId = data.supplierId || null
      payload.salesContractId = data.salesContractId || null
    } else {
      payload.customerId = data.customerId || null
    }
    return payload
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildContractPayload(formData))
      })
      if (res.ok) {
        setIsDialogOpen(false)
        setFormData({
          name: "",
          number: "",
          amount: 0,
          startDate: "",
          endDate: "",
          status: "DRAFT",
          type: "SALES",
          customerId: "",
          supplierId: "",
          salesContractId: ""
        })
        fetchContracts()
      } else {
        const data = await res.json()
        alert(data.error || "保存失败，请重试")
      }
    } catch (error) {
      console.error("Failed to create contract:", error)
      alert("保存失败，请重试")
    }
  }

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract)
    setFormData({
      name: contract.name,
      number: contract.number,
      amount: contract.amount,
      startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : "",
      endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : "",
      status: contract.status,
      type: contract.type,
      customerId: contract.customer?.id || "",
      supplierId: contract.supplier?.id || "",
      salesContractId: (contract as any).salesContractId || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingContract) return
    try {
      const res = await fetch(`/api/contracts/${editingContract.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildContractPayload(formData))
      })
      if (res.ok) {
        setIsEditDialogOpen(false)
        setEditingContract(null)
        fetchContracts()
      } else {
        const data = await res.json()
        alert(data.error || "保存失败，请重试")
      }
    } catch (error) {
      console.error("Failed to update contract:", error)
      alert("保存失败，请重试")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个合同吗？")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        fetchContracts()
      } else {
        const data = await res.json()
        alert(data.error || "删除失败")
      }
    } catch (error) {
      console.error("Failed to delete contract:", error)
      alert("删除失败，请重试")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredContracts = contracts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.number.toLowerCase().includes(search.toLowerCase()) ||
    (c.customer?.name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">合同管理</h1>
          <p className="text-muted-foreground">管理销售合同</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新增合同
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新增合同</DialogTitle>
              <DialogDescription>填写合同信息</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="type">合同类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value, supplierId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALES">销售合同</SelectItem>
                      <SelectItem value="OUTSOURCING">委外合同</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">合同名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">合同编号</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="自动生成"
                  />
                </div>
                {formData.type === "SALES" ? (
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
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="supplier">供应商 *</Label>
                      <Select
                        value={formData.supplierId}
                        onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择供应商" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salesContract">关联销售合同</Label>
                      <Select
                        value={formData.salesContractId}
                        onValueChange={(value) => setFormData({ ...formData, salesContractId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择关联的销售合同（可选）" />
                        </SelectTrigger>
                        <SelectContent>
                          {salesContracts.map((sc) => (
                            <SelectItem key={sc.id} value={sc.id}>
                              {sc.name} - ¥{sc.amount.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="amount">合同金额</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">开始日期</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">结束日期</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={formData.type === "OUTSOURCING" ? !formData.supplierId : !formData.customerId}>保存</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
                  <Label htmlFor="edit-type">合同类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value, supplierId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALES">销售合同</SelectItem>
                      <SelectItem value="OUTSOURCING">委外合同</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                {formData.type === "SALES" ? (
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
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-supplier">供应商 *</Label>
                      <Select
                        value={formData.supplierId}
                        onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择供应商" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-salesContract">关联销售合同</Label>
                      <Select
                        value={formData.salesContractId}
                        onValueChange={(value) => setFormData({ ...formData, salesContractId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择关联的销售合同（可选）" />
                        </SelectTrigger>
                        <SelectContent>
                          {salesContracts.map((sc) => (
                            <SelectItem key={sc.id} value={sc.id}>
                              {sc.name} - ¥{sc.amount.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
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
                      <SelectItem value="DRAFT">草稿</SelectItem>
                      <SelectItem value="PENDING">待签署</SelectItem>
                      <SelectItem value="SIGNED">已签署</SelectItem>
                      <SelectItem value="ACTIVE">执行中</SelectItem>
                      <SelectItem value="COMPLETED">已完成</SelectItem>
                      <SelectItem value="CANCELLED">已取消</SelectItem>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>合同列表</CardTitle>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="合同类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="SALES">销售合同</SelectItem>
                  <SelectItem value="OUTSOURCING">委外合同</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索合同..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>合同名称</TableHead>
                <TableHead>合同编号</TableHead>
                <TableHead>客户/供应商</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>发票/回款</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">加载中...</TableCell>
                </TableRow>
              ) : filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">暂无数据</TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <Badge className={typeColors[contract.type]}>
                        {typeNames[contract.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/contracts/${contract.id}`}
                        className="font-medium hover:underline"
                      >
                        {contract.name}
                      </Link>
                    </TableCell>
                    <TableCell>{contract.number}</TableCell>
                    <TableCell>
                      {contract.type === "SALES"
                        ? contract.customer.name
                        : contract.supplier?.name || "-"}
                    </TableCell>
                    <TableCell>¥{contract.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {contract.type === "OUTSOURCING" ? (
                        <div className="text-sm">
                          <span className="text-orange-600">¥{contract.invoicedAmount.toLocaleString()}</span>
                          <span className="mx-1">/</span>
                          <span className="text-green-600">¥{contract.paidAmount.toLocaleString()}</span>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <span>{contract._count.invoices} 发票</span>
                          <span className="mx-2">|</span>
                          <span>{contract._count.payments} 回款</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {contract.startDate && format(new Date(contract.startDate), 'yyyy-MM-dd')}
                        {contract.startDate && contract.endDate && ' ~ '}
                        {contract.endDate && format(new Date(contract.endDate), 'yyyy-MM-dd')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[contract.status]}>
                        {statusNames[contract.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(contract)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(contract.id)}
                          disabled={deletingId === contract.id}
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
