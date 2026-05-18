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

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      },
      include: {
        customer: true,
        owners: {
          include: { user: { select: { name: true, email: true } } }
        },
        visits: {
          orderBy: { startTime: 'desc' },
          take: 5
        }
      }
    })

    if (!opportunity) {
      return NextResponse.json({ error: "商机不存在" }, { status: 404 })
    }

    return NextResponse.json(opportunity)
  } catch (error) {
    console.error("Error fetching opportunity:", error)
    return NextResponse.json({ error: "获取商机详情失败" }, { status: 500 })
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
    const { name, amount, stage, probability, expectedDate, description } = body

    // Convert date string to ISO-8601 DateTime if provided
    let processedExpectedDate: Date | undefined | null = undefined
    if (expectedDate) {
      processedExpectedDate = new Date(expectedDate)
      if (isNaN(processedExpectedDate.getTime())) {
        processedExpectedDate = null
      }
    } else if (expectedDate === null) {
      processedExpectedDate = null
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (amount !== undefined) updateData.amount = amount
    if (stage !== undefined) updateData.stage = stage
    if (probability !== undefined) updateData.probability = probability
    if (processedExpectedDate !== undefined) updateData.expectedDate = processedExpectedDate
    if (description !== undefined) updateData.description = description

    const opportunity = await prisma.opportunity.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: updateData
    })

    if (opportunity.count === 0) {
      return NextResponse.json({ error: "商机不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating opportunity:", error)
    return NextResponse.json({ error: "更新商机失败" }, { status: 500 })
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

    const opportunity = await prisma.opportunity.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (opportunity.count === 0) {
      return NextResponse.json({ error: "商机不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting opportunity:", error)
    return NextResponse.json({ error: "删除商机失败" }, { status: 500 })
  }
}
