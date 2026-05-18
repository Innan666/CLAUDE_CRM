import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      },
      include: {
        customer: true,
        owners: {
          include: { user: { select: { name: true, email: true } } }
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        milestones: {
          orderBy: { dueDate: 'asc' }
        },
        visits: {
          orderBy: { startTime: 'desc' },
          take: 5,
          include: {
            customer: true
          }
        },
        _count: {
          select: {
            tasks: true,
            milestones: true,
            visits: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json({ error: "获取项目详情失败" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, status, startDate, endDate, budget, customerId } = body

    const project = await prisma.project.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: {
        name,
        description,
        status,
        startDate,
        endDate,
        budget,
        customerId
      }
    })

    if (project.count === 0) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json({ error: "更新项目失败" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const project = await prisma.project.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (project.count === 0) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json({ error: "删除项目失败" }, { status: 500 })
  }
}
