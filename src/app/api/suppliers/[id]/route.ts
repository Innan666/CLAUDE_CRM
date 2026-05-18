import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params

    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      },
      include: {
        contracts: {
          include: {
            customer: true
          }
        },
        invoices: true,
        payables: true,
        _count: {
          select: {
            contracts: true,
            invoices: true,
            payables: true
          }
        }
      }
    })

    if (!supplier) {
      return NextResponse.json({ error: "供应商不存在" }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Error fetching supplier:", error)
    return NextResponse.json({ error: "获取供应商详情失败" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params

    const body = await request.json()
    const { name, code, contact, phone, email, address, paymentTerms, notes, status } = body

    const supplier = await prisma.supplier.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: {
        name,
        code,
        contact,
        phone,
        email,
        address,
        paymentTerms,
        notes,
        status
      }
    })

    if (supplier.count === 0) {
      return NextResponse.json({ error: "供应商不存在" }, { status: 404 })
    }

    const updated = await prisma.supplier.findUnique({
      where: { id }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating supplier:", error)
    return NextResponse.json({ error: "更新供应商失败" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params

    const supplier = await prisma.supplier.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (supplier.count === 0) {
      return NextResponse.json({ error: "供应商不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return NextResponse.json({ error: "删除供应商失败" }, { status: 500 })
  }
}
