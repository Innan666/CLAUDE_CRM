import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

// 获取单个待办
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

    const todo = await prisma.todo.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!todo) {
      return NextResponse.json({ error: "待办不存在" }, { status: 404 })
    }

    // 验证是否属于同一团队
    if (todo.teamId !== session.user.teamId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    return NextResponse.json(todo)
  } catch (error) {
    console.error("Error fetching todo:", error)
    return NextResponse.json({ error: "获取待办失败" }, { status: 500 })
  }
}

// 更新待办
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, status, priority, dueDate, assigneeId } = body

    // 验证待办是否存在
    const existingTodo = await prisma.todo.findUnique({ where: { id } })
    if (!existingTodo) {
      return NextResponse.json({ error: "待办不存在" }, { status: 404 })
    }

    // 验证是否属于同一团队
    if (existingTodo.teamId !== session.user.teamId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    // 验证负责人是否存在（如果提供）
    if (assigneeId !== undefined) {
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId } })
        if (!assignee || assignee.teamId !== session.user.teamId) {
          return NextResponse.json({ error: "负责人不存在" }, { status: 400 })
        }
      }
    }

    // 如果状态变为完成，设置完成时间
    const updateData: any = {
      title,
      description,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId !== undefined ? (assigneeId || null) : undefined
    }

    if (status === "DONE" && existingTodo.status !== "DONE") {
      updateData.completedAt = new Date()
    } else if (status !== "DONE" && existingTodo.status === "DONE") {
      updateData.completedAt = null
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(todo)
  } catch (error) {
    console.error("Error updating todo:", error)
    return NextResponse.json({ error: "更新待办失败" }, { status: 500 })
  }
}

// 删除待办
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params

    // 验证待办是否存在
    const existingTodo = await prisma.todo.findUnique({ where: { id } })
    if (!existingTodo) {
      return NextResponse.json({ error: "待办不存在" }, { status: 404 })
    }

    // 验证是否属于同一团队
    if (existingTodo.teamId !== session.user.teamId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    await prisma.todo.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting todo:", error)
    return NextResponse.json({ error: "删除待办失败" }, { status: 500 })
  }
}
