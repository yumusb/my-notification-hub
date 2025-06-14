import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";

// 在函数外部配置，只需一次
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    "mailto:your-email@example.com", // 替换成你的邮箱
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  // 1. 验证身份
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return new Response("Unauthorized.", { status: 401 });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return new Response("VAPID keys are not configured.", { status: 500 });
  }

  try {
    const allSubscriptionStrings = await kv.smembers("subscriptions");
    const notificationPayload = await request.json();
    const payloadString = JSON.stringify(notificationPayload);

    const pushPromises = allSubscriptionStrings.map(subStr => {
      try {
        // 在这里进行保护性解析
        const subscription = JSON.parse(subStr);
        return webPush
          .sendNotification(subscription, payloadString)
          .catch(async (error) => {
            if (error.statusCode === 410) {
              console.log("Subscription expired, removing:", subscription.endpoint);
              await kv.srem("subscriptions", subStr);
            } else {
              console.error(`Failed to send to ${subscription.endpoint}:`, error.body);
            }
          });
      } catch (e) {
        console.error("Skipping invalid subscription data from DB:", subStr);
        // 如果解析失败，就跳过这条损坏的数据
        return Promise.resolve();
      }
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true, message: "Notifications sent successfully." });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return new Response("Failed to send notifications.", { status: 500 });
  }
}
