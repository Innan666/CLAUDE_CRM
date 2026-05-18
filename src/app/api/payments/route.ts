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
    const invoiceId = searchParams.get("invoiceId")

    const where: any = {
      teamId: session.user.teamId
    }

    if (status) {
      where.status = status
    }

    if (invoiceId) {
      where.invoiceId = invoiceId
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: { contract: { include: { customer: true } } }
        },
        contract: {
          include: { customer: true }
        }
      },
      orderBy: { paymentDate: 'desc' }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json({ error: "获取回款列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, paymentDate, method, reference, status, notes, invoiceId, contractId } = body

    const payment = await prisma.payment.create({
      data: {
        amount: amount || 0,
        paymentDate: new Date(paymentDate),
        method,
        reference,
        status: status || 'PENDING',
        notes,
        invoiceId,
        contractId,
        teamId: session.user.teamId
      }
    })

    // If payment is completed, update invoice status
    if (status === 'COMPLETED' && invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true }
      })

      if (invoice) {
        const totalPaid = invoice.payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + p.amount, 0) + amount

        if (totalPaid >= invoice.totalAmount) {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'PAID' }
          })
        }
      }
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "创建回款失败" }, { status: 500 })
  }
}
