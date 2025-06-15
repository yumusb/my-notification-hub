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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState("");
  const [isVerifyingKey, setIsVerifyingKey] = useState(true);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始加载时从 localStorage 获取密钥并验证
  useEffect(() => {
    const storedKey = localStorage.getItem("notification_api_key");
    if (storedKey) {
      verifyApiKey(storedKey);
    } else {
      setIsVerifyingKey(false);
    }
  }, []);

  // 验证 API 密钥是否有效
  const verifyApiKey = async (key: string) => {
    setIsVerifyingKey(true);
    setError(null);
    try {
      const res = await fetch("/api/vapid-public-key", {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });
      if (!res.ok) throw new Error("API 密钥无效。");
      setApiKey(key);
      localStorage.setItem("notification_api_key", key);
    } catch (err) {
      console.error("密钥验证失败:", err);
      setError(err instanceof Error ? err.message : "发生未知错误。");
      localStorage.removeItem("notification_api_key");
      setApiKey(null);
    } finally {
      setIsVerifyingKey(false);
    }
  };

  // 手动提交 API 密钥
  const handleKeySubmit = async () => {
    await verifyApiKey(inputKey.trim());
  };

  // 订阅状态检查（已通过密钥验证后才会执行）
  useEffect(() => {
    if (!apiKey) return;

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
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(subscription),
          });
          if (!res.ok) throw new Error("同步订阅到服务器失败。");
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
  }, [apiKey]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("你拒绝了通知授权，无法订阅。");

      const registration = await navigator.serviceWorker.ready;
      const vapidRes = await fetch("/api/vapid-public-key", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!vapidRes.ok) throw new Error("无法从服务器获取 VAPID 公钥。");

      const vapidPublicKey = await vapidRes.text();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscribeRes = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(subscription),
      });

      if (!subscribeRes.ok) throw new Error("向服务器保存订阅信息失败。");
      setIsSubscribed(true);
    } catch (err) {
      console.error("订阅过程中发生错误:", err);
      setError(err instanceof Error ? `订阅失败: ${err.message}` : "订阅过程中发生未知错误。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsUnsubscribing(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) throw new Error("当前没有订阅。");

      const unsubscribed = await subscription.unsubscribe();
      if (!unsubscribed) throw new Error("取消订阅失败。");

      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) throw new Error("通知服务器取消订阅失败。");

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
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          title: "来自网页的测试",
          body: "点击按钮发送成功！这是一个测试通知。",
          url: window.location.href,
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

  // API 密钥输入视图
  if (!apiKey && !isVerifyingKey) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h2 className="text-xl font-semibold mb-4">请输入你的 API 密钥(API_SECRET_KEY)</h2>
        <input
          type="password"
          placeholder="API 密钥"
          className="border p-2 rounded w-full mb-4"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
        />
        <button
          onClick={handleKeySubmit}
          className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          验证密钥
        </button>
        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>
    );
  }

  if (isVerifyingKey || isLoading) {
    return <div className="text-center text-gray-500">正在验证身份或加载订阅状态...</div>;
  }

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
              <button
                onClick={handleTestPush}
                disabled={isTesting}
                className="px-5 py-2 font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400"
              >
                {isTesting ? '发送中...' : '发送测试通知'}
              </button>

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
  -H "Authorization: Bearer ${apiKey}" \\
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
