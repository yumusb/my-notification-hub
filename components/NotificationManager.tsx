"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  // 新增状态，取消订阅按钮加载状态
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          throw new Error("此浏览器不支持推送通知功能。");
        }
        await navigator.serviceWorker.register("/sw.js");
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          const res = await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription),
          });
          if (!res.ok) {
            throw new Error("同步订阅到服务器失败。");
          }
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
      } catch (err) {
        console.error("检查订阅状态时发生错误:", err);
        setError(err instanceof Error ? `错误: ${err.message}` : "发生未知错误。");
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("你拒绝了通知授权，无法订阅。");
      }
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKeyRes = await fetch('/api/vapid-public-key');
      if (!vapidPublicKeyRes.ok) {
        throw new Error('无法从服务器获取 VAPID 公钥。');
      }
      const vapidPublicKey = await vapidPublicKeyRes.text();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const subscribeRes = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!subscribeRes.ok) {
        throw new Error("向服务器保存订阅信息失败。");
      }
      setIsSubscribed(true);
    } catch (err) {
      console.error("订阅过程中发生错误:", err);
      setError(err instanceof Error ? `订阅失败: ${err.message}` : "订阅过程中发生未知错误。");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 新增取消订阅函数 ---
  const handleUnsubscribe = async () => {
    setIsUnsubscribing(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        throw new Error("当前没有订阅。");
      }
      // 取消订阅
      const unsubscribed = await subscription.unsubscribe();
      if (!unsubscribed) {
        throw new Error("取消订阅失败。");
      }
      // 通知后端取消订阅
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!res.ok) {
        throw new Error("通知服务器取消订阅失败。");
      }
      setIsSubscribed(false);
      alert("取消订阅成功。");
    } catch (err) {
      console.error("取消订阅失败:", err);
      setError(err instanceof Error ? `取消订阅失败: ${err.message}` : "取消订阅过程中发生未知错误。");
    } finally {
      setIsUnsubscribing(false);
    }
  };

  const handleTestPush = async () => {
    setIsTesting(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_KEY}`
        },
        body: JSON.stringify({
          title: "来自网页的测试",
          body: "点击按钮发送成功！这是一个测试通知。",
          url: window.location.href
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "发送测试通知失败。");
      }

      alert("测试通知已发送！请在几秒钟内查看你的桌面。");

    } catch (err) {
      console.error("测试推送失败:", err);
      alert(err instanceof Error ? err.message : "发生未知错误");
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">正在检查订阅状态...</div>;
  }

  // 动态获取当前域名，替换 curl 里的 <你的Vercel域名>
  const currentHost = typeof window !== "undefined" ? window.location.host : "<你的Vercel域名>";

  return (
    <div className="p-8 bg-white rounded-lg shadow-md">
      {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

      {!isSubscribed ? (
        <div className="text-center">
          <p className="mb-4 text-gray-700">你尚未订阅通知。点击下方按钮以开启。</p>
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400"
          >
            {isLoading ? '处理中...' : '订阅通知'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-green-600">🎉 订阅成功！</h2>
            <p className="mt-2 text-gray-600">你已准备好接收推送通知。</p>

            <div className="mt-6 space-x-4">
              {/* 测试按钮 */}
              <button
                onClick={handleTestPush}
                disabled={isTesting}
                className="px-5 py-2 font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400"
              >
                {isTesting ? '发送中...' : '发送测试通知'}
              </button>

              {/* 新增取消订阅按钮 */}
              <button
                onClick={handleUnsubscribe}
                disabled={isUnsubscribing}
                className="px-5 py-2 font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400"
              >
                {isUnsubscribing ? '取消中...' : '取消订阅'}
              </button>
            </div>

          </div>
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-2">你的 API 信息</h3>
            <p className="text-sm text-gray-600 mb-4">
              请使用以下命令通过 API 发送通知。注意保管好你的 API 密钥！
            </p>
            <pre className="p-4 bg-gray-900 text-white rounded-md overflow-x-auto text-sm">
              <code>
                {`curl -X POST \\
  https://${currentHost}/api/notify \\
  -H "Authorization: Bearer ${process.env.NEXT_PUBLIC_API_SECRET_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
        "title": "测试标题",
        "body": "这是消息内容。",
        "url": "https://vercel.com"
      }'`}
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
