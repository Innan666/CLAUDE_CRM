import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || ""
    const level = searchParams.get("level") || ""
    const status = searchParams.get("status") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const teamId = session.user.teamId

    // 非标签字段用 Prisma 条件，标签用原生 SQL unnest+ILIKE 模糊匹配
    const where: Prisma.PartnerWhereInput = { teamId }
    if (type) where.type = type as any
    if (level) where.level = level as any
    if (status) where.status = status as any

    if (search) {
      // 先通过原生 SQL 查出标签模糊匹配的 ID
      const tagMatched = await prisma.$queryRaw<{ id: string }[]>`
        SELECT DISTINCT id FROM "Partner"
        WHERE "teamId" = ${teamId}
          AND EXISTS (
            SELECT 1 FROM unnest(tags) AS t
            WHERE t ILIKE ${"%" + search + "%"}
          )
      `
      const tagMatchedIds = tagMatched.map(r => r.id)

      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contact: { contains: search, mode: "insensitive" } },
        { industry: { contains: search, mode: "insensitive" } },
        { region: { contains: search, mode: "insensitive" } },
        ...(tagMatchedIds.length > 0 ? [{ id: { in: tagMatchedIds } }] : []),
      ]
    }

    const [partners, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.partner.count({ where }),
    ])

    return NextResponse.json({ data: partners, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    console.error("GET /api/partners error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, level, status, contact, phone, email, address, industry, region, capabilities, tags, startDate, endDate, notes } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "名称不能为空" }, { status: 400 })
    }

    const code = `PTN-${Date.now()}`

    const partner = await prisma.partner.create({
      data: {
        name: name.trim(),
        code,
        type: type || "OTHER",
        level: level || null,
        status: status || "NEGOTIATING",
        contact: contact || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        industry: industry || null,
        region: region || null,
        capabilities: capabilities || null,
        tags: Array.isArray(tags) ? tags : (tags ? tags.split(",").map((t: string) => t.trim()).filter(Boolean) : []),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
        teamId: session.user.teamId,
      },
    })

    return NextResponse.json(partner)
  } catch (error: any) {
    console.error("POST /api/partners error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
