import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const customerId = searchParams.get("customerId")

    const where: any = {
      teamId: session.user.teamId
    }

    if (status) {
      where.status = status
    }

    if (customerId) {
      where.customerId = customerId
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: true,
        owners: {
          include: { user: { select: { name: true } } }
        },
        _count: {
          select: {
            tasks: true,
            milestones: true,
            visits: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "获取项目列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, status, startDate, endDate, budget, customerId } = body

    const project = await prisma.project.create({
      data: {
        name,
        description,
        status: status || 'PLANNING',
        startDate,
        endDate,
        budget: budget || 0,
        customerId,
        teamId: session.user.teamId,
        owners: {
          create: { userId: session.user.id }
        }
      }
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "创建项目失败" }, { status: 500 })
  }
}
