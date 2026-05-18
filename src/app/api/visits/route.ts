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
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const customerId = searchParams.get("customerId")
    const status = searchParams.get("status")

    const where: any = {
      teamId: session.user.teamId
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (status) {
      where.status = status
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        customer: true,
        contact: true,
        opportunity: true,
        project: true,
        createdBy: { select: { name: true } }
      },
      orderBy: { startTime: 'asc' }
    })

    return NextResponse.json(visits)
  } catch (error) {
    console.error("Error fetching visits:", error)
    return NextResponse.json({ error: "获取拜访列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      type,
      startTime,
      endTime,
      location,
      description,
      reminder,
      attendees,
      customerId,
      contactId,
      opportunityId,
      projectId
    } = body

    const visit = await prisma.visit.create({
      data: {
        title,
        type: type || 'FOLLOW_UP',
        status: 'PLANNED',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        description,
        reminder: reminder ? new Date(reminder) : null,
        attendees: attendees || [],
        customerId,
        contactId,
        opportunityId,
        projectId,
        teamId: session.user.teamId,
        createdById: session.user.id
      }
    })

    return NextResponse.json(visit)
  } catch (error) {
    console.error("Error creating visit:", error)
    return NextResponse.json({ error: "创建拜访失败" }, { status: 500 })
  }
}
