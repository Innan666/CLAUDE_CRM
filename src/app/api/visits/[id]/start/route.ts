import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const visit = await prisma.visit.updateMany({
      where: {
        id,
        teamId: session.user.teamId
      },
      data: {
        status: 'IN_PROGRESS'
      }
    })

    if (visit.count === 0) {
      return NextResponse.json({ error: "拜访不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error starting visit:", error)
    return NextResponse.json({ error: "开始拜访失败" }, { status: 500 })
  }
}
