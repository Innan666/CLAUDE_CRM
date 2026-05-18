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

    const visit = await prisma.visit.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      },
      include: {
        customer: true,
        contact: true,
        opportunity: true,
        project: true,
        createdBy: { select: { name: true, email: true } }
      }
    })

    if (!visit) {
      return NextResponse.json({ error: "拜访不存在" }, { status: 404 })
    }

    return NextResponse.json(visit)
  } catch (error) {
    console.error("Error fetching visit:", error)
    return NextResponse.json({ error: "获取拜访详情失败" }, { status: 500 })
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
    const {
      title,
      type,
      startTime,
      endTime,
      location,
      description,
      notes,
      keyPoints,
      nextSteps,
      rating,
      nextContactDate,
      reminder,
      attendees,
      attachments,
      status
    } = body

    const visit = await prisma.visit.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: {
        title,
        type,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        location,
        description,
        notes,
        keyPoints,
        nextSteps,
        rating,
        nextContactDate: nextContactDate ? new Date(nextContactDate) : undefined,
        reminder: reminder ? new Date(reminder) : undefined,
        attendees,
        attachments,
        status
      }
    })

    if (visit.count === 0) {
      return NextResponse.json({ error: "拜访不存在" }, { status: 404 })
    }

    // If creating next visit from completed visit
    if (body.createNextVisit && body.nextContactDate && body.customerId) {
      await prisma.visit.create({
        data: {
          title: `跟进拜访 - ${body.customerName || ''}`,
          type: 'FOLLOW_UP',
          status: 'PLANNED',
          startTime: new Date(body.nextContactDate),
          endTime: new Date(new Date(body.nextContactDate).getTime() + 60 * 60 * 1000),
          customerId: body.customerId,
          teamId: session.user.teamId,
          createdById: session.user.id
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating visit:", error)
    return NextResponse.json({ error: "更新拜访失败" }, { status: 500 })
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

    const visit = await prisma.visit.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (visit.count === 0) {
      return NextResponse.json({ error: "拜访不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting visit:", error)
    return NextResponse.json({ error: "删除拜访失败" }, { status: 500 })
  }
}
