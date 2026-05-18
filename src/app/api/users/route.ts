import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 只有管理员可以查看所有用户
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""

    const where = {
      teamId: session.user.teamId,
      OR: search ? [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ] : undefined
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          team: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 只有管理员可以创建用户
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role } = body

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码为必填项" }, { status: 400 })
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "该邮箱已被使用" }, { status: 400 })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "SALES",
        teamId: session.user.teamId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "创建用户失败" }, { status: 500 })
  }
}
