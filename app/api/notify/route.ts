import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    "mailto:your-email@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return new Response("Unauthorized.", { status: 401 });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return new Response("VAPID keys are not configured.", { status: 500 });
  }

  try {
    // 先获取所有 endpoint
    const endpoints = await kv.smembers("subscriptions_endpoints");
    const notificationPayload = await request.json();
    const payloadString = JSON.stringify(notificationPayload);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    const pushPromises = endpoints.map(async (endpoint: string) => {
      try {
        // 根据 endpoint 拿对应的 subscription 数据
        const subRaw = await kv.get<string>(`subscription:${endpoint}`);
        if (!subRaw) {
          // 订阅不存在了，移除 endpoint 记录
          await kv.srem("subscriptions_endpoints", endpoint);
          skipCount++;
          return;
        }

        const subscription = JSON.parse(subRaw);

        await webPush.sendNotification(subscription, payloadString);
        successCount++;
      } catch (error: any) {
        if (error.statusCode === 410) {
          // 订阅过期，删除对应数据
          console.log("Subscription expired, removing:", endpoint);
          await kv.del(`subscription:${endpoint}`);
          await kv.srem("subscriptions_endpoints", endpoint);
          failCount++;
        } else {
          console.error(`Failed to send to ${endpoint}:`, error.body || error);
          failCount++;
        }
      }
    });

    await Promise.all(pushPromises);

    return NextResponse.json({
      success: true,
      message: "Notifications processed.",
      total: endpoints.length,
      sent: successCount,
      failed: failCount,
      skipped: skipCount,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return new Response("Failed to send notifications.", { status: 500 });
  }
}
