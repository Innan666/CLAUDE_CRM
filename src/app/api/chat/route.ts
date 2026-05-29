import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { allTools, executeTool } from "@/lib/mcp/tools"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatRequest {
  message: string
  history: Message[]
}

// Layer 1: Compact index of all entities (names + IDs only). Always included, stays small even with hundreds of records.
async function getEntityIndex(teamId: string): Promise<{
  index: string
  customers: { id: string; name: string }[]
  opportunities: { id: string; name: string }[]
  contracts: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  suppliers: { id: string; name: string }[]
  partners: { id: string; name: string }[]
}> {
  const [customers, opportunities, contracts, projects, suppliers, todos, partners] = await Promise.all([
    prisma.customer.findMany({ where: { teamId }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.opportunity.findMany({ where: { teamId }, select: { id: true, name: true, stage: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    prisma.contract.findMany({ where: { teamId }, select: { id: true, name: true, number: true, status: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    prisma.project.findMany({ where: { teamId }, select: { id: true, name: true, status: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.supplier.findMany({ where: { teamId }, select: { id: true, name: true, code: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.todo.findMany({ where: { teamId, status: { not: "DONE" } }, select: { id: true, title: true, priority: true }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.partner.findMany({ where: { teamId }, select: { id: true, name: true, type: true, status: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
  ])

  const index = `【客户索引】${customers.map(c => `${c.name}[${c.id}]`).join("、") || "无"}
【商机索引】${opportunities.map(o => `${o.name}[${o.id}](${o.stage})`).join("、") || "无"}
【合同索引】${contracts.map(c => `${c.name}[${c.id}](${c.number},${c.status})`).join("、") || "无"}
【项目索引】${projects.map(p => `${p.name}[${p.id}](${p.status})`).join("、") || "无"}
【供应商索引】${suppliers.map(s => `${s.name}[${s.id}](${s.code})`).join("、") || "无"}
【待办索引】${todos.map(t => `${t.title}[${t.id}](${t.priority})`).join("、") || "无"}
【合作伙伴索引】${partners.map(p => `${p.name}[${p.id}](${p.type},${p.status})`).join("、") || "无"}`

  return { index, customers, opportunities, contracts, projects, suppliers, partners }
}

// Layer 2: Fetch full details only for entities whose names appear in the current query.
async function getQueryContext(
  teamId: string,
  userMessage: string,
  history: Message[],
  index: Awaited<ReturnType<typeof getEntityIndex>>
): Promise<string> {
  const searchText = [userMessage, ...history.slice(-4).map(m => m.content)].join(" ")
  const parts: string[] = []

  // List-intent detection: user wants complete records, not just what's in the limited index.
  // Inject a directive so the AI calls list_* tools instead of relying on index data.
  const LIST_TRIGGERS = ["所有", "全部", "全量", "列出", "所有的", "一共有多少", "有多少", "统计", "汇总", "整体分析", "分析一下", "总览"]
  const ENTITY_INTENT_MAP = [
    { keywords: ["客户"],         tool: "list_customers",     label: "客户" },
    { keywords: ["商机"],         tool: "list_opportunities",  label: "商机" },
    { keywords: ["合同"],         tool: "list_contracts",      label: "合同" },
    { keywords: ["项目"],         tool: "list_projects",       label: "项目" },
    { keywords: ["供应商"],       tool: "list_suppliers",      label: "供应商" },
    { keywords: ["待办", "任务"], tool: "list_todos",          label: "待办" },
    { keywords: ["拜访"],         tool: "list_visits",         label: "拜访" },
  ]

  const hasListTrigger = LIST_TRIGGERS.some(k => userMessage.includes(k))
  if (hasListTrigger) {
    const matched = ENTITY_INTENT_MAP.filter(e => e.keywords.some(k => userMessage.includes(k)))
    if (matched.length > 0) {
      parts.push(`【重要指令】用户请求完整数据，索引仅包含部分记录，必须调用工具获取完整结果：${matched.map(e => `${e.label} → 调用 ${e.tool}`).join("、")}`)
    } else {
      parts.push(`【重要指令】用户请求查看完整数据，索引数据有限，请主动调用相关 list_* 工具后再作答，不要仅凭索引中的有限条目作答`)
    }
  }

  const mentionedCustomerIds = index.customers.filter(c => searchText.includes(c.name)).map(c => c.id)
  if (mentionedCustomerIds.length > 0) {
    const details = await prisma.customer.findMany({
      where: { id: { in: mentionedCustomerIds }, teamId },
      include: {
        contacts: { select: { id: true, name: true, position: true, phone: true, email: true }, take: 5 },
        opportunities: { select: { id: true, name: true, stage: true, amount: true }, take: 5, orderBy: { updatedAt: "desc" } },
        contracts: { select: { id: true, name: true, number: true, status: true, amount: true, paidAmount: true }, take: 5, orderBy: { updatedAt: "desc" } },
        visits: { select: { id: true, title: true, status: true, startTime: true }, take: 3, orderBy: { startTime: "desc" } },
      },
    })
    parts.push(`【相关客户详情】${JSON.stringify(details, null, 0)}`)
  }

  const mentionedOppIds = index.opportunities.filter(o => searchText.includes(o.name)).map(o => o.id)
  if (mentionedOppIds.length > 0) {
    const details = await prisma.opportunity.findMany({
      where: { id: { in: mentionedOppIds }, teamId },
      include: { customer: { select: { id: true, name: true } } },
    })
    parts.push(`【相关商机详情】${JSON.stringify(details, null, 0)}`)
  }

  const mentionedContractIds = index.contracts.filter(c => searchText.includes(c.name)).map(c => c.id)
  if (mentionedContractIds.length > 0) {
    const details = await prisma.contract.findMany({
      where: { id: { in: mentionedContractIds }, teamId },
      include: { customer: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
    })
    parts.push(`【相关合同详情】${JSON.stringify(details, null, 0)}`)
  }

  const mentionedProjectIds = index.projects.filter(p => searchText.includes(p.name)).map(p => p.id)
  if (mentionedProjectIds.length > 0) {
    const details = await prisma.project.findMany({
      where: { id: { in: mentionedProjectIds }, teamId },
      include: { customer: { select: { id: true, name: true } } },
    })
    parts.push(`【相关项目详情】${JSON.stringify(details, null, 0)}`)
  }

  const mentionedSupplierIds = index.suppliers.filter(s => searchText.includes(s.name)).map(s => s.id)
  if (mentionedSupplierIds.length > 0) {
    const details = await prisma.supplier.findMany({
      where: { id: { in: mentionedSupplierIds }, teamId },
    })
    parts.push(`【相关供应商详情】${JSON.stringify(details, null, 0)}`)
  }

  return parts.join("\n")
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool call detection (same patterns as before)
// ──────────────────────────────────────────────────────────────────────────────
function parseToolCalls(content: string): { name: string; args: any }[] {
  const toolCalls: { name: string; args: any }[] = []
  let match

  const jsonPattern = /\{"tool":\s*"([^"]+)",\s*"args":\s*(\{[\s\S]*?\})\s*\}/g
  while ((match = jsonPattern.exec(content)) !== null) {
    try {
      const name = match[1]
      const args = JSON.parse(match[2])
      if (!toolCalls.find(t => t.name === name)) toolCalls.push({ name, args })
    } catch {}
  }

  const invokePattern = /<invoke\s+name=["']([^"']+)["']>([\s\S]*?)<\/invoke>/g
  while ((match = invokePattern.exec(content)) !== null) {
    const name = match[1]
    const args: any = {}
    const paramPattern = /<parameter\s+name=["']([^"']+)["']>([\s\S]*?)<\/parameter>/g
    let paramMatch
    while ((paramMatch = paramPattern.exec(match[2])) !== null) {
      const val = paramMatch[2].trim()
      try { args[paramMatch[1]] = (val.startsWith("{") || val.startsWith("[")) ? JSON.parse(val) : /^\d+$/.test(val) ? parseInt(val) : val }
      catch { args[paramMatch[1]] = val }
    }
    if (!toolCalls.find(t => t.name === name)) toolCalls.push({ name, args })
  }

  const codeBlockPattern = /```json\s*\{[\s\S]*?"tool"\s*:\s*"([^"]+)"[\s\S]*?"args"\s*:\s*(\{[\s\S]*?\})\s*\}[\s\S]*?```/g
  while ((match = codeBlockPattern.exec(content)) !== null) {
    try {
      const name = match[1]
      const args = JSON.parse(match[2].replace(/,\s*}/g, "}"))
      if (!toolCalls.find(t => t.name === name)) toolCalls.push({ name, args })
    } catch {}
  }

  return toolCalls
}

// ──────────────────────────────────────────────────────────────────────────────
// Buffered API call — reads the full response before returning.
// Returns { text, reasoning } without streaming anything to the client.
// ──────────────────────────────────────────────────────────────────────────────
async function callAPIBuffer(
  apiKey: string,
  baseUrl: string,
  messages: any[]
): Promise<{ text: string; reasoning: string }> {
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      messages,
      max_tokens: 4096,
      thinking: { type: "enabled", budget: 4096 },
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} - ${errorText}`)
  }
  if (!response.body) throw new Error("No response body")

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""
  let fullReasoning = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data:")) continue
      const dataStr = trimmed.slice(5).trim()
      if (!dataStr || dataStr === "[DONE]") continue
      try {
        const data = JSON.parse(dataStr)
        if (data.type === "content_block_delta") {
          const delta = data.delta
          if (delta?.type === "text_delta") fullText += delta.text || ""
          else if (delta?.type === "thinking_delta") fullReasoning += delta.thinking || delta.text || ""
        }
      } catch {}
    }
  }

  return { text: fullText, reasoning: fullReasoning }
}

// ──────────────────────────────────────────────────────────────────────────────
// Agentic loop: buffer each round, detect tool calls, execute them.
// Only emits clean content to onChunk — never raw tool-call JSON.
//
// SSE event types emitted:
//   { type: "thinking",    content: "..." }
//   { type: "tool_call",   tool: "list_customers" }
//   { type: "tool_result", tool: "list_customers", success: true }
//   { type: "text",        content: "..." }   ← final answer only
// ──────────────────────────────────────────────────────────────────────────────
async function processWithTools(
  apiKey: string,
  baseUrl: string,
  messages: any[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const maxIterations = 5

  for (let i = 0; i < maxIterations; i++) {
    const { text, reasoning } = await callAPIBuffer(apiKey, baseUrl, messages)

    // Always forward thinking/reasoning to the client
    if (reasoning) {
      onChunk(JSON.stringify({ type: "thinking", content: reasoning }))
    }

    const toolCalls = parseToolCalls(text)

    if (toolCalls.length === 0) {
      // No tool calls → this is the final user-visible answer
      onChunk(JSON.stringify({ type: "text", content: text }))
      return
    }

    // ── Tool execution round ──────────────────────────────────────────────────
    // Add the raw (tool-call-containing) assistant turn to history,
    // but DO NOT forward it to the client.
    messages.push({
      role: "assistant",
      content: [{ type: "text", text }],
    })

    for (const toolCall of toolCalls) {
      onChunk(JSON.stringify({ type: "tool_call", tool: toolCall.name }))

      const result = await executeTool(toolCall.name, toolCall.args)

      onChunk(JSON.stringify({ type: "tool_result", tool: toolCall.name, success: result.success }))

      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `工具 ${toolCall.name} 执行结果:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      })
    }
  }

  onChunk(JSON.stringify({ type: "text", content: "已达到最大处理次数，请重新提问。" }))
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/chat
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body: ChatRequest = await request.json()
    const { message } = body
    if (!message?.trim()) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 })
    }

    const entityData = await getEntityIndex(session.user.teamId)
    const queryContext = await getQueryContext(session.user.teamId, message, body.history, entityData)

    const staticInstructions = `你是CRM系统智能助手。使用工具查询和操作数据，用简洁中文回复用户。

## 数据模型枚举值（严格使用，不要自创）:
- VisitType: FIRST_MEETING | FOLLOW_UP | DEMO | CONTRACT | SUPPORT | OTHER
- OpportunityStage: PROSPECTING | QUALIFICATION | PROPOSAL | NEGOTIATION | CLOSED_WON | CLOSED_LOST
- ContractStatus: DRAFT | PENDING | SIGNED | ACTIVE | COMPLETED | CANCELLED
- ContractType: SALES | OUTSOURCING
- ProjectStatus: PLANNING | IN_PROGRESS | ON_HOLD | COMPLETED | CANCELLED
- InvoiceStatus: DRAFT | ISSUED | PAID | OVERDUE | CANCELLED
- InvoiceType: SALES | PURCHASE
- PaymentStatus: PENDING | COMPLETED | FAILED
- TodoStatus: TODO | IN_PROGRESS | DONE
- Priority: LOW | MEDIUM | HIGH | URGENT

## 可用工具（共${allTools.length}个）:
${allTools.map(t => `- ${t.name}: ${t.description}`).join("\n")}

## 工具调用规则:
1. 调用工具时只输出一行 JSON，格式: {"tool": "工具名", "args": {参数}}
2. 收到工具结果后用中文整理返回给用户，不要暴露原始JSON
3. 需要ID时优先从下方"数据索引"中提取，如找不到先调用 list_* 工具查询
4. 创建拜访必须提供 customerId（从客户索引获取）和 startTime（ISO格式如 2026-05-25T14:00:00）
5. 创建商机必须提供 customerId
6. 禁止编造不存在的ID

## 示例:
{"tool": "list_customers", "args": {}}
{"tool": "get_customer", "args": {"id": "客户ID"}}
{"tool": "update_opportunity", "args": {"id": "商机ID", "stage": "CLOSED_WON"}}
{"tool": "create_visit", "args": {"title": "首次拜访", "customerId": "客户ID", "startTime": "2026-05-26T10:00:00", "type": "FIRST_MEETING"}}
{"tool": "create_todo", "args": {"title": "跟进合同签署", "priority": "HIGH"}}`

    const systemPrompt = `${staticInstructions}

## 当前数据索引（方括号内为ID，可直接用于工具调用）:
${entityData.index}${queryContext ? `\n\n## 本次查询相关详情:\n${queryContext}` : ""}`

    const apiKey = process.env.MINIMAX_API_KEY
    const baseUrl = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/anthropic"

    if (!apiKey) {
      return NextResponse.json({ error: "MINIMAX_API_KEY 未配置" }, { status: 500 })
    }

    const messages = [
      { role: "system", content: [{ type: "text", text: systemPrompt }] },
      ...body.history.map(m => ({ role: m.role, content: [{ type: "text", text: m.content }] })),
      { role: "user", content: [{ type: "text", text: message }] },
    ]

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        }

        try {
          await processWithTools(apiKey, baseUrl, messages, (chunk) => {
            try {
              const data = JSON.parse(chunk)

              if (data.type === "text") {
                send({ type: "content_block_delta", delta: { type: "text_delta", text: data.content } })
              } else if (data.type === "thinking") {
                send({ type: "content_block_delta", delta: { type: "thinking_delta", thinking: data.content } })
              } else if (data.type === "tool_call") {
                send({ type: "tool_call", tool: data.tool })
              } else if (data.type === "tool_result") {
                send({ type: "tool_result", tool: data.tool, success: data.success })
              }
            } catch {}
          })

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error: any) {
          console.error("Stream error:", error)
          send({ type: "error", error: error.message })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: error.message || "处理请求失败" }, { status: 500 })
  }
}
