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
    const stage = searchParams.get("stage")
    const customerId = searchParams.get("customerId")

    const where: any = {
      teamId: session.user.teamId
    }

    if (stage) {
      where.stage = stage
    }

    if (customerId) {
      where.customerId = customerId
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        customer: true,
        owners: {
          include: { user: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(opportunities)
  } catch (error) {
    console.error("Error fetching opportunities:", error)
    return NextResponse.json({ error: "获取商机列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { name, amount, stage, probability, expectedDate, description, customerId } = body

    // Convert date string to ISO-8601 DateTime if provided
    let processedExpectedDate: Date | undefined = undefined
    if (expectedDate) {
      processedExpectedDate = new Date(expectedDate)
      if (isNaN(processedExpectedDate.getTime())) {
        processedExpectedDate = undefined
      }
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        name,
        amount: amount || 0,
        stage: stage || 'PROSPECTING',
        probability: probability || 10,
        expectedDate: processedExpectedDate,
        description,
        customerId,
        teamId: session.user.teamId,
        owners: {
          create: { userId: session.user.id }
        }
      }
    })

    return NextResponse.json(opportunity)
  } catch (error) {
    console.error("Error creating opportunity:", error)
    return NextResponse.json({ error: "创建商机失败" }, { status: 500 })
  }
}
