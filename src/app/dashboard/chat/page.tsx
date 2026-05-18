"use client"

import { useState, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Send, Loader2, User, MessageCircle, Copy, Check, RotateCcw } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// 过滤工具调用标记
function cleanToolCalls(text: string): string {
  return text
    .replace(/<invoke\s+name="[^"]*">\s*<\/invoke>/g, '')
    .replace(/<invoke\s+name="[^"]*">[\s\S]*?<\/invoke>/g, '')
    .replace(/<tool_code>[\s\S]*?<\/tool_code>/g, '')
    .replace(/\[TOOL_CALL\]\s*\{[\s\S]*?\}\s*\[\/TOOL_CALL\]/g, '')
    .replace(/minimax:tool_call\s*\{[\s\S]*?\}\s*/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim()
}

// 简化的 chat hook - 使用原生 fetch
function useChatStream(api: string) {
  const [messages, setMessages] = useState<{ id: string; role: "user" | "assistant"; content: string; reasoning?: string; status?: string }[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage = { id: `user-${Date.now()}`, role: "user" as const, content: message }
    const assistantMessage = { id: `assistant-${Date.now()}`, role: "assistant" as const, content: "", reasoning: "" }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInput("")
    setIsLoading(true)

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: messages
            .filter(m => m.role === "user" || (m.role === "assistant" && m.content))
            .map(m => ({ role: m.role, content: m.content }))
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `请求失败 (${response.status})`)
      }

      if (!response.body) {
        throw new Error("No response body")
      }

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
          if (!trimmed || !trimmed.startsWith("data:")) continue

          const dataStr = trimmed.slice(5).trim()
          if (!dataStr || dataStr === "[DONE]") continue

          try {
            const data = JSON.parse(dataStr)

            // MiniMax 流式响应格式
            if (data.type === "content_block_delta") {
              const delta = data.delta
              if (delta?.type === "text_delta") {
                fullText += delta.text || ""
                setMessages(prev => prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, content: fullText }
                    : m
                ))
              } else if (delta?.type === "thinking_delta") {
                fullReasoning += delta.thinking || delta.text || ""
                setMessages(prev => prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, reasoning: fullReasoning }
                    : m
                ))
              }
            } else if (data.type === "status") {
              // 状态消息，更新助手消息状态
              setMessages(prev => prev.map(m =>
                m.id === assistantMessage.id
                  ? { ...m, status: data.content }
                  : m
              ))
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantMessage.id
            ? { ...m, content: error.message || "抱歉，发生了错误" }
            : m
        ))
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [api, messages, isLoading])

  const reload = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")
    if (lastUserMessage) {
      // 删除最后一条助手消息（保留用户消息）
      setMessages(prev => {
        const lastIndex = prev.findIndex(m => m.id === lastUserMessage.id)
        return prev.slice(0, lastIndex + 1)
      })
      sendMessage(lastUserMessage.content)
    }
  }, [messages, sendMessage])

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }, [])

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    reload,
    stop
  }
}

export default function ChatPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({})

  const { messages, input, setInput, sendMessage, isLoading, reload, stop } = useChatStream("/api/chat")

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input)
  }, [input, sendMessage, isLoading])

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const quickQuestions = [
    "查看所有合同",
    "查看所有客户",
    "查看所有商机",
    "查看付款情况",
    "数据统计"
  ]

  // 添加欢迎消息
  const allMessages = messages.length === 0 ? [
    { id: "welcome", role: "assistant" as const, content: "您好！我是您的智能CRM助手。我可以帮助您查询：\n\n• 合同信息（查看合同、付款情况）\n• 客户信息\n• 商机状态\n• 项目进度\n• 发票记录\n• 数据统计\n\n请直接告诉我您想查询什么，例如：\n「查看所有合同」或「马丁的合同付款多少了」" }
  ] : messages

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      <Card className="flex flex-col h-full border-0 shadow-none bg-background">
        <CardHeader className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">AI 助手</CardTitle>
                <p className="text-sm text-muted-foreground">智能查询 CRM 数据</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                在线
              </span>
            </div>
          </div>
        </CardHeader>

        <div className="flex-shrink-0 px-6 py-3 border-b bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">快捷问题：</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs h-7 hover:bg-primary/10"
                onClick={() => sendMessage(q)}
                disabled={isLoading}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>

        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-y-auto px-6 py-4 space-y-6">
            {allMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 ${message.role === "user" ? "order-2" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user" ? "bg-primary" : "bg-primary/10"
                  }`}>
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={`flex-1 max-w-[85%] ${message.role === "user" ? "order-1" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {message.role === "user" ? "你" : "AI 助手"}
                    </span>
                  </div>

                  <div className={`rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    {/* Reasoning (思考过程) */}
                    {message.role === "assistant" && message.reasoning && (
                      <div className="mb-3 border-l-2 border-yellow-500 pl-3">
                        <button
                          onClick={() => setExpandedReasoning(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                          className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 hover:underline mb-1"
                        >
                          <span>{expandedReasoning[message.id] ? "▼" : "▶"}</span>
                          <span>思考过程</span>
                        </button>
                        {expandedReasoning[message.id] && (
                          <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap font-mono bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded">
                            {message.reasoning}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      {message.role === "assistant" && (
                        <MessageCircle className="w-4 h-4 mt-1 flex-shrink-0 text-primary" />
                      )}
                      {message.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      ) : (
                        <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                          {message.content ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {cleanToolCalls(message.content)}
                            </ReactMarkdown>
                          ) : isLoading && message.id === allMessages[allMessages.length - 1]?.id ? (
                            <span className="text-muted-foreground">正在思考...
                              <span className="inline-flex ml-1">
                                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1 h-1 bg-current rounded-full animate-bounce mx-0.5" style={{ animationDelay: "150ms" }} />
                                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                              </span>
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Message Actions */}
                    {message.role === "assistant" && message.content && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-current/10">
                        <button
                          onClick={() => copyMessage(message.content, message.id)}
                          className="p-1.5 rounded hover:bg-current/10 text-current/60"
                          title="复制"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => reload()}
                          className="p-1.5 rounded hover:bg-current/10 text-current/60"
                          title="重新生成"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        <div className="flex-shrink-0 p-4 border-t bg-background">
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="输入您的问题..."
                disabled={isLoading}
                rows={1}
                className="w-full bg-background border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none min-h-[44px] max-h-32"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-11 w-11 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI 可能会产生错误信息，请核实重要内容
          </p>
        </div>
      </Card>
    </div>
  )
}
