import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// ─────────────────────────────────────────────────────────────────
// Date parsing
// ─────────────────────────────────────────────────────────────────
function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr

  const str = String(dateStr).trim()
  if (!str) return null

  const formats = [
    () => { const d = new Date(str); return isNaN(d.getTime()) ? null : d },
    () => {
      const m = str.match(/(\d{1,4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})?:?(\d{1,2})?/)
      if (!m) return null
      return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0)
    },
    () => { const d = new Date(str.replace(/\//g, "-")); return isNaN(d.getTime()) ? null : d },
  ]
  for (const f of formats) {
    const r = f()
    if (r && !isNaN(r.getTime())) return r
  }
  return null
}

// Auto-generate a short unique suffix
function shortId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export interface Tool {
  name: string
  description: string
  inputSchema: { type: "object"; properties: Record<string, any>; required?: string[] }
}
export interface ToolResult { success: boolean; data?: any; error?: string }

async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.teamId) throw new Error("未授权")
  return session.user
}

// ─────────────────────────────────────────────────────────────────
// Enum normalisation helpers
// ─────────────────────────────────────────────────────────────────
const VISIT_TYPE_MAP: Record<string, string> = {
  FIRST_MEETING: "FIRST_MEETING", FOLLOW_UP: "FOLLOW_UP", DEMO: "DEMO",
  CONTRACT: "CONTRACT", SUPPORT: "SUPPORT", OTHER: "OTHER",
  // common AI aliases
  MEETING: "FIRST_MEETING", VISIT: "FOLLOW_UP", CUSTOMER_VISIT: "FOLLOW_UP",
  初次拜访: "FIRST_MEETING", 拜访: "FOLLOW_UP", 跟进: "FOLLOW_UP",
  会议: "FIRST_MEETING", 演示: "DEMO", 签约: "CONTRACT", 支持: "SUPPORT",
}

const OPP_STAGE_MAP: Record<string, string> = {
  PROSPECTING: "PROSPECTING", QUALIFICATION: "QUALIFICATION", PROPOSAL: "PROPOSAL",
  NEGOTIATION: "NEGOTIATION", CLOSED_WON: "CLOSED_WON", CLOSED_LOST: "CLOSED_LOST",
  // common AI aliases
  WON: "CLOSED_WON", LOST: "CLOSED_LOST", WIN: "CLOSED_WON",
  成功: "CLOSED_WON", 失败: "CLOSED_LOST", 赢单: "CLOSED_WON", 丢单: "CLOSED_LOST",
}

const CONTRACT_STATUS_MAP: Record<string, string> = {
  DRAFT: "DRAFT", PENDING: "PENDING", SIGNED: "SIGNED",
  ACTIVE: "ACTIVE", COMPLETED: "COMPLETED", CANCELLED: "CANCELLED",
  草稿: "DRAFT", 待审: "PENDING", 已签: "SIGNED", 执行中: "ACTIVE", 已完成: "COMPLETED", 已取消: "CANCELLED",
}

function normalise(map: Record<string, string>, val: string | undefined, fallback: string): string {
  if (!val) return fallback
  return map[val.toUpperCase()] ?? map[val] ?? fallback
}

// ─────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────
export const allTools: Tool[] = [
  // ── Customer ────────────────────────────────────────────────────
  {
    name: "list_customers",
    description: "查询客户列表，支持按名称/行业搜索",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "搜索关键词（名称/行业）" },
        limit: { type: "number", description: "返回数量，默认15" },
      },
    },
  },
  {
    name: "get_customer",
    description: "获取客户详情（含联系人、合同、商机、拜访）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "客户ID" } },
      required: ["id"],
    },
  },
  {
    name: "create_customer",
    description: "创建新客户",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "客户名称（必填）" },
        industry: { type: "string", description: "所属行业" },
        level: { type: "string", description: "客户等级 A/B/C" },
        phone: { type: "string", description: "联系电话" },
        email: { type: "string", description: "邮箱" },
        address: { type: "string", description: "地址" },
        description: { type: "string", description: "备注说明" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_customer",
    description: "更新客户信息",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "客户ID（必填）" },
        name: { type: "string" },
        industry: { type: "string" },
        level: { type: "string", description: "A/B/C" },
        phone: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
        description: { type: "string" },
      },
      required: ["id"],
    },
  },
  // ── Opportunity ─────────────────────────────────────────────────
  {
    name: "list_opportunities",
    description: "查询商机列表",
    inputSchema: {
      type: "object",
      properties: {
        stage: { type: "string", description: "阶段: PROSPECTING/QUALIFICATION/PROPOSAL/NEGOTIATION/CLOSED_WON/CLOSED_LOST" },
        customerId: { type: "string", description: "客户ID" },
        limit: { type: "number", description: "返回数量，默认15" },
      },
    },
  },
  {
    name: "get_opportunity",
    description: "获取商机详情",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "商机ID" } },
      required: ["id"],
    },
  },
  {
    name: "create_opportunity",
    description: "创建新商机（customerId 可先用 list_customers 查询获得）",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "商机名称（必填）" },
        amount: { type: "number", description: "预计金额（必填）" },
        stage: { type: "string", description: "阶段，默认 PROSPECTING" },
        probability: { type: "number", description: "成功概率 0-100" },
        customerId: { type: "string", description: "客户ID（必填）" },
        description: { type: "string" },
        expectedDate: { type: "string", description: "预计成交日期" },
      },
      required: ["name", "amount", "customerId"],
    },
  },
  {
    name: "update_opportunity",
    description: "更新商机（可修改阶段、金额、描述等）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "商机ID（必填）" },
        stage: { type: "string", description: "PROSPECTING/QUALIFICATION/PROPOSAL/NEGOTIATION/CLOSED_WON/CLOSED_LOST" },
        amount: { type: "number" },
        probability: { type: "number" },
        description: { type: "string" },
        expectedDate: { type: "string" },
      },
      required: ["id"],
    },
  },
  // ── Contract ────────────────────────────────────────────────────
  {
    name: "list_contracts",
    description: "查询合同列表",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "合同名称搜索" },
        status: { type: "string", description: "状态: DRAFT/PENDING/SIGNED/ACTIVE/COMPLETED/CANCELLED" },
        customerId: { type: "string" },
        limit: { type: "number", description: "默认15" },
      },
    },
  },
  {
    name: "get_contract",
    description: "获取合同详情（含发票、付款记录）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "合同ID" } },
      required: ["id"],
    },
  },
  {
    name: "create_contract",
    description: "创建新合同",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "合同名称（必填）" },
        amount: { type: "number", description: "合同金额（必填）" },
        number: { type: "string", description: "合同编号（可选，自动生成）" },
        type: { type: "string", description: "SALES/OUTSOURCING，默认 SALES" },
        customerId: { type: "string", description: "客户ID" },
        supplierId: { type: "string", description: "供应商ID" },
        startDate: { type: "string" },
        endDate: { type: "string" },
      },
      required: ["name", "amount"],
    },
  },
  {
    name: "update_contract",
    description: "更新合同状态或信息",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "合同ID（必填）" },
        status: { type: "string", description: "DRAFT/PENDING/SIGNED/ACTIVE/COMPLETED/CANCELLED" },
        name: { type: "string" },
        amount: { type: "number" },
        startDate: { type: "string" },
        endDate: { type: "string" },
      },
      required: ["id"],
    },
  },
  // ── Supplier ────────────────────────────────────────────────────
  {
    name: "list_suppliers",
    description: "查询供应商列表",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "名称搜索" },
        limit: { type: "number", description: "默认15" },
      },
    },
  },
  {
    name: "get_supplier",
    description: "获取供应商详情",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "供应商ID" } },
      required: ["id"],
    },
  },
  {
    name: "create_supplier",
    description: "创建新供应商",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "供应商名称（必填）" },
        code: { type: "string", description: "供应商编码（可选，自动生成）" },
        contact: { type: "string", description: "联系人" },
        phone: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
        paymentTerms: { type: "string", description: "付款条款" },
        notes: { type: "string" },
      },
      required: ["name"],
    },
  },
  // ── Project ─────────────────────────────────────────────────────
  {
    name: "list_projects",
    description: "查询项目列表",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "PLANNING/IN_PROGRESS/ON_HOLD/COMPLETED/CANCELLED" },
        customerId: { type: "string" },
        limit: { type: "number", description: "默认15" },
      },
    },
  },
  {
    name: "get_project",
    description: "获取项目详情（含任务、里程碑）",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "项目ID" } },
      required: ["id"],
    },
  },
  {
    name: "create_project",
    description: "创建新项目",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "项目名称（必填）" },
        customerId: { type: "string", description: "客户ID（必填）" },
        budget: { type: "number", description: "预算" },
        description: { type: "string" },
        contractId: { type: "string", description: "关联合同ID" },
        startDate: { type: "string" },
        endDate: { type: "string" },
        status: { type: "string", description: "默认 PLANNING" },
      },
      required: ["name", "customerId"],
    },
  },
  // ── Visit ───────────────────────────────────────────────────────
  {
    name: "list_visits",
    description: "查询拜访计划列表",
    inputSchema: {
      type: "object",
      properties: {
        customerId: { type: "string" },
        status: { type: "string", description: "PLANNED/IN_PROGRESS/COMPLETED/CANCELLED" },
        startDate: { type: "string", description: "查询起始日期" },
        endDate: { type: "string", description: "查询结束日期" },
        limit: { type: "number", description: "默认20" },
      },
    },
  },
  {
    name: "create_visit",
    description: "创建拜访计划",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "拜访标题（必填）" },
        customerId: { type: "string", description: "客户ID（必填）" },
        startTime: { type: "string", description: "开始时间（必填），如 2026-05-25T14:00:00" },
        endTime: { type: "string", description: "结束时间，默认开始后1小时" },
        type: { type: "string", description: "FIRST_MEETING/FOLLOW_UP/DEMO/CONTRACT/SUPPORT/OTHER" },
        location: { type: "string" },
        description: { type: "string", description: "拜访目的/内容" },
      },
      required: ["title", "customerId", "startTime"],
    },
  },
  {
    name: "complete_visit",
    description: "将拜访标记为已完成，并记录结果",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "拜访ID（必填）" },
        result: { type: "string", description: "拜访结果摘要" },
        notes: { type: "string", description: "详细记录" },
      },
      required: ["id"],
    },
  },
  // ── Invoice ─────────────────────────────────────────────────────
  {
    name: "list_invoices",
    description: "查询发票列表",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "DRAFT/ISSUED/PAID/OVERDUE/CANCELLED" },
        contractId: { type: "string" },
        type: { type: "string", description: "SALES/PURCHASE" },
        limit: { type: "number", description: "默认15" },
      },
    },
  },
  {
    name: "create_invoice",
    description: "创建发票",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "发票金额（必填）" },
        number: { type: "string", description: "发票号（可选，自动生成）" },
        type: { type: "string", description: "SALES/PURCHASE，默认 SALES" },
        contractId: { type: "string", description: "关联合同ID" },
        issueDate: { type: "string", description: "开票日期，默认今天" },
        dueDate: { type: "string", description: "到期日期，默认30天后" },
        description: { type: "string" },
      },
      required: ["amount"],
    },
  },
  // ── Payment ─────────────────────────────────────────────────────
  {
    name: "list_payments",
    description: "查询付款/收款记录",
    inputSchema: {
      type: "object",
      properties: {
        contractId: { type: "string" },
        status: { type: "string", description: "PENDING/COMPLETED/FAILED" },
        limit: { type: "number", description: "默认15" },
      },
    },
  },
  {
    name: "create_payment",
    description: "创建付款记录",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "金额（必填）" },
        paymentDate: { type: "string", description: "付款日期（必填）" },
        contractId: { type: "string", description: "关联合同ID" },
        invoiceId: { type: "string", description: "关联发票ID" },
        status: { type: "string", description: "PENDING/COMPLETED，默认 PENDING" },
        method: { type: "string", description: "付款方式" },
        notes: { type: "string" },
      },
      required: ["amount", "paymentDate"],
    },
  },
  // ── Todo ────────────────────────────────────────────────────────
  {
    name: "list_todos",
    description: "查询待办事项",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "TODO/IN_PROGRESS/DONE" },
        priority: { type: "string", description: "LOW/MEDIUM/HIGH/URGENT" },
        limit: { type: "number", description: "默认20" },
      },
    },
  },
  {
    name: "create_todo",
    description: "创建待办事项",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "待办标题（必填）" },
        description: { type: "string" },
        priority: { type: "string", description: "LOW/MEDIUM/HIGH/URGENT，默认 MEDIUM" },
        dueDate: { type: "string", description: "截止日期" },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_todo",
    description: "将待办标记为已完成",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "待办ID（必填）" } },
      required: ["id"],
    },
  },
  // ── Statistics ──────────────────────────────────────────────────
  {
    name: "get_statistics",
    description: "获取数据统计概览",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "overview（默认）/ sales / pipeline" },
      },
    },
  },
  // ── Partner ─────────────────────────────────────────────────────
  {
    name: "list_partners",
    description: "查询合作伙伴列表，支持按名称/行业搜索、类型/状态筛选",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "搜索关键词（名称/联系人/行业）" },
        type: { type: "string", description: "AGENT | TECH | CHANNEL | STRATEGIC | OTHER" },
        status: { type: "string", description: "NEGOTIATING | ACTIVE | SUSPENDED | TERMINATED" },
        limit: { type: "number", description: "返回数量，默认20" },
      },
    },
  },
  {
    name: "get_partner",
    description: "获取合作伙伴详情",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "合作伙伴ID" } },
      required: ["id"],
    },
  },
  {
    name: "create_partner",
    description: "创建合作伙伴",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "名称（必填）" },
        type: { type: "string", description: "AGENT | TECH | CHANNEL | STRATEGIC | OTHER" },
        level: { type: "string", description: "GOLD | SILVER | BRONZE（可选）" },
        status: { type: "string", description: "NEGOTIATING | ACTIVE | SUSPENDED | TERMINATED" },
        contact: { type: "string", description: "联系人" },
        phone: { type: "string", description: "电话" },
        email: { type: "string", description: "邮箱" },
        industry: { type: "string", description: "擅长行业" },
        region: { type: "string", description: "覆盖地区" },
        capabilities: { type: "string", description: "核心能力描述" },
        tags: { type: "array", items: { type: "string" }, description: "业务资源标签数组" },
        startDate: { type: "string", description: "合作开始日期（ISO格式）" },
        notes: { type: "string", description: "备注" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_partner",
    description: "更新合作伙伴信息（如状态、等级、联系方式等）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "合作伙伴ID" },
        name: { type: "string" },
        type: { type: "string" },
        level: { type: "string" },
        status: { type: "string" },
        contact: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        industry: { type: "string" },
        region: { type: "string" },
        capabilities: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },
]

// ─────────────────────────────────────────────────────────────────
// executeTool
// ─────────────────────────────────────────────────────────────────
export async function executeTool(name: string, args: any): Promise<ToolResult> {
  const user = await getCurrentUser()
  const teamId = user.teamId!

  try {
    switch (name) {

      // ── Customer ────────────────────────────────────────────────
      case "list_customers": {
        const where: any = { teamId }
        if (args.search) {
          where.OR = [
            { name: { contains: args.search, mode: "insensitive" } },
            { industry: { contains: args.search, mode: "insensitive" } },
          ]
        }
        const data = await prisma.customer.findMany({
          where,
          include: { _count: { select: { contracts: true, opportunities: true, visits: true } } },
          orderBy: { createdAt: "desc" },
          take: Number(args.limit) || 15,
        })
        return { success: true, data }
      }

      case "get_customer": {
        const data = await prisma.customer.findFirst({
          where: { id: args.id, teamId },
          include: {
            contacts: true,
            contracts: { orderBy: { createdAt: "desc" }, take: 10 },
            opportunities: { orderBy: { createdAt: "desc" }, take: 10 },
            visits: { orderBy: { startTime: "desc" }, take: 5 },
          },
        })
        if (!data) return { success: false, error: "客户不存在或无权访问" }
        return { success: true, data }
      }

      case "create_customer": {
        const data = await prisma.customer.create({
          data: {
            name: args.name,
            industry: args.industry,
            level: args.level,
            phone: args.phone,
            email: args.email,
            address: args.address,
            description: args.description,
            teamId,
            ownerId: user.id,
          },
        })
        return { success: true, data }
      }

      case "update_customer": {
        const exists = await prisma.customer.findFirst({ where: { id: args.id, teamId } })
        if (!exists) return { success: false, error: "客户不存在或无权访问" }
        const update: any = {}
        if (args.name !== undefined) update.name = args.name
        if (args.industry !== undefined) update.industry = args.industry
        if (args.level !== undefined) update.level = args.level
        if (args.phone !== undefined) update.phone = args.phone
        if (args.email !== undefined) update.email = args.email
        if (args.address !== undefined) update.address = args.address
        if (args.description !== undefined) update.description = args.description
        const data = await prisma.customer.update({ where: { id: args.id }, data: update })
        return { success: true, data }
      }

      // ── Opportunity ─────────────────────────────────────────────
      case "list_opportunities": {
        const where: any = { teamId }
        if (args.stage) where.stage = normalise(OPP_STAGE_MAP, args.stage, "PROSPECTING")
        if (args.customerId) where.customerId = args.customerId
        const data = await prisma.opportunity.findMany({
          where,
          include: { customer: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: Number(args.limit) || 15,
        })
        return { success: true, data }
      }

      case "get_opportunity": {
        const data = await prisma.opportunity.findFirst({
          where: { id: args.id, teamId },
          include: { customer: true },
        })
        if (!data) return { success: false, error: "商机不存在或无权访问" }
        return { success: true, data }
      }

      case "create_opportunity": {
        // Verify customer belongs to team
        const customer = await prisma.customer.findFirst({ where: { id: args.customerId, teamId } })
        if (!customer) return { success: false, error: "客户不存在，请先用 list_customers 查询客户ID" }
        const data = await prisma.opportunity.create({
          data: {
            name: args.name,
            amount: Number(args.amount) || 0,
            stage: normalise(OPP_STAGE_MAP, args.stage, "PROSPECTING") as any,
            probability: args.probability != null ? Number(args.probability) : 10,
            description: args.description,
            expectedDate: parseDate(args.expectedDate),
            customerId: args.customerId,
            teamId,
          },
        })
        return { success: true, data }
      }

      case "update_opportunity": {
        const exists = await prisma.opportunity.findFirst({ where: { id: args.id, teamId } })
        if (!exists) return { success: false, error: "商机不存在或无权访问" }
        const update: any = {}
        if (args.stage !== undefined) update.stage = normalise(OPP_STAGE_MAP, args.stage, exists.stage as string) as any
        if (args.amount !== undefined) update.amount = Number(args.amount)
        if (args.probability !== undefined) update.probability = Number(args.probability)
        if (args.description !== undefined) update.description = args.description
        if (args.expectedDate !== undefined) update.expectedDate = parseDate(args.expectedDate)
        const data = await prisma.opportunity.update({ where: { id: args.id }, data: update })
        return { success: true, data }
      }

      // ── Contract ────────────────────────────────────────────────
      case "list_contracts": {
        const where: any = { teamId }
        if (args.status) where.status = normalise(CONTRACT_STATUS_MAP, args.status, args.status)
        if (args.customerId) where.customerId = args.customerId
        if (args.search) where.name = { contains: args.search, mode: "insensitive" }
        const data = await prisma.contract.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: Number(args.limit) || 15,
        })
        return { success: true, data }
      }

      case "get_contract": {
        const data = await prisma.contract.findFirst({
          where: { id: args.id, teamId },
          include: {
            customer: true,
            supplier: true,
            payments: { orderBy: { paymentDate: "desc" } },
            invoices: { orderBy: { issueDate: "desc" } },
          },
        })
        if (!data) return { success: false, error: "合同不存在或无权访问" }
        return { success: true, data }
      }

      case "create_contract": {
        // Auto-generate number if not provided
        const number = args.number?.trim() || `HT-${shortId()}`
        // Check uniqueness
        const existing = await prisma.contract.findUnique({ where: { number } })
        const finalNumber = existing ? `HT-${shortId()}` : number

        const contractType = (args.type?.toUpperCase() === "OUTSOURCING") ? "OUTSOURCING" : "SALES"
        const data = await prisma.contract.create({
          data: {
            name: args.name,
            number: finalNumber,
            amount: Number(args.amount),
            type: contractType as any,
            status: "DRAFT",
            customerId: args.customerId || null,
            supplierId: args.supplierId || null,
            startDate: parseDate(args.startDate),
            endDate: parseDate(args.endDate),
            teamId,
          },
        })
        return { success: true, data }
      }

      case "update_contract": {
        const exists = await prisma.contract.findFirst({ where: { id: args.id, teamId } })
        if (!exists) return { success: false, error: "合同不存在或无权访问" }
        const update: any = {}
        if (args.status !== undefined) update.status = normalise(CONTRACT_STATUS_MAP, args.status, exists.status as string) as any
        if (args.name !== undefined) update.name = args.name
        if (args.amount !== undefined) update.amount = Number(args.amount)
        if (args.startDate !== undefined) update.startDate = parseDate(args.startDate)
        if (args.endDate !== undefined) update.endDate = parseDate(args.endDate)
        const data = await prisma.contract.update({ where: { id: args.id }, data: update })
        return { success: true, data }
      }

      // ── Supplier ────────────────────────────────────────────────
      case "list_suppliers": {
        const where: any = { teamId }
        if (args.search) where.name = { contains: args.search, mode: "insensitive" }
        const data = await prisma.supplier.findMany({
          where,
          include: { _count: { select: { contracts: true } } },
          orderBy: { createdAt: "desc" },
          take: Number(args.limit) || 15,
        })
        return { success: true, data }
      }

      case "get_supplier": {
        const data = await prisma.supplier.findFirst({
          where: { id: args.id, teamId },
          include: {
            contracts: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        })
        if (!data) return { success: false, error: "供应商不存在或无权访问" }
        return { success: true, data }
      }

      case "create_supplier": {
        const code = args.code?.trim() || `SUP-${shortId()}`
        const existingCode = await prisma.supplier.findUnique({ where: { code } })
        const finalCode = existingCode ? `SUP-${shortId()}` : code
        const data = await prisma.supplier.create({
          data: {
            name: args.name,
            code: finalCode,
            contact: args.contact,
            phone: args.phone,
            email: args.email,
            address: args.address,
            paymentTerms: args.paymentTerms,
            notes: args.notes,
            status: "ACTIVE",
            teamId,
          },
        })
        return { success: true, data }
      }

      // ── Project ─────────────────────────────────────────────────
      case "list_projects": {
        const where: any = { teamId }
        if (args.status) where.status = args.status
        if (args.customerId) where.customerId = args.customerId
        const data = await prisma.project.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true } },
            _count: { select: { tasks: true, milestones: true } },
          },
          orderBy: { createdAt: "desc" },
          take: Number(args.limit) || 15,
        })
        return { success: true, data }
      }

      case "get_project": {
        const data = await prisma.project.findFirst({
          where: { id: args.id, teamId },
          include: {
            customer: true,
            tasks: { orderBy: { createdAt: "desc" } },
            milestones: { orderBy: { dueDate: "asc" } },
          },
        })
        if (!data) return { success: false, error: "项目不存在或无权访问" }
        return { success: true, data }
      }

      case "create_project": {
        const customer = await prisma.customer.findFirst({ where: { id: args.customerId, teamId } })
        if (!customer) return { success: false, error: "客户不存在，请先用 list_customers 查询" }
        const data = await prisma.project.create({
          data: {
            name: args.name,
            description: args.description,
            budget: Number(args.budget) || 0,
            status: (args.status as any) || "PLANNING",
            customerId: args.customerId,
            contractId: args.contractId || null,
            startDate: parseDate(args.startDate),
            endDate: parseDate(args.endDate),
            teamId,
          },
        })
        return { success: true, data }
      }

      // ── Visit ───────────────────────────────────────────────────
      case "list_visits": {
        const where: any = { teamId }
        if (args.customerId) where.customerId = args.customerId
        if (args.status) where.status = args.status
        const start = parseDate(args.startDate)
        const end = parseDate(args.endDate)
        if (start || end) {
          where.startTime = {}
          if (start) where.startTime.gte = start
          if (end) where.startTime.lte = end
        }
        const data = await prisma.visit.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true } },
            createdBy: { select: { name: true } },
          },
          orderBy: { startTime: "desc" },
          take: Number(args.limit) || 20,
        })
        return { success: true, data }
      }

      case "create_visit": {
        const customer = await prisma.customer.findFirst({ where: { id: args.customerId, teamId } })
        if (!customer) return { success: false, error: "客户不存在，请先用 list_customers 查询客户ID" }

        const startTime = parseDate(
          args.startTime || args.scheduledTime || args.visitTime || args.date
        )
        if (!startTime) return { success: false, error: "无效的日期格式，请使用 ISO 格式如 2026-05-25T14:00:00" }

        const endTime = parseDate(args.endTime) ?? new Date(startTime.getTime() + 3600_000)

        const visitType = normalise(VISIT_TYPE_MAP, args.type, "FOLLOW_UP") as any

        const data = await prisma.visit.create({
          data: {
            title: args.title,
            type: visitType,
            startTime,
            endTime,
            location: args.location,
            description: args.description,
            customerId: args.customerId,
            status: "PLANNED",
            teamId,
            createdById: user.id!,
          },
        })
        return { success: true, data }
      }

      case "complete_visit": {
        const exists = await prisma.visit.findFirst({ where: { id: args.id, teamId } })
        if (!exists) return { success: false, error: "拜访记录不存在或无权访问" }
        const data = await prisma.visit.update({
          where: { id: args.id },
          data: {
            status: "COMPLETED",
            description: args.result || exists.description,
            notes: args.notes || exists.notes,
          },
        })
        return { success: true, data }
      }

      // ── Invoice ─────────────────────────────────────────────────
      case "list_invoices": {
        const where: any = { teamId }
        if (args.status) where.status = args.status
        if (args.contractId) where.contractId = args.contractId
        if (args.type) where.type = args.type
        const data = await prisma.invoice.findMany({
          where,
          include: { contract: { select: { id: true, name: true } } },
          orderBy: { issueDate: "desc" },
          take: Number(args.limit) || 15,
        })
        return { success: true, data }
      }

      case "create_invoice": {
        // Validate contract if provided
        if (args.contractId) {
          const c = await prisma.contract.findFirst({ where: { id: args.contractId, teamId } })
          if (!c) return { success: false, error: "合同不存在或无权访问" }
        }

        const amount = Number(args.amount)
        const taxAmount = Number(args.taxAmount) || 0
        const today = new Date()
        const issueDate = parseDate(args.issueDate) ?? today
        const dueDate = parseDate(args.dueDate) ?? new Date(today.getTime() + 30 * 86_400_000)

        // Auto-generate invoice number
        let number = args.number?.trim()
        if (!number) number = `INV-${shortId()}`
        const existing = await prisma.invoice.findUnique({ where: { number } })
        if (existing) number = `INV-${shortId()}`

        const data = await prisma.invoice.create({
          data: {
            number,
            amount,
            taxAmount,
            totalAmount: amount + taxAmount,
            issueDate,
            dueDate,
            status: "DRAFT",
            type: (args.type?.toUpperCase() === "PURCHASE" ? "PURCHASE" : "SALES") as any,
            description: args.description,
            contractId: args.contractId || null,
            teamId,
          },
        })
        return { success: true, data }
      }

      // ── Payment ─────────────────────────────────────────────────
      case "list_payments": {
        const where: any = { teamId }
        if (args.contractId) where.contractId = args.contractId
        if (args.status) where.status = args.status
        const data = await prisma.payment.findMany({
          where,
          include: {
            contract: { select: { id: true, name: true } },
            invoice: { select: { id: true, number: true } },
          },
          orderBy: { paymentDate: "desc" },
          take: Number(args.limit) || 15,
        })
        return { success: true, data }
      }

      case "create_payment": {
        const paymentDate = parseDate(args.paymentDate)
        if (!paymentDate) return { success: false, error: "无效的付款日期格式" }

        if (args.contractId) {
          const c = await prisma.contract.findFirst({ where: { id: args.contractId, teamId } })
          if (!c) return { success: false, error: "合同不存在或无权访问" }
        }
        if (args.invoiceId) {
          const inv = await prisma.invoice.findFirst({ where: { id: args.invoiceId, teamId } })
          if (!inv) return { success: false, error: "发票不存在或无权访问" }
        }

        const data = await prisma.payment.create({
          data: {
            amount: Number(args.amount),
            paymentDate,
            status: (args.status?.toUpperCase() === "COMPLETED" ? "COMPLETED" : "PENDING") as any,
            method: args.method,
            notes: args.notes,
            invoiceId: args.invoiceId || null,
            contractId: args.contractId || null,
            teamId,
          },
        })
        return { success: true, data }
      }

      // ── Todo ────────────────────────────────────────────────────
      case "list_todos": {
        const where: any = { teamId }
        if (args.status) where.status = args.status
        if (args.priority) where.priority = args.priority
        const data = await prisma.todo.findMany({
          where,
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: Number(args.limit) || 20,
        })
        return { success: true, data }
      }

      case "create_todo": {
        const data = await prisma.todo.create({
          data: {
            title: args.title,
            description: args.description,
            priority: (args.priority?.toUpperCase() as any) || "MEDIUM",
            dueDate: parseDate(args.dueDate),
            status: "TODO",
            teamId,
            creatorId: user.id!,
          },
        })
        return { success: true, data }
      }

      case "complete_todo": {
        const exists = await prisma.todo.findFirst({ where: { id: args.id, teamId } })
        if (!exists) return { success: false, error: "待办不存在或无权访问" }
        const data = await prisma.todo.update({
          where: { id: args.id },
          data: { status: "DONE", completedAt: new Date() },
        })
        return { success: true, data }
      }

      // ── Statistics ──────────────────────────────────────────────
      case "get_statistics": {
        const [
          totalCustomers, activeProjects, totalContracts,
          opportunityAgg, contractAgg, invoiceAgg,
          overduePayments, completedVisits, pendingTodos,
        ] = await Promise.all([
          prisma.customer.count({ where: { teamId } }),
          prisma.project.count({ where: { teamId, status: "IN_PROGRESS" } }),
          prisma.contract.count({ where: { teamId } }),
          prisma.opportunity.aggregate({ where: { teamId }, _sum: { amount: true }, _count: true }),
          prisma.contract.aggregate({ where: { teamId, status: { in: ["SIGNED", "ACTIVE", "COMPLETED"] } }, _sum: { amount: true, paidAmount: true } }),
          prisma.invoice.aggregate({ where: { teamId, status: { in: ["ISSUED", "PAID"] } }, _sum: { amount: true } }),
          prisma.payment.count({ where: { teamId, status: "PENDING", paymentDate: { lt: new Date() } } }),
          prisma.visit.count({ where: { teamId, status: "COMPLETED" } }),
          prisma.todo.count({ where: { teamId, status: { in: ["TODO", "IN_PROGRESS"] } } }),
        ])

        // Opportunity pipeline breakdown
        const pipeline = await prisma.opportunity.groupBy({
          by: ["stage"],
          where: { teamId },
          _count: { id: true },
          _sum: { amount: true },
        })

        return {
          success: true,
          data: {
            customers: totalCustomers,
            activeProjects,
            totalContracts,
            opportunities: { count: opportunityAgg._count, totalAmount: opportunityAgg._sum.amount || 0 },
            contracts: { totalAmount: contractAgg._sum.amount || 0, paidAmount: contractAgg._sum.paidAmount || 0 },
            invoiceAmount: invoiceAgg._sum.amount || 0,
            overduePayments,
            completedVisits,
            pendingTodos,
            pipeline,
          },
        }
      }

      // ── Partner ─────────────────────────────────────────────────
      case "list_partners": {
        const where: any = { teamId }
        if (args.search) {
          where.OR = [
            { name: { contains: args.search, mode: "insensitive" } },
            { contact: { contains: args.search, mode: "insensitive" } },
            { industry: { contains: args.search, mode: "insensitive" } },
            { region: { contains: args.search, mode: "insensitive" } },
          ]
        }
        if (args.type) where.type = args.type
        if (args.status) where.status = args.status
        const data = await prisma.partner.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: args.limit || 20,
        })
        return { success: true, data }
      }

      case "get_partner": {
        const data = await prisma.partner.findFirst({ where: { id: args.id, teamId } })
        if (!data) return { success: false, error: "合作伙伴不存在或无权访问" }
        return { success: true, data }
      }

      case "create_partner": {
        if (!args.name?.trim()) return { success: false, error: "名称不能为空" }
        const code = `PTN-${Date.now()}`
        const data = await prisma.partner.create({
          data: {
            name: args.name.trim(),
            code,
            type: args.type || "OTHER",
            level: args.level || null,
            status: args.status || "NEGOTIATING",
            contact: args.contact || null,
            phone: args.phone || null,
            email: args.email || null,
            address: args.address || null,
            industry: args.industry || null,
            region: args.region || null,
            capabilities: args.capabilities || null,
            tags: Array.isArray(args.tags) ? args.tags : [],
            startDate: parseDate(args.startDate),
            endDate: parseDate(args.endDate),
            notes: args.notes || null,
            teamId,
          },
        })
        return { success: true, data }
      }

      case "update_partner": {
        const exists = await prisma.partner.findFirst({ where: { id: args.id, teamId } })
        if (!exists) return { success: false, error: "合作伙伴不存在或无权访问" }
        const { id, ...rest } = args
        const updateData: any = {}
        if (rest.name !== undefined) updateData.name = rest.name.trim()
        if (rest.type !== undefined) updateData.type = rest.type
        if (rest.level !== undefined) updateData.level = rest.level || null
        if (rest.status !== undefined) updateData.status = rest.status
        if (rest.contact !== undefined) updateData.contact = rest.contact || null
        if (rest.phone !== undefined) updateData.phone = rest.phone || null
        if (rest.email !== undefined) updateData.email = rest.email || null
        if (rest.address !== undefined) updateData.address = rest.address || null
        if (rest.industry !== undefined) updateData.industry = rest.industry || null
        if (rest.region !== undefined) updateData.region = rest.region || null
        if (rest.capabilities !== undefined) updateData.capabilities = rest.capabilities || null
        if (rest.tags !== undefined) updateData.tags = Array.isArray(rest.tags) ? rest.tags : []
        if (rest.startDate !== undefined) updateData.startDate = parseDate(rest.startDate)
        if (rest.endDate !== undefined) updateData.endDate = parseDate(rest.endDate)
        if (rest.notes !== undefined) updateData.notes = rest.notes || null
        const data = await prisma.partner.update({ where: { id }, data: updateData })
        return { success: true, data }
      }

      default:
        return { success: false, error: `未知工具: ${name}` }
    }
  } catch (error: any) {
    console.error(`Tool [${name}] error:`, error)
    return { success: false, error: error.message }
  }
}
