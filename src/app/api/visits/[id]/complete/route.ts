import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

export async function POST(
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
    const { notes, keyPoints, nextSteps, rating, nextContactDate } = body

    const visit = await prisma.visit.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: {
        status: 'COMPLETED',
        notes,
        keyPoints,
        nextSteps,
        rating,
        nextContactDate: nextContactDate ? new Date(nextContactDate) : null
      }
    })

    if (visit.count === 0) {
      return NextResponse.json({ error: "拜访不存在" }, { status: 404 })
    }

    // Create next visit if nextContactDate is provided
    if (nextContactDate) {
      const existingVisit = await prisma.visit.findUnique({
        where: { id },
        select: { customerId: true }
      })

      if (existingVisit) {
        await prisma.visit.create({
          data: {
            title: '跟进拜访',
            type: 'FOLLOW_UP',
            status: 'PLANNED',
            startTime: new Date(nextContactDate),
            endTime: new Date(new Date(nextContactDate).getTime() + 60 * 60 * 1000),
            customerId: existingVisit.customerId,
            teamId: session.user.teamId,
            createdById: session.user.id
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error completing visit:", error)
    return NextResponse.json({ error: "完成拜访失败" }, { status: 500 })
  }
}
