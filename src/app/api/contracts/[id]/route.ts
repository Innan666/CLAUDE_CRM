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

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      },
      include: {
        customer: true,
        supplier: true,
        salesContract: true,
        outsourcingContracts: {
          include: {
            supplier: true
          }
        },
        invoices: {
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: "合同不存在" }, { status: 404 })
    }

    let grossProfit = 0
    let grossProfitRate = 0
    if (contract.type === 'SALES') {
      const outsourcingCost = contract.outsourcingContracts.reduce((sum, oc) => sum + oc.amount, 0)
      grossProfit = contract.amount - outsourcingCost
      grossProfitRate = contract.amount > 0 ? (grossProfit / contract.amount) * 100 : 0
    }

    return NextResponse.json({
      ...contract,
      grossProfit,
      grossProfitRate
    })
  } catch (error) {
    console.error("Error fetching contract:", error)
    return NextResponse.json({ error: "获取合同详情失败" }, { status: 500 })
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
    const { name, number, amount, startDate, endDate, status, type, terms, customerId, supplierId, salesContractId } = body

    const updateData: any = {
      name,
      number,
      amount,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status,
      terms
    }

    if (type === 'OUTSOURCING') {
      updateData.customerId = null
      updateData.supplierId = supplierId || null
      if (salesContractId) {
        const salesContract = await prisma.contract.findFirst({
          where: { id: salesContractId, type: 'SALES', teamId: session.user.teamId }
        })
        if (!salesContract) {
          return NextResponse.json({ error: "关联的销售合同不存在或不是销售合同" }, { status: 400 })
        }
        updateData.salesContractId = salesContractId
      } else {
        updateData.salesContractId = null
      }
    } else {
      updateData.customerId = customerId || null
      updateData.supplierId = null
      updateData.salesContractId = null
    }

    const contract = await prisma.contract.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: updateData
    })

    if (contract.count === 0) {
      return NextResponse.json({ error: "合同不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating contract:", error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "合同编号已存在，请使用不同的编号" }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || "更新合同失败" }, { status: 500 })
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

    const contract = await prisma.contract.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (contract.count === 0) {
      return NextResponse.json({ error: "合同不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting contract:", error)
    return NextResponse.json({ error: "删除合同失败" }, { status: 500 })
  }
}
