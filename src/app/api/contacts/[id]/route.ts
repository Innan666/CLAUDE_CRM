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
    const { name, position, phone, email, isPrimary, customerId } = body

    // If setting as primary, unset other primary contacts
    if (isPrimary && customerId) {
      await prisma.contact.updateMany({
        where: {
          customerId,
          teamId: session.user.teamId,
          isPrimary: true,
          NOT: { id }
        },
        data: { isPrimary: false }
      })
    }

    const contact = await prisma.contact.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: {
        name,
        position,
        phone,
        email,
        isPrimary
      }
    })

    if (contact.count === 0) {
      return NextResponse.json({ error: "联系人不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating contact:", error)
    return NextResponse.json({ error: "更新联系人失败" }, { status: 500 })
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

    const contact = await prisma.contact.deleteMany({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (contact.count === 0) {
      return NextResponse.json({ error: "联系人不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting contact:", error)
    return NextResponse.json({ error: "删除联系人失败" }, { status: 500 })
  }
}
