import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const { amount, paymentDate, method, reference, status, notes, invoiceId, contractId } = body

    const payment = await prisma.payment.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: {
        amount,
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
        method,
        reference,
        status,
        notes,
        invoiceId,
        contractId
      }
    })

    if (payment.count === 0) {
      return NextResponse.json({ error: "回款不存在" }, { status: 404 })
    }

    // If payment status changed to COMPLETED, update invoice status
    if (status === 'COMPLETED' && invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true }
      })

      if (invoice) {
        const totalPaid = invoice.payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + p.amount, 0)

        if (totalPaid >= invoice.totalAmount) {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'PAID' }
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating payment:", error)
    return NextResponse.json({ error: "更新回款失败" }, { status: 500 })
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

    const payment = await prisma.payment.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (payment.count === 0) {
      return NextResponse.json({ error: "回款不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting payment:", error)
    return NextResponse.json({ error: "删除回款失败" }, { status: 500 })
  }
}
