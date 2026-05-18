import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "获取用户失败" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 只有管理员可以更新其他用户，普通用户只能更新自己的信息
    const { id } = await params
    const isAdmin = session.user.role === "ADMIN"
    const isSelf = session.user.id === id

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, image } = body

    // 检查用户是否存在
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 如果不是管理员，不能修改角色
    let updateData: {
      name?: string
      email?: string
      password?: string
      role?: Role
      image?: string
    } = {}

    if (name !== undefined) updateData.name = name
    if (image !== undefined) updateData.image = image

    // 只有管理员可以修改角色和密码
    if (isAdmin) {
      if (role !== undefined) updateData.role = role
      if (password !== undefined && password) {
        updateData.password = await bcrypt.hash(password, 10)
      }
    }

    // 如果要修改邮箱，检查是否已被使用
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })
      if (emailExists) {
        return NextResponse.json({ error: "该邮箱已被使用" }, { status: 400 })
      }
      updateData.email = email
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        updatedAt: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 只有管理员可以删除用户
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const { id } = await params

    // 不能删除自己
    if (id === session.user.id) {
      return NextResponse.json({ error: "不能删除当前用户" }, { status: 400 })
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ message: "用户删除成功" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 })
  }
}
