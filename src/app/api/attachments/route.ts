import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import path from "path"
import fs from "fs"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const contractId = formData.get("contractId") as string | null
    const invoiceId = formData.get("invoiceId") as string | null

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 })
    }

    if (!contractId && !invoiceId) {
      return NextResponse.json({ error: "必须关联合同或发票" }, { status: 400 })
    }

    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const ext = path.extname(file.name)
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`
    const filePath = path.join(uploadsDir, filename)

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // Save to database
    const attachment = await prisma.attachment.create({
      data: {
        name: file.name,
        filename,
        path: `/uploads/${filename}`,
        size: file.size,
        mimeType: file.type,
        teamId: session.user.teamId,
        contractId: contractId || null,
        invoiceId: invoiceId || null
      }
    })

    return NextResponse.json(attachment)
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "上传文件失败" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contractId = searchParams.get("contractId")
    const invoiceId = searchParams.get("invoiceId")

    const where: any = {
      teamId: session.user.teamId
    }

    if (contractId) {
      where.contractId = contractId
    }

    if (invoiceId) {
      where.invoiceId = invoiceId
    }

    const attachments = await prisma.attachment.findMany({
      where,
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(attachments)
  } catch (error) {
    console.error("Error fetching attachments:", error)
    return NextResponse.json({ error: "获取附件列表失败" }, { status: 500 })
  }
}
