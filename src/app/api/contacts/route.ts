import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { name, position, phone, email, customerId, isPrimary } = body

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await prisma.contact.updateMany({
        where: {
          customerId,
          teamId: session.user.teamId,
          isPrimary: true
        },
        data: { isPrimary: false }
      })
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        position,
        phone,
        email,
        customerId,
        teamId: session.user.teamId,
        isPrimary: isPrimary || false
      }
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error("Error creating contact:", error)
    return NextResponse.json({ error: "创建联系人失败" }, { status: 500 })
  }
}
