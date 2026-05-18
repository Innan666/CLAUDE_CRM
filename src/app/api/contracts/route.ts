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
    const customerId = searchParams.get("customerId")
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const supplierId = searchParams.get("supplierId")

    const where: any = {
      teamId: session.user.teamId
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        customer: true,
        supplier: true,
        _count: {
          select: {
            invoices: true,
            payments: true,
            payables: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error("Error fetching contracts:", error)
    return NextResponse.json({ error: "获取合同列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { name, number, amount, startDate, endDate, status, type, terms, customerId, supplierId, opportunityId, salesContractId } = body

    if (!name) {
      return NextResponse.json({ error: "合同名称不能为空" }, { status: 400 })
    }

    if (salesContractId) {
      const salesContract = await prisma.contract.findFirst({
        where: { id: salesContractId, type: 'SALES', teamId: session.user.teamId }
      })
      if (!salesContract) {
        return NextResponse.json({ error: "关联的销售合同不存在或不是销售合同" }, { status: 400 })
      }
    }

    const contractNumber = number || `CTR-${Date.now()}`

    const contract = await prisma.contract.create({
      data: {
        name,
        number: contractNumber,
        amount: amount || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'DRAFT',
        type: type || 'SALES',
        terms,
        customerId: customerId || null,
        supplierId: supplierId || null,
        opportunityId: opportunityId || null,
        salesContractId: type === 'OUTSOURCING' ? salesContractId || null : null,
        teamId: session.user.teamId
      }
    })

    return NextResponse.json(contract)
  } catch (error: any) {
    console.error("Error creating contract:", error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "合同编号已存在，请使用不同的编号" }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || "创建合同失败" }, { status: 500 })
  }
}
