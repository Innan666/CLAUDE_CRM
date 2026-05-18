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

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      },
      include: {
        contacts: true,
        opportunities: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        contracts: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        visits: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: {
            createdBy: {
              select: { name: true }
            },
            customer: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: "客户不存在" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json({ error: "获取客户详情失败" }, { status: 500 })
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
    const { name, industry, source, level, phone, email, address, description } = body

    const customer = await prisma.customer.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: {
        name,
        industry,
        source,
        level,
        phone,
        email,
        address,
        description
      }
    })

    if (customer.count === 0) {
      return NextResponse.json({ error: "客户不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json({ error: "更新客户失败" }, { status: 500 })
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

    const customer = await prisma.customer.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (customer.count === 0) {
      return NextResponse.json({ error: "客户不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json({ error: "删除客户失败" }, { status: 500 })
  }
}
