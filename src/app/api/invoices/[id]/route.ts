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
    const { number, amount, taxAmount, totalAmount, issueDate, dueDate, status, description, contractId } = body

    const invoice = await prisma.invoice.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: {
        number,
        amount,
        taxAmount,
        totalAmount: totalAmount || (amount + taxAmount),
        issueDate: issueDate ? new Date(issueDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
        description,
        contractId
      }
    })

    if (invoice.count === 0) {
      return NextResponse.json({ error: "发票不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json({ error: "更新发票失败" }, { status: 500 })
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

    const invoice = await prisma.invoice.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (invoice.count === 0) {
      return NextResponse.json({ error: "发票不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json({ error: "删除发票失败" }, { status: 500 })
  }
}
