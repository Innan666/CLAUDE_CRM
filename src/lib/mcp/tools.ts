import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// 解析日期字符串，支持多种格式
function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr

  const str = String(dateStr).trim()
  if (!str) return null

  // 尝试多种格式解析
  const formats = [
    // ISO 格式
    () => {
      const d = new Date(str)
      return isNaN(d.getTime()) ? null : d
    },
    // 中文格式: 2025年12月22日 14:00 或 2026年3月7日 15:00:00
    () => {
      const match = str.match(/(\d{1,4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})?:?(\d{1,2})?(:(\d{1,2}))?/)
      if (match) {
        const year = parseInt(match[1])
        const month = parseInt(match[2]) - 1
        const day = parseInt(match[3])
        const hour = match[4] ? parseInt(match[4]) : 0
        const minute = match[5] ? parseInt(match[5]) : 0
        return new Date(year, month, day, hour, minute)
      }
      return null
    },
    // 斜杠格式: 2025/12/22 14:00
    () => {
      const d = new Date(str.replace(/\//g, '-'))
      return isNaN(d.getTime()) ? null : d
    }
  ]

  for (const format of formats) {
    const result = format()
    if (result && !isNaN(result.getTime())) {
      return result
    }
  }

  return null
}

export interface Tool {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, any>
    required?: string[]
  }
}

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
}

// 获取当前用户信息
async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.teamId) {
    throw new Error("未授权")
  }
  return session.user
}

// ============ 客户工具 ============

export const customerTools: Tool[] = [
  {
    name: "list_customers",
    description: "获取客户列表，可按名称搜索",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "搜索关键词" },
        limit: { type: "number", description: "返回数量，默认10" }
      }
    }
  },
  {
    name: "get_customer",
    description: "获取单个客户详情",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "客户ID" }
      },
      required: ["id"]
    }
  },
  {
    name: "create_customer",
    description: "创建新客户",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "客户名称" },
        industry: { type: "string", description: "行业" },
        level: { type: "string", description: "客户等级(A/B/C)" },
        phone: { type: "string", description: "电话" },
        email: { type: "string", description: "邮箱" },
        address: { type: "string", description: "地址" },
        description: { type: "string", description: "备注" }
      },
      required: ["name"]
    }
  }
]

// ============ 合同工具 ============

export const contractTools: Tool[] = [
  {
    name: "list_contracts",
    description: "获取合同列表",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "搜索关键词" },
        status: { type: "string", description: "合同状态" },
        customerId: { type: "string", description: "客户ID" },
        limit: { type: "number", description: "返回数量" }
      }
    }
  },
  {
    name: "get_contract",
    description: "获取合同详情，包括付款记录",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "合同ID" }
      },
      required: ["id"]
    }
  },
  {
    name: "create_contract",
    description: "创建新合同",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "合同名称" },
        number: { type: "string", description: "合同编号" },
        amount: { type: "number", description: "合同金额" },
        type: { type: "string", description: "合同类型" },
        customerId: { type: "string", description: "客户ID" },
        supplierId: { type: "string", description: "供应商ID" },
        startDate: { type: "string", description: "开始日期" },
        endDate: { type: "string", description: "结束日期" }
      },
      required: ["name", "amount"]
    }
  }
]

// ============ 商机工具 ============

export const opportunityTools: Tool[] = [
  {
    name: "list_opportunities",
    description: "获取商机列表",
    inputSchema: {
      type: "object",
      properties: {
        stage: { type: "string", description: "商机阶段" },
        customerId: { type: "string", description: "客户ID" },
        limit: { type: "number", description: "返回数量" }
      }
    }
  },
  {
    name: "get_opportunity",
    description: "获取商机详情",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "商机ID" }
      },
      required: ["id"]
    }
  },
  {
    name: "create_opportunity",
    description: "创建新商机",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "商机名称" },
        amount: { type: "number", description: "金额" },
        stage: { type: "string", description: "阶段(PROSPE CTING/QUALIFICATION/PROPOSAL/NEGOTIATION/WON/LOST)" },
        probability: { type: "number", description: "成功概率" },
        customerId: { type: "string", description: "客户ID" },
        description: { type: "string", description: "描述" }
      },
      required: ["name", "amount"]
    }
  }
]

// ============ 拜访计划工具 ============

export const visitTools: Tool[] = [
  {
    name: "list_visits",
    description: "获取拜访计划列表",
    inputSchema: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "客户ID" },
        status: { type: "string", description: "状态(PLANNED/IN_PROGRESS/COMPLETED/CANCELLED)" },
        startDate: { type: "string", description: "开始日期" },
        endDate: { type: "string", description: "结束日期" }
      }
    }
  },
  {
    name: "create_visit",
    description: "创建拜访计划",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "拜访标题" },
        type: { type: "string", description: "类型(FOLLOW_UP/M EETING/DEMO/OTHER)" },
        startTime: { type: "string", description: "开始时间" },
        endTime: { type: "string", description: "结束时间" },
        location: { type: "string", description: "地点" },
        description: { type: "string", description: "拜访内容" },
        customerId: { type: "string", description: "客户ID" },
        reminder: { type: "string", description: "提醒时间" }
      },
      required: ["title", "startTime", "endTime"]
    }
  },
  {
    name: "complete_visit",
    description: "完成拜访",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "拜访ID" },
        result: { type: "string", description: "拜访结果" }
      },
      required: ["id"]
    }
  }
]

// ============ 发票工具 ============

export const invoiceTools: Tool[] = [
  {
    name: "list_invoices",
    description: "获取发票列表",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "状态" },
        contractId: { type: "string", description: "合同ID" },
        limit: { type: "number", description: "返回数量" }
      }
    }
  },
  {
    name: "create_invoice",
    description: "创建发票",
    inputSchema: {
      type: "object",
      properties: {
        number: { type: "string", description: "发票号" },
        amount: { type: "number", description: "金额" },
        type: { type: "string", description: "类型(INCOME/EXPENSE)" },
        status: { type: "string", description: "状态" },
        contractId: { type: "string", description: "合同ID" },
        issueDate: { type: "string", description: "开票日期" }
      },
      required: ["number", "amount"]
    }
  }
]

// ============ 付款工具 ============

export const paymentTools: Tool[] = [
  {
    name: "list_payments",
    description: "获取付款记录列表",
    inputSchema: {
      type: "object",
      properties: {
        contractId: { type: "string", description: "合同ID" },
        status: { type: "string", description: "状态" },
        limit: { type: "number", description: "返回数量" }
      }
    }
  },
  {
    name: "create_payment",
    description: "创建付款记录",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "金额" },
        paymentDate: { type: "string", description: "付款日期" },
        status: { type: "string", description: "状态(PENDING/COMPLETED)" },
        invoiceId: { type: "string", description: "发票ID" },
        contractId: { type: "string", description: "合同ID" },
        description: { type: "string", description: "备注" }
      },
      required: ["amount", "paymentDate"]
    }
  }
]

// ============ 统计工具 ============

export const analyticsTools: Tool[] = [
  {
    name: "get_statistics",
    description: "获取数据统计",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "统计类型(overview/sales/pipeline)" }
      }
    }
  }
]

// 合并所有工具
export const allTools = [
  ...customerTools,
  ...contractTools,
  ...opportunityTools,
  ...visitTools,
  ...invoiceTools,
  ...paymentTools,
  ...analyticsTools
]

// ============ 工具执行函数 ============

export async function executeTool(name: string, args: any): Promise<ToolResult> {
  const user = await getCurrentUser()

  try {
    switch (name) {
      // 客户操作
      case "list_customers": {
        const customers = await prisma.customer.findMany({
          where: { teamId: user.teamId },
          include: {
            _count: { select: { contracts: true, opportunities: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: args.limit || 10
        })
        return { success: true, data: customers }
      }

      case "get_customer": {
        const customer = await prisma.customer.findUnique({
          where: { id: args.id },
          include: {
            contacts: true,
            contracts: true,
            opportunities: true,
            visits: { orderBy: { startTime: 'desc' }, take: 5 }
          }
        })
        return { success: true, data: customer }
      }

      case "create_customer": {
        const customer = await prisma.customer.create({
          data: {
            ...args,
            teamId: user.teamId,
            ownerId: user.id
          }
        })
        return { success: true, data: customer }
      }

      // 合同操作
      case "list_contracts": {
        const where: any = { teamId: user.teamId }
        if (args.status) where.status = args.status
        if (args.customerId) where.customerId = args.customerId

        const contracts = await prisma.contract.findMany({
          where,
          include: {
            customer: { select: { name: true } },
            supplier: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: args.limit || 10
        })
        return { success: true, data: contracts }
      }

      case "get_contract": {
        const contract = await prisma.contract.findUnique({
          where: { id: args.id },
          include: {
            customer: true,
            supplier: true,
            payments: true,
            invoices: true
          }
        })
        return { success: true, data: contract }
      }

      case "create_contract": {
        const startDate = parseDate(args.startDate)
        const endDate = parseDate(args.endDate)

        const contract = await prisma.contract.create({
          data: {
            name: args.name,
            number: args.number,
            amount: args.amount,
            type: args.type,
            customerId: args.customerId,
            supplierId: args.supplierId,
            startDate,
            endDate,
            teamId: user.teamId,
            status: 'DRAFT'
          }
        })
        return { success: true, data: contract }
      }

      // 商机操作
      case "list_opportunities": {
        const where: any = { teamId: user.teamId }
        if (args.stage) where.stage = args.stage
        if (args.customerId) where.customerId = args.customerId

        const opportunities = await prisma.opportunity.findMany({
          where,
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: args.limit || 10
        })
        return { success: true, data: opportunities }
      }

      case "create_opportunity": {
        const opportunity = await prisma.opportunity.create({
          data: {
            ...args,
            teamId: user.teamId
          }
        })
        return { success: true, data: opportunity }
      }

      // 拜访操作
      case "list_visits": {
        const where: any = { teamId: user.teamId }
        if (args.customerId) where.customerId = args.customerId
        if (args.status) where.status = args.status

        const visits = await prisma.visit.findMany({
          where,
          include: {
            customer: { select: { name: true } },
            createdBy: { select: { name: true } }
          },
          orderBy: { startTime: 'desc' },
          take: 20
        })
        return { success: true, data: visits }
      }

      case "create_visit": {
        // 兼容 AI 返回的各种字段名
        const startTimeInput = args.startTime || args.scheduledTime || args.scheduledDate || args.visitTime || args.plannedDate || args.date || args.appointmentTime
        const endTimeInput = args.endTime || args.scheduledEndTime || args.endScheduledTime || args.endTime || args.plannedEndTime
        const reminder = parseDate(args.reminder || args.reminderTime)

        const startTime = parseDate(startTimeInput)
        const endTime = endTimeInput ? parseDate(endTimeInput) : (startTime ? new Date(startTime.getTime() + 3600000) : null) // 默认1小时

        if (!startTime) {
          return { success: false, error: "无效的日期格式，请使用如 2025-12-22T14:00:00 或 2025年12月22日 14:00 的格式" }
        }

        // 兼容 AI 返回的 type
        const validTypes = ['FOLLOW_UP', 'MEETING', 'DEMO', 'OTHER']
        const typeMap: Record<string, string> = {
          'CUSTOMER_VISIT': 'FOLLOW_UP',
          'VISIT': 'FOLLOW_UP',
          'MEETING': 'MEETING',
          'DEMO': 'DEMO',
          'OTHER': 'OTHER',
          '初次拜访': 'FOLLOW_UP',
          '拜访': 'FOLLOW_UP',
          '会议': 'MEETING',
          '演示': 'DEMO'
        }
        let visitType = 'FOLLOW_UP'
        if (args.type) {
          const typeStr = String(args.type).toUpperCase()
          const mapped = typeMap[typeStr] || typeStr
          if (validTypes.includes(mapped)) {
            visitType = mapped
          }
        }

        const visit = await prisma.visit.create({
          data: {
            title: args.title || '客户拜访',
            type: visitType as any,
            startTime,
            endTime: endTime || new Date(startTime.getTime() + 3600000),
            location: args.location,
            description: args.description,
            reminder,
            customerId: args.customerId,
            contactId: args.contactId,
            status: 'PLANNED',
            teamId: user.teamId,
            createdById: user.id
          }
        })
        return { success: true, data: visit }
      }

      case "complete_visit": {
        const visit = await prisma.visit.update({
          where: { id: args.id },
          data: {
            status: 'COMPLETED',
            description: args.result || ''
          }
        })
        return { success: true, data: visit }
      }

      // 发票操作
      case "list_invoices": {
        const where: any = { teamId: user.teamId }
        if (args.status) where.status = args.status
        if (args.contractId) where.contractId = args.contractId

        const invoices = await prisma.invoice.findMany({
          where,
          include: { contract: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: args.limit || 10
        })
        return { success: true, data: invoices }
      }

      case "create_invoice": {
        // Validate contractId if provided (must be non-empty string)
        const validContractId = args.contractId && args.contractId.trim() !== ''
        if (validContractId) {
          const contract = await prisma.contract.findUnique({ where: { id: args.contractId } })
          if (!contract) {
            return { success: false, error: "关联的合同不存在" }
          }
        }

        const invoice = await prisma.invoice.create({
          data: {
            ...args,
            contractId: validContractId ? args.contractId : null,
            teamId: user.teamId
          }
        })
        return { success: true, data: invoice }
      }

      // 付款操作
      case "list_payments": {
        const where: any = { teamId: user.teamId }
        if (args.contractId) where.contractId = args.contractId
        if (args.status) where.status = args.status

        const payments = await prisma.payment.findMany({
          where,
          include: {
            contract: { select: { name: true } },
            invoice: { select: { number: true } }
          },
          orderBy: { paymentDate: 'desc' },
          take: args.limit || 10
        })
        return { success: true, data: payments }
      }

      case "create_payment": {
        const paymentDate = parseDate(args.paymentDate)
        if (!paymentDate) {
          return { success: false, error: "无效的付款日期格式" }
        }

        const payment = await prisma.payment.create({
          data: {
            amount: args.amount,
            paymentDate,
            status: args.status || 'PENDING',
            invoiceId: args.invoiceId,
            contractId: args.contractId,
            teamId: user.teamId
          }
        })
        return { success: true, data: payment }
      }

      // 统计
      case "get_statistics": {
        const [customers, contracts, opportunities, invoices, visits] = await Promise.all([
          prisma.customer.count({ where: { teamId: user.teamId } }),
          prisma.contract.aggregate({
            where: { teamId: user.teamId },
            _sum: { amount: true }
          }),
          prisma.opportunity.aggregate({
            where: { teamId: user.teamId },
            _sum: { amount: true }
          }),
          prisma.invoice.aggregate({
            where: { teamId: user.teamId },
            _sum: { amount: true }
          }),
          prisma.visit.count({
            where: { teamId: user.teamId, status: 'COMPLETED' }
          })
        ])

        return {
          success: true,
          data: {
            customers,
            contractAmount: contracts._sum.amount || 0,
            opportunityAmount: opportunities._sum.amount || 0,
            invoiceAmount: invoices._sum.amount || 0,
            completedVisits: visits
          }
        }
      }

      default:
        return { success: false, error: `未知工具: ${name}` }
    }
  } catch (error: any) {
    console.error(`Tool ${name} error:`, error)
    return { success: false, error: error.message }
  }
}
