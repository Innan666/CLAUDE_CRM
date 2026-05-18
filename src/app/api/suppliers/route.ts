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
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")

    const where: any = {
      teamId: session.user.teamId,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
        { contact: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ]
    }

    if (status) {
      where.status = status
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            contracts: true,
            invoices: true,
            payables: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return NextResponse.json({ error: "获取供应商列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { name, code, contact, phone, email, address, paymentTerms, notes, status } = body

    // Generate code if not provided
    const supplierCode = code || `SUP-${Date.now()}`

    const supplier = await prisma.supplier.create({
      data: {
        name,
        code: supplierCode,
        contact,
        phone,
        email,
        address,
        paymentTerms,
        notes,
        status: status || 'ACTIVE',
        teamId: session.user.teamId
      }
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "创建供应商失败" }, { status: 500 })
  }
}
