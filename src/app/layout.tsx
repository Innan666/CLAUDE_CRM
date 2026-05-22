import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: "SalesFlow AI - 销售项目财务一体化管理系统",
  description: "B2B SaaS CRM系统",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="format-detection" content="telephone=no,email=no,address=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="referrer" content="always" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
