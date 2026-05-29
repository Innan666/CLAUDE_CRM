import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const partner = await prisma.partner.findFirst({
      where: { id, teamId: session.user.teamId },
    })

    if (!partner) {
      return NextResponse.json({ error: "合作伙伴不存在" }, { status: 404 })
    }

    return NextResponse.json(partner)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const exists = await prisma.partner.findFirst({
      where: { id, teamId: session.user.teamId },
    })
    if (!exists) {
      return NextResponse.json({ error: "合作伙伴不存在" }, { status: 404 })
    }

    const body = await request.json()
    const { name, type, level, status, contact, phone, email, address, industry, region, capabilities, tags, startDate, endDate, notes } = body

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(level !== undefined && { level: level || null }),
        ...(status !== undefined && { status }),
        ...(contact !== undefined && { contact: contact || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(industry !== undefined && { industry: industry || null }),
        ...(region !== undefined && { region: region || null }),
        ...(capabilities !== undefined && { capabilities: capabilities || null }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : tags.split(",").map((t: string) => t.trim()).filter(Boolean) }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    })

    return NextResponse.json(partner)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const exists = await prisma.partner.findFirst({
      where: { id, teamId: session.user.teamId },
    })
    if (!exists) {
      return NextResponse.json({ error: "合作伙伴不存在" }, { status: 404 })
    }

    await prisma.partner.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
