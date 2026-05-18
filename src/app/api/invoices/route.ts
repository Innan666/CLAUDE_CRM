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
    const contractId = searchParams.get("contractId")
    const type = searchParams.get("type")
    const supplierId = searchParams.get("supplierId")

    const where: any = {
      teamId: session.user.teamId
    }

    if (status) {
      where.status = status
    }

    if (contractId) {
      where.contractId = contractId
    }

    if (type) {
      where.type = type
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        contract: {
          include: { customer: true }
        },
        supplier: true,
        payments: true
      },
      orderBy: { issueDate: 'desc' }
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json({ error: "获取发票列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { number, amount, taxAmount, totalAmount, issueDate, dueDate, status, type, description, contractId, supplierId } = body

    // Validate teamId exists
    const team = await prisma.team.findUnique({ where: { id: session.user.teamId } })
    if (!team) {
      return NextResponse.json({ error: "团队不存在" }, { status: 400 })
    }

    // Validate contractId if provided (must be non-empty string)
    const validContractId = contractId && contractId.trim() !== ''
    if (validContractId) {
      const contract = await prisma.contract.findUnique({ where: { id: contractId } })
      if (!contract) {
        return NextResponse.json({ error: "关联的合同不存在" }, { status: 400 })
      }
    }

    // Validate supplierId if provided (must be non-empty string)
    const validSupplierId = supplierId && supplierId.trim() !== ''
    if (validSupplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
      if (!supplier) {
        return NextResponse.json({ error: "关联的供应商不存在" }, { status: 400 })
      }
    }

    // Generate invoice number if not provided
    const invoiceNumber = number || `INV-${Date.now()}`

    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        amount: amount || 0,
        taxAmount: taxAmount || 0,
        totalAmount: totalAmount || amount || 0,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        status: status || 'DRAFT',
        type: type || 'SALES',
        description,
        contractId: validContractId ? contractId : null,
        supplierId: validSupplierId ? supplierId : null,
        teamId: session.user.teamId
      }
    })

    // Update contract's invoicedAmount if this is a purchase invoice linked to a contract
    if (contractId && type === 'PURCHASE') {
      await prisma.contract.update({
        where: { id: contractId },
        data: {
          invoicedAmount: {
            increment: totalAmount || amount || 0
          }
        }
      })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ error: "创建发票失败" }, { status: 500 })
  }
}
