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

    const payable = await prisma.payable.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      },
      include: {
        contract: {
          include: { customer: true }
        },
        supplier: true
      }
    })

    if (!payable) {
      return NextResponse.json({ error: "付款记录不存在" }, { status: 404 })
    }

    return NextResponse.json(payable)
  } catch (error) {
    console.error("Error fetching payable:", error)
    return NextResponse.json({ error: "获取付款详情失败" }, { status: 500 })
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
    const { amount, paymentDate, dueDate, method, reference, status, notes, contractId, supplierId } = body

    // Get current payable to calculate amount difference for contract update
    const currentPayable = await prisma.payable.findUnique({
      where: { id }
    })

    if (!currentPayable) {
      return NextResponse.json({ error: "付款记录不存在" }, { status: 404 })
    }

    const oldAmount = currentPayable.amount
    const oldStatus = currentPayable.status

    const payable = await prisma.payable.update({
      where: { id },
      data: {
        amount,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        dueDate: new Date(dueDate),
        method,
        reference,
        status,
        notes,
        contractId,
        supplierId
      }
    })

    // Update contract's paidAmount if status changed to COMPLETED
    if (contractId) {
      if (status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
        // Status changed to completed - add amount
        await prisma.contract.update({
          where: { id: contractId },
          data: {
            paidAmount: {
              increment: amount
            }
          }
        })
      } else if (oldStatus === 'COMPLETED' && status !== 'COMPLETED') {
        // Status changed from completed - subtract amount
        await prisma.contract.update({
          where: { id: contractId },
          data: {
            paidAmount: {
              decrement: oldAmount
            }
          }
        })
      } else if (status === 'COMPLETED' && oldStatus === 'COMPLETED') {
        // Both are completed - adjust difference
        const diff = amount - oldAmount
        if (diff !== 0) {
          await prisma.contract.update({
            where: { id: contractId },
            data: {
              paidAmount: {
                increment: diff
              }
            }
          })
        }
      }
    }

    return NextResponse.json(payable)
  } catch (error) {
    console.error("Error updating payable:", error)
    return NextResponse.json({ error: "更新付款记录失败" }, { status: 500 })
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

    // Get current payable to adjust contract's paidAmount
    const currentPayable = await prisma.payable.findUnique({
      where: { id }
    })

    if (currentPayable && currentPayable.contractId && currentPayable.status === 'COMPLETED') {
      // Subtract from contract's paidAmount
      await prisma.contract.update({
        where: { id: currentPayable.contractId },
        data: {
          paidAmount: {
            decrement: currentPayable.amount
          }
        }
      })
    }

    const result = await prisma.payable.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (result.count === 0) {
      return NextResponse.json({ error: "付款记录不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting payable:", error)
    return NextResponse.json({ error: "删除付款记录失败" }, { status: 500 })
  }
}
