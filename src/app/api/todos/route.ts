import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

// 获取用户列表（用于分配负责人）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const assigneeId = searchParams.get("assigneeId")
    const view = searchParams.get("view") || "all" // all | my | assigned

    // 构建查询条件
    const where: any = {
      teamId: session.user.teamId
    }

    // 按视图筛选
    if (view === "my") {
      // 我创建的
      where.creatorId = session.user.id
    } else if (view === "assigned") {
      // 分配给我的
      where.assigneeId = session.user.id
    }
    // "all" 视图下可以看到团队所有待办

    // 按状态筛选
    if (status) {
      where.status = status
    }

    // 按优先级筛选
    if (priority) {
      where.priority = priority
    }

    // 按负责人筛选
    if (assigneeId) {
      where.assigneeId = assigneeId
    }

    const todos = await prisma.todo.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { status: 'asc' }, // 未完成的在前
        { priority: 'desc' }, // 紧急的在前
        { dueDate: 'asc' } // 截止日期早的在前
      ]
    })

    // 获取团队成员列表（用于分配）
    const teamMembers = await prisma.user.findMany({
      where: { teamId: session.user.teamId },
      select: { id: true, name: true, email: true }
    })

    return NextResponse.json({
      todos,
      teamMembers
    })
  } catch (error) {
    console.error("Error fetching todos:", error)
    return NextResponse.json({ error: "获取待办列表失败" }, { status: 500 })
  }
}

// 创建待办
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, status, priority, dueDate, assigneeId } = body

    // 验证负责人是否存在（如果提供）
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } })
      if (!assignee || assignee.teamId !== session.user.teamId) {
        return NextResponse.json({ error: "负责人不存在" }, { status: 400 })
      }
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        description,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        teamId: session.user.teamId,
        creatorId: session.user.id,
        assigneeId: assigneeId || null
      },
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
    console.error("Error creating todo:", error)
    return NextResponse.json({ error: "创建待办失败" }, { status: 500 })
  }
}
