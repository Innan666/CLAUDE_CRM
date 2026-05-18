import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import path from "path"
import fs from "fs"

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

    const attachment = await prisma.attachment.findFirst({
      where: {
        id,
        teamId: session.user.teamId
      }
    })

    if (!attachment) {
      return NextResponse.json({ error: "附件不存在" }, { status: 404 })
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), "public", attachment.path)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // Delete from database
    await prisma.attachment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return NextResponse.json({ error: "删除附件失败" }, { status: 500 })
  }
}
