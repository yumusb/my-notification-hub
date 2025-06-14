import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "我的通知中心",
  description: "一个自部署的 Web Push 通知系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-800">{children}</body>
    </html>
  );
}
