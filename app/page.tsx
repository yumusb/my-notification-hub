import { NotificationManager } from "@/components/NotificationManager";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">我的通知中心</h1>
          <p className="mt-2 text-lg text-gray-600">
            在这里订阅通知，并通过 API 向你的浏览器推送任何消息。
          </p>
        </header>

        <NotificationManager />

        <footer className="text-center mt-12 text-sm text-gray-500">
          <p>Powered by Next.js on Vercel</p>
        </footer>
      </div>
    </main>
  );
}
