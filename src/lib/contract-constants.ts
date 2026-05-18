export const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PENDING: "bg-yellow-500",
  SIGNED: "bg-blue-500",
  ACTIVE: "bg-green-500",
  COMPLETED: "bg-purple-500",
  CANCELLED: "bg-red-500"
}

export const statusNames: Record<string, string> = {
  DRAFT: "草稿",
  PENDING: "待签署",
  SIGNED: "已签署",
  ACTIVE: "执行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
}

export const typeColors: Record<string, string> = {
  SALES: "bg-blue-500",
  OUTSOURCING: "bg-orange-500"
}

export const typeNames: Record<string, string> = {
  SALES: "销售合同",
  OUTSOURCING: "委外合同"
}
