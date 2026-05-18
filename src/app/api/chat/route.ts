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

// 数据库 Schema 文档
const DATABASE_SCHEMA = `
## CRM 数据库

### 数据模型:
- Customer: id, name, industry, level, phone, email, address
- Contact: id, name, position, phone, email, customerId
- Opportunity: id, name, amount, stage, probability, customerId
- Contract: id, name, number, amount, status, type, customerId, supplierId, paidAmount, invoicedAmount
- Project: id, name, budget, status, customerId, contractId
- Invoice: id, number, amount, status, type, contractId
- Payment: id, amount, paymentDate, status, invoiceId, contractId
- Supplier: id, name, code, contact, phone
- Visit: id, title, type, status, customerId
`

// 可用工具列表
const TOOLS_SCHEMA = allTools.map(t => ({
  name: t.name,
  description: t.description,
  input_schema: t.inputSchema
}))

// 获取数据库上下文
async function getDatabaseContext(teamId: string): Promise<string> {
  const [customers, opportunities, contracts, projects, invoices, suppliers, visits] = await Promise.all([
    prisma.customer.findMany({
      where: { teamId },
      select: { id: true, name: true, industry: true, level: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.opportunity.findMany({
      where: { teamId },
      select: { id: true, name: true, amount: true, stage: true, customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.contract.findMany({
      where: { teamId },
      select: { id: true, name: true, number: true, amount: true, status: true, type: true, paidAmount: true, invoicedAmount: true, customer: { select: { name: true } }, supplier: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.project.findMany({
      where: { teamId },
      select: { id: true, name: true, budget: true, status: true, customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.invoice.findMany({
      where: { teamId },
      select: { id: true, number: true, amount: true, status: true, type: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.supplier.findMany({
      where: { teamId },
      select: { id: true, name: true, code: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.visit.findMany({
      where: { teamId },
      select: { id: true, title: true, type: true, status: true, customer: { select: { name: true } } },
      orderBy: { startTime: 'desc' },
      take: 10
    })
  ])

  return `
客户: ${customers.map(c => `${c.name}(${c.industry||'-'})`).join(', ') || '无'}
商机: ${opportunities.map(o => `${o.name}¥${o.amount}(${o.stage})`).join(', ') || '无'}
合同: ${contracts.map(c => `${c.name}¥${c.amount}已付¥${c.paidAmount}(${c.status})`).join(', ') || '无'}
项目: ${projects.map(p => `${p.name}¥${p.budget}(${p.status})`).join(', ') || '无'}
发票: ${invoices.map(i => `${i.number}¥${i.amount}(${i.status})`).join(', ') || '无'}
拜访: ${visits.map(v => `${v.title}(${v.status})`).join(', ') || '无'}
供应商: ${suppliers.map(s => `${s.name}(${s.code})`).join(', ') || '无'}
`
}

// 解析工具调用
function parseToolCalls(content: string): { name: string; args: any }[] {
  const toolCalls: { name: string; args: any }[] = []

  // 格式0: {"tool": "xxx", "args": {...}} - 优先解析 JSON 格式
  const jsonPattern = /\{"tool":\s*"([^"]+)",\s*"args":\s*(\{[\s\S]*?\})\s*\}/g
  let match
  while ((match = jsonPattern.exec(content)) !== null) {
    try {
      const name = match[1]
      const args = JSON.parse(match[2])
      if (!toolCalls.find(t => t.name === name)) {
        toolCalls.push({ name, args })
      }
    } catch (e) {}
  }

  // 格式1: <invoke name="xxx"> 或 <invoke name="xxx"><parameter name="xxx">value</parameter></invoke>
  const invokePattern = /<invoke\s+name=["']([^"']+)["']>([\s\S]*?)<\/invoke>/g
  while ((match = invokePattern.exec(content)) !== null) {
    const name = match[1]
    const paramsContent = match[2]

    // 解析参数
    const args: any = {}
    const paramPattern = /<parameter\s+name=["']([^"']+)["']>([\s\S]*?)<\/parameter>/g
    let paramMatch
    while ((paramMatch = paramPattern.exec(paramsContent)) !== null) {
      const paramName = paramMatch[1]
      let paramValue = paramMatch[2].trim()

      // 尝试解析 JSON 值
      try {
        if (paramValue.startsWith('{') || paramValue.startsWith('[')) {
          args[paramName] = JSON.parse(paramValue)
        } else if (/^\d+$/.test(paramValue)) {
          args[paramName] = parseInt(paramValue)
        } else {
          args[paramName] = paramValue
        }
      } catch {
        args[paramName] = paramValue
      }
    }

    // 检查是否已有同名工具
    if (!toolCalls.find(t => t.name === name)) {
      toolCalls.push({ name, args })
    }
  }

  // 格式2: {tool => "xxx", args => {...}}
  const toolArrowPattern = /\{[\s\S]*?tool\s*=>\s*["']([^"']+)["'][\s\S]*?args\s*=>\s*\{[\s\S]*?\}[\s\S]*?\}/g
  while ((match = toolArrowPattern.exec(content)) !== null) {
    try {
      const name = match[1]
      // 提取 args 部分
      const argsMatch = match[0].match(/args\s*=>\s*\{([\s\S]*?)\}/)
      if (argsMatch) {
        const argsStr = argsMatch[1].replace(/(\w+)\s*=>\s*/g, '"$1": ').replace(/'/g, '"')
        const args = JSON.parse(`{${argsStr}}`)
        if (!toolCalls.find(t => t.name === name)) {
          toolCalls.push({ name, args })
        }
      }
    } catch (e) {}
  }

  // 格式3: [TOOL_CALL] {tool => "xxx", args => {...}} [/TOOL_CALL]
  const toolCallBlockPattern = /\[TOOL_CALL\]\s*\{[\s\S]*?tool\s*=>\s*["']([^"']+)["'][\s\S]*?args\s*=>\s*\{[\s\S]*?\}[\s\S]*?\}\s*\[\/TOOL_CALL\]/g
  while ((match = toolCallBlockPattern.exec(content)) !== null) {
    try {
      const name = match[1]
      const argsMatch = match[0].match(/args\s*=>\s*\{([\s\S]*?)\}/)
      if (argsMatch) {
        const argsStr = argsMatch[1].replace(/(\w+)\s*=>\s*/g, '"$1": ').replace(/'/g, '"')
        const args = JSON.parse(`{${argsStr}}`)
        if (!toolCalls.find(t => t.name === name)) {
          toolCalls.push({ name, args })
        }
      }
    } catch (e) {}
  }

  // 格式4: <tool_call> [ { tool => 'xxx', args => { key="value" } } ] </tool_call>
  const toolCallXmlPattern = /<tool_call>\s*\[\s*\{[\s\S]*?tool\s*=>\s*['"]([^'"]+)['"][\s\S]*?args\s*=>\s*\{([\s\S]*?)\}[\s\S]*?\}\s*\]\s*<\/tool_call>/g
  while ((match = toolCallXmlPattern.exec(content)) !== null) {
    try {
      const name = match[1]
      const argsStr = match[2]
      // 转换 key="value" 格式为 "key": "value"
      const convertedArgs = argsStr.replace(/(\w+)=(".*?")/g, '"$1": $2')
      const args = JSON.parse(`{${convertedArgs}}`)
      if (!toolCalls.find(t => t.name === name)) {
        toolCalls.push({ name, args })
      }
    } catch (e) {
      console.log("Failed to parse tool_call format 4:", e)
    }
  }

  // 格式5: <tool_code>list_customers</tool_code>
  const toolCodePattern = /<tool_code>([^<\s]+)<\/tool_code>/g
  while ((match = toolCodePattern.exec(content)) !== null) {
    const name = match[1].trim()
    if (name && !toolCalls.find(t => t.name === name)) {
      toolCalls.push({ name, args: {} })
    }
  }

  // 格式6: <tool_code>xxx<param name="key">value</param></tool_code>
  const toolCodeWithParamsPattern = /<tool_code>(\w+)([\s\S]*?)<\/tool_code>/g
  while ((match = toolCodeWithParamsPattern.exec(content)) !== null) {
    const name = match[1].trim()
    const paramsContent = match[2]

    const args: any = {}
    const paramPattern = /<param\s+name=["']([^"']+)["']>([\s\S]*?)<\/param>/g
    let paramMatch
    while ((paramMatch = paramPattern.exec(paramsContent)) !== null) {
      const paramName = paramMatch[1]
      let paramValue = paramMatch[2].trim()
      try {
        if (paramValue.startsWith('{') || paramValue.startsWith('[')) {
          args[paramName] = JSON.parse(paramValue)
        } else if (/^\d+$/.test(paramValue)) {
          args[paramName] = parseInt(paramValue)
        } else {
          args[paramName] = paramValue
        }
      } catch {
        args[paramName] = paramValue
      }
    }

    if (!toolCalls.find(t => t.name === name)) {
      toolCalls.push({ name, args })
    }
  }

  // 格式6: <tool_call> { tool => 'xxx', args => { key="value" } } </tool_call>
  const toolCallSimplePattern = /<tool_call>\s*\{[\s\S]*?tool\s*=>\s*['"]([^'"]+)['"][\s\S]*?args\s*=>\s*\{([\s\S]*?)\}[\s\S]*?\}\s*<\/tool_call>/g
  while ((match = toolCallSimplePattern.exec(content)) !== null) {
    try {
      const name = match[1]
      const argsStr = match[2]
      const convertedArgs = argsStr.replace(/(\w+)=(".*?")/g, '"$1": $2')
      const args = JSON.parse(`{${convertedArgs}}`)
      if (!toolCalls.find(t => t.name === name)) {
        toolCalls.push({ name, args })
      }
    } catch (e) {
      console.log("Failed to parse tool_call format 5:", e)
    }
  }

  // 格式4: ```json { "tool": "xxx", "args": {...} } ```
  const codeBlockPattern = /```json\s*\{[\s\S]*?"tool"\s*:\s*"([^"]+)"[\s\S]*?"args"\s*:\s*(\{[\s\S]*?\})\s*\}[\s\S]*?```/g
  while ((match = codeBlockPattern.exec(content)) !== null) {
    try {
      const name = match[1]
      const args = JSON.parse(match[2].replace(/,\s*}/g, '}'))
      if (!toolCalls.find(t => t.name === name)) {
        toolCalls.push({ name, args })
      }
    } catch (e) {}
  }

  return toolCalls
}

// 流式调用 API
async function callAPIStream(apiKey: string, baseUrl: string, messages: any[], onChunk: (chunk: string) => void) {
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "MiniMax-M2.5",
      messages,
      max_tokens: 4096,
      thinking: { type: "enabled", budget: 4096 },
      stream: true
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} - ${errorText}`)
  }

  if (!response.body) {
    throw new Error("No response body")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data:")) continue

      const dataStr = trimmed.slice(5).trim()
      if (!dataStr || dataStr === "[DONE]") continue

      try {
        const data = JSON.parse(dataStr)

        if (data.type === "content_block_delta") {
          const delta = data.delta
          if (delta?.type === "text_delta") {
            fullText += delta.text || ""
            onChunk(JSON.stringify({ type: "text", content: delta.text }))
          } else if (delta?.type === "thinking_delta") {
            onChunk(JSON.stringify({ type: "thinking", content: delta.thinking || delta.text || "" }))
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  return fullText
}

// 执行工具并生成最终回复
async function processWithTools(apiKey: string, baseUrl: string, messages: any[], onChunk: (chunk: string) => void): Promise<string> {
  const maxIterations = 5
  let currentIteration = 0

  while (currentIteration < maxIterations) {
    currentIteration++

    // 第一轮：获取 AI 回复
    if (currentIteration === 1) {
      onChunk(JSON.stringify({ type: "status", content: "正在分析您的问题..." }))
    }

    let fullText = await callAPIStream(apiKey, baseUrl, messages, onChunk)

    // 调试：打印原始返回内容
    console.log("=== AI Raw Response ===")
    console.log(fullText)
    console.log("=== End Raw Response ===")

    // 检查是否需要工具调用
    const toolCalls = parseToolCalls(fullText)
    console.log(`Iteration ${currentIteration}: Found ${toolCalls.length} tool calls`, toolCalls)

    if (toolCalls.length === 0) {
      // 没有更多工具调用，返回最终结果
      return fullText
    }

    // 发送工具调用状态
    onChunk(JSON.stringify({ type: "status", content: `正在执行 ${toolCalls.length} 个操作...` }))

    // 添加助手消息
    messages.push({ role: "assistant", content: fullText })

    // 执行工具
    for (const toolCall of toolCalls) {
      console.log(`Executing tool: ${toolCall.name}`, toolCall.args)
      const result = await executeTool(toolCall.name, toolCall.args)

      // 发送工具执行结果
      const resultMsg = result.success
        ? `✓ ${toolCall.name} 执行成功`
        : `✗ ${toolCall.name} 执行失败: ${result.error}`
      onChunk(JSON.stringify({ type: "status", content: resultMsg }))

      // 添加结果到消息历史
      messages.push({
        role: "user",
        content: `工具 ${toolCall.name} 执行结果:\n${JSON.stringify(result, null, 2)}`
      })
    }

    // 继续下一轮，AI 可能会继续调用工具或生成回复
    onChunk(JSON.stringify({ type: "status", content: "等待进一步操作..." }))
  }

  return "已达到最大工具调用次数"
}

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

    // 获取数据库上下文
    const dbContext = await getDatabaseContext(session.user.teamId)

    // 构建系统提示
    const toolExamples = `
【必须严格遵循】工具调用格式 - 必须使用以下 JSON 格式：
查询客户: {"tool": "list_customers", "args": {"name": "客户名"}}
查询商机: {"tool": "list_opportunities", "args": {}}
查询合同: {"tool": "get_contract", "args": {"id": "合同ID"}}
创建客户: {"tool": "create_customer", "args": {"name": "公司名", "phone": "电话"}}
创建拜访: {"tool": "create_visit", "args": {"title": "拜访标题", "startTime": "2026-03-10T14:00:00", "endTime": "2026-03-10T15:00:00", "customerId": "客户ID", "type": "FOLLOW_UP"}}
创建合同: {"tool": "create_contract", "args": {"name": "合同名称", "amount": 100000, "customerId": "客户ID"}}
创建商机: {"tool": "create_opportunity", "args": {"name": "商机名称", "amount": 500000, "stage": "PROSPECTING", "customerId": "客户ID"}}

日期格式要求: 必须使用 ISO 格式如 2026-03-10T14:00:00
类型要求: visit type 用 FOLLOW_UP/MEETING/DEMO/OTHER, opportunity stage 用 PROSPECTING/QUALIFICATION/PROPOSAL/NEGOTIATION/WON/LOST
重要: 只输出 JSON，不要输出其他文字！`

    const systemPrompt = `你是CRM系统智能助手。你可以使用工具来查询和操作CRM数据。

${DATABASE_SCHEMA}

当前数据:
${dbContext}

## 可用工具:
${TOOLS_SCHEMA.map(t => `- ${t.name}: ${t.description}`).join('\n')}

${toolExamples}`

    const apiKey = process.env.MINIMAX_API_KEY
    const baseUrl = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/anthropic"

    if (!apiKey) {
      return NextResponse.json({ error: "MINIMAX_API_KEY is not configured" }, { status: 500 })
    }

    // 构建消息列表
    const messages = [
      { role: "system", content: [{ type: "text", text: systemPrompt }] },
      ...body.history.map(m => ({ role: m.role, content: [{ type: "text", text: m.content }] })),
      { role: "user", content: [{ type: "text", text: message }] }
    ]

    // 流式返回
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await processWithTools(apiKey, baseUrl, messages, (chunk) => {
            try {
              const data = JSON.parse(chunk)
              let chunkStr = ""

              if (data.type === "text") {
                chunkStr = `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: data.content } })}\n`
              } else if (data.type === "thinking") {
                chunkStr = `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "thinking_delta", thinking: data.content } })}\n`
              } else if (data.type === "status") {
                // 状态消息不发送给前端，只用于调试
                return
              }

              if (chunkStr) {
                controller.enqueue(encoder.encode(chunkStr))
              }
            } catch (e) {}
          })

          controller.enqueue(encoder.encode("data: [DONE]\n"))
          controller.close()
        } catch (error: any) {
          console.error("Stream error:", error)
          const errorStr = `data: ${JSON.stringify({ type: "error", error: error.message })}\n`
          controller.enqueue(encoder.encode(errorStr))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: error.message || "处理请求失败" }, { status: 500 })
  }
}
