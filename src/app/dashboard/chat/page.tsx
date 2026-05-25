"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  Bot, Send, Square, Trash2, Copy, Check, RotateCcw,
  ChevronDown, ChevronRight, Sparkles,
  CheckCircle2, XCircle, Loader2, Wrench,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type ToolStatus = "running" | "success" | "error"

interface ToolExecution {
  name: string
  status: ToolStatus
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  reasoning?: string
  toolExecutions?: ToolExecution[]
  isStreaming?: boolean
}

// ─────────────────────────────────────────────────────────────────
// Tool name → display label
// ─────────────────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  list_customers: "查询客户列表",
  get_customer: "获取客户详情",
  create_customer: "创建客户",
  list_opportunities: "查询商机",
  get_opportunity: "获取商机详情",
  create_opportunity: "创建商机",
  list_contracts: "查询合同列表",
  get_contract: "获取合同详情",
  create_contract: "创建合同",
  list_invoices: "查询发票",
  create_invoice: "创建发票",
  list_payments: "查询付款记录",
  create_payment: "创建付款记录",
  list_projects: "查询项目列表",
  list_visits: "查询拜访记录",
  create_visit: "创建拜访",
  complete_visit: "完成拜访",
  get_statistics: "获取数据统计",
}

// ─────────────────────────────────────────────────────────────────
// Suggested prompts (empty state)
// ─────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { label: "查看所有客户", icon: "👥" },
  { label: "本月合同情况", icon: "📄" },
  { label: "当前商机状态", icon: "🎯" },
  { label: "逾期付款情况", icon: "⚠️" },
  { label: "进行中的项目", icon: "📋" },
  { label: "今日拜访安排", icon: "📅" },
]

// ─────────────────────────────────────────────────────────────────
// useChatStream hook
// ─────────────────────────────────────────────────────────────────
function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const updateMessage = useCallback((id: string, updater: (m: ChatMessage) => ChatMessage) => {
    setMessages(prev => prev.map(m => m.id === id ? updater(m) : m))
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text }
    const aiId = `a-${Date.now()}`
    const aiMsg: ChatMessage = {
      id: aiId,
      role: "assistant",
      content: "",
      reasoning: "",
      toolExecutions: [],
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMsg, aiMsg])
    setInput("")
    setIsLoading(true)

    abortRef.current = new AbortController()

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages
            .filter(m => m.content)
            .map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "请求失败")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data:")) continue
          const raw = trimmed.slice(5).trim()
          if (!raw || raw === "[DONE]") continue

          try {
            const data = JSON.parse(raw)

            if (data.type === "content_block_delta") {
              const delta = data.delta
              if (delta?.type === "text_delta" && delta.text) {
                updateMessage(aiId, m => ({ ...m, content: m.content + delta.text }))
              } else if (delta?.type === "thinking_delta" && delta.thinking) {
                updateMessage(aiId, m => ({ ...m, reasoning: (m.reasoning || "") + delta.thinking }))
              }
            } else if (data.type === "tool_call") {
              updateMessage(aiId, m => ({
                ...m,
                toolExecutions: [...(m.toolExecutions || []), { name: data.tool, status: "running" }],
              }))
            } else if (data.type === "tool_result") {
              updateMessage(aiId, m => ({
                ...m,
                toolExecutions: (m.toolExecutions || []).map(t =>
                  t.name === data.tool ? { ...t, status: data.success ? "success" : "error" } : t
                ),
              }))
            } else if (data.type === "error") {
              updateMessage(aiId, m => ({ ...m, content: data.error || "发生错误" }))
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        updateMessage(aiId, m => ({
          ...m,
          content: m.content || (err.message || "抱歉，发生了错误，请重试"),
        }))
      }
    } finally {
      updateMessage(aiId, m => ({ ...m, isStreaming: false }))
      setIsLoading(false)
      abortRef.current = null
    }
  }, [messages, isLoading, updateMessage])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setIsLoading(false)
    setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
  }, [])

  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.role === "user")
    if (!lastUser || isLoading) return
    setMessages(prev => {
      const idx = prev.map(m => m.id).lastIndexOf(prev.filter(m => m.role === "assistant").at(-1)?.id ?? "")
      return idx >= 0 ? prev.slice(0, idx) : prev
    })
    sendMessage(lastUser.content)
  }, [messages, isLoading, sendMessage])

  const clearMessages = useCallback(() => {
    setMessages([])
    setInput("")
  }, [])

  return { messages, input, setInput, sendMessage, isLoading, stop, regenerate, clearMessages }
}

// ─────────────────────────────────────────────────────────────────
// ToolChips component
// ─────────────────────────────────────────────────────────────────
function ToolChips({ executions }: { executions: ToolExecution[] }) {
  if (executions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {executions.map((t, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all",
            t.status === "running" && "bg-indigo-50 border-indigo-200 text-indigo-600",
            t.status === "success" && "bg-emerald-50 border-emerald-200 text-emerald-700",
            t.status === "error" && "bg-red-50 border-red-200 text-red-600"
          )}
        >
          {t.status === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
          {t.status === "success" && <CheckCircle2 className="w-3 h-3" />}
          {t.status === "error" && <XCircle className="w-3 h-3" />}
          {TOOL_LABELS[t.name] ?? t.name}
        </span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// ThinkingBlock component
// ─────────────────────────────────────────────────────────────────
function ThinkingBlock({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false)
  if (!reasoning.trim()) return null
  return (
    <div className="mb-3 rounded-lg border border-amber-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
        <span className="text-xs font-medium text-amber-700">查看思考过程</span>
      </button>
      {open && (
        <div className="px-3 py-2.5 bg-amber-50/50 border-t border-amber-200">
          <p className="text-xs text-amber-800 whitespace-pre-wrap font-mono leading-relaxed">{reasoning}</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MessageBubble component
// ─────────────────────────────────────────────────────────────────
function MessageBubble({ message, onCopy, copied, onRegenerate, isLast, isLoading }: {
  message: ChatMessage
  onCopy: () => void
  copied: boolean
  onRegenerate: () => void
  isLast: boolean
  isLoading: boolean
}) {
  const isUser = message.role === "user"
  const hasTools = (message.toolExecutions?.length ?? 0) > 0
  const isThinking = message.isStreaming && !message.content && !hasTools

  return (
    <div className={cn("flex gap-3 group", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-[11px] font-bold">你</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col max-w-[80%] min-w-0", isUser && "items-end")}>
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm shadow-sm shadow-indigo-200"
              : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              {/* Tool execution chips */}
              {hasTools && <ToolChips executions={message.toolExecutions!} />}

              {/* Thinking */}
              {message.reasoning && <ThinkingBlock reasoning={message.reasoning} />}

              {/* Main content */}
              {message.content ? (
                <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.8em] prose-code:font-normal">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre: ({ children }) => (
                        <pre className="overflow-x-auto text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 my-2">
                          {children}
                        </pre>
                      ),
                      code: ({ inline, children, ...props }: any) =>
                        inline ? (
                          <code className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[0.8em]" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className="text-xs font-mono" {...props}>{children}</code>
                        ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="min-w-full border-collapse text-xs">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-gray-200 bg-gray-50 px-3 py-1.5 text-left font-semibold text-gray-700">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-gray-200 px-3 py-1.5 text-gray-700">{children}</td>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : isThinking ? (
                <div className="flex items-center gap-2 text-gray-400 py-0.5">
                  <span className="text-sm">思考中</span>
                  <span className="flex gap-0.5">
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                </div>
              ) : hasTools && message.isStreaming ? (
                <div className="flex items-center gap-2 text-gray-400 py-0.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-sm">处理中...</span>
                </div>
              ) : null}

              {/* Streaming cursor */}
              {message.isStreaming && message.content && (
                <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse align-middle" />
              )}
            </>
          )}
        </div>

        {/* Actions (show on hover for AI messages) */}
        {!isUser && message.content && !message.isStreaming && (
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? "已复制" : "复制"}
            </button>
            {isLast && !isLoading && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                重新生成
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────
function EmptyState({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-8 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-200 mb-5">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-1.5">AI 智能助手</h2>
      <p className="text-sm text-gray-500 text-center mb-8 max-w-xs leading-relaxed">
        我可以帮您查询客户、合同、商机、项目等 CRM 数据，也可以帮您创建记录。
      </p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => onSend(s.label)}
            className="flex items-center gap-2.5 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all text-left shadow-sm hover:shadow-md"
          >
            <span className="text-base leading-none">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main ChatPage
// ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { messages, input, setInput, sendMessage, isLoading, stop, regenerate, clearMessages } = useChatStream()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea
  const adjustHeight = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    adjustHeight()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const lastAiIndex = [...messages].map((m, i) => ({ m, i })).filter(({ m }) => m.role === "assistant").at(-1)?.i ?? -1

  return (
    <div className="flex flex-col -m-4 md:-m-6 h-[calc(100vh-4rem)]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 leading-none">AI 助手</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-gray-400">在线</span>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空对话
          </button>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/60">
        {messages.length === 0 ? (
          <EmptyState onSend={sendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onCopy={() => handleCopy(msg.content, msg.id)}
                copied={copiedId === msg.id}
                onRegenerate={regenerate}
                isLast={idx === lastAiIndex}
                isLoading={isLoading}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input area ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className={cn(
            "flex items-end gap-2 bg-white border rounded-2xl px-4 py-3 transition-all shadow-sm",
            "focus-within:border-indigo-300 focus-within:shadow-indigo-100 focus-within:shadow-md"
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="发送消息…  Shift+Enter 换行"
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none min-h-[24px] max-h-40 leading-relaxed disabled:opacity-60"
            />
            <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
              {isLoading ? (
                <button
                  onClick={stop}
                  className="w-8 h-8 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-sm"
                  title="停止生成"
                >
                  <Square className="w-3.5 h-3.5 text-white fill-white" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm",
                    input.trim()
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed"
                  )}
                  title="发送 (Enter)"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2">
            AI 可能产生错误，请核实重要信息
          </p>
        </div>
      </div>
    </div>
  )
}
