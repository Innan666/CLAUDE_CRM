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
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""

    const where = {
      teamId: session.user.teamId,
      OR: search ? [
        { name: { contains: search, mode: 'insensitive' as const } },
        { industry: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ] : undefined
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              opportunities: true,
              contracts: true,
              visits: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.customer.count({ where })
    ])

    return NextResponse.json({
      data: customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ error: "获取客户列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { name, industry, source, level, phone, email, address, description } = body

    const customer = await prisma.customer.create({
      data: {
        name,
        industry,
        source,
        level,
        phone,
        email,
        address,
        description,
        teamId: session.user.teamId,
        ownerId: session.user.id
      }
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "创建客户失败" }, { status: 500 })
  }
}
