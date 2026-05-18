"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { MoreHorizontal, Plus, Search, User, Pencil, Trash2, Shield, ShieldCheck, UserCog } from "lucide-react"
import { useRouter } from "next/navigation"

interface UserData {
  id: string
  name: string | null
  email: string
  role: string
  image: string | null
  createdAt: string
  updatedAt: string
  team: {
    id: string
    name: string
  }
}

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ADMIN: { label: "管理员", variant: "default" },
  SALES: { label: "销售", variant: "secondary" },
  PM: { label: "项目经理", variant: "outline" },
  FINANCE: { label: "财务", variant: "outline" }
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [viewingUser, setViewingUser] = useState<UserData | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES"
  })
  const [currentUserRole, setCurrentUserRole] = useState<string>("")

  useEffect(() => {
    fetchUsers()
    fetchCurrentUser()
  }, [page, search])

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/session")
      const data = await res.json()
      if (data?.user?.role) {
        setCurrentUserRole(data.user.role)
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?page=${page}&limit=${limit}&search=${search}`)
      const data = await res.json()
      setUsers(data.data || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsDialogOpen(false)
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "SALES"
        })
        fetchUsers()
      } else {
        const error = await res.json()
        alert(error.error || "创建失败")
      }
    } catch (error) {
      console.error("Failed to create user:", error)
    }
  }

  const handleEdit = (user: UserData) => {
    setEditingUser(user)
    setFormData({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role
    })
    setIsEditDialogOpen(true)
  }

  const handleView = (user: UserData) => {
    setViewingUser(user)
    setIsDetailDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    try {
      const updateData: { name: string; email: string; role: string; password?: string } = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      }
      if (formData.password) {
        updateData.password = formData.password
      }
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      })
      if (res.ok) {
        setIsEditDialogOpen(false)
        setEditingUser(null)
        fetchUsers()
      } else {
        const error = await res.json()
        alert(error.error || "更新失败")
      }
    } catch (error) {
      console.error("Failed to update user:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此用户吗？此操作不可恢复。")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        fetchUsers()
      } else {
        const error = await res.json()
        alert(error.error || "删除失败")
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  // 只有管理员可以创建用户
  const canManageUsers = currentUserRole === "ADMIN"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户和权限</p>
        </div>
        {canManageUsers && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                添加用户
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新用户</DialogTitle>
                <DialogDescription>
                  填写用户信息创建新账号
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入姓名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="请输入邮箱"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="请输入密码"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">角色</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">
                          <div className="flex items-center">
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            管理员
                          </div>
                        </SelectItem>
                        <SelectItem value="SALES">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            销售
                          </div>
                        </SelectItem>
                        <SelectItem value="PM">
                          <div className="flex items-center">
                            <UserCog className="w-4 h-4 mr-2" />
                            项目经理
                          </div>
                        </SelectItem>
                        <SelectItem value="FINANCE">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2" />
                            财务
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit">创建用户</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>用户列表</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索用户..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">加载中...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <User className="w-12 h-12 mb-4" />
              <p>暂无用户</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>团队</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name || ""}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {user.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleLabels[user.role]?.variant || "outline"}>
                          {roleLabels[user.role]?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.team?.name || "-"}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(user)}>
                              <User className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            {(canManageUsers || editingUser?.id === user.id) && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  编辑
                                </DropdownMenuItem>
                                {canManageUsers && user.role !== "ADMIN" && (
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(user.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    删除
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 编辑用户对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              修改用户信息
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">姓名</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">邮箱</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="请输入邮箱"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">
                  密码 {editingUser && <span className="text-muted-foreground text-xs">(留空表示不修改)</span>}
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "留空表示不修改密码" : "请输入密码"}
                  required={!editingUser}
                />
              </div>
              {canManageUsers && (
                <div className="space-y-2">
                  <Label htmlFor="edit-role">角色</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center">
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          管理员
                        </div>
                      </SelectItem>
                      <SelectItem value="SALES">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          销售
                        </div>
                      </SelectItem>
                      <SelectItem value="PM">
                        <div className="flex items-center">
                          <UserCog className="w-4 h-4 mr-2" />
                          项目经理
                        </div>
                      </SelectItem>
                      <SelectItem value="FINANCE">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 mr-2" />
                          财务
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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

      {/* 查看用户详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {viewingUser.image ? (
                    <img
                      src={viewingUser.image}
                      alt={viewingUser.name || ""}
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <span className="text-2xl font-medium">
                      {viewingUser.name?.charAt(0) || viewingUser.email.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{viewingUser.name || "未设置姓名"}</h3>
                  <p className="text-muted-foreground">{viewingUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <Label className="text-muted-foreground">角色</Label>
                  <p className="font-medium">
                    <Badge variant={roleLabels[viewingUser.role]?.variant || "outline"} className="mt-1">
                      {roleLabels[viewingUser.role]?.label || viewingUser.role}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">团队</Label>
                  <p className="font-medium">{viewingUser.team?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">创建时间</Label>
                  <p className="font-medium">
                    {new Date(viewingUser.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">更新时间</Label>
                  <p className="font-medium">
                    {new Date(viewingUser.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
