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
    const supplierId = searchParams.get("supplierId")
    const contractId = searchParams.get("contractId")

    const where: any = {
      teamId: session.user.teamId
    }

    if (status) {
      where.status = status
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (contractId) {
      where.contractId = contractId
    }

    const payables = await prisma.payable.findMany({
      where,
      include: {
        contract: {
          include: { customer: true }
        },
        supplier: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(payables)
  } catch (error) {
    console.error("Error fetching payables:", error)
    return NextResponse.json({ error: "获取付款列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, paymentDate, dueDate, method, reference, status, notes, contractId, supplierId } = body

    const payable = await prisma.payable.create({
      data: {
        amount: amount || 0,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        dueDate: new Date(dueDate),
        method,
        reference,
        status: status || 'PENDING',
        notes,
        contractId,
        supplierId,
        teamId: session.user.teamId
      }
    })

    // If status is COMPLETED, update contract's paidAmount
    if (contractId && (status === 'COMPLETED' || status === 'completed')) {
      await prisma.contract.update({
        where: { id: contractId },
        data: {
          paidAmount: {
            increment: amount
          }
        }
      })
    }

    return NextResponse.json(payable)
  } catch (error) {
    console.error("Error creating payable:", error)
    return NextResponse.json({ error: "创建付款记录失败" }, { status: 500 })
  }
}
