import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";

// 设置 VAPID 只需一次
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    "mailto:your-email@example.com", // 替换成你的邮箱
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  // 身份校验
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

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    const pushPromises = allSubscriptionStrings.map(async subStr => {
      let subscription;

      if (typeof subStr === "string") {
        try {
          subscription = JSON.parse(subStr);
        } catch (e) {
          console.error("Skipping invalid JSON subscription:", subStr);
          skipCount++;
          return;
        }
      } else if (typeof subStr === "object" && subStr.endpoint) {
        subscription = subStr;
      } else {
        console.error("Skipping unrecognized subscription format:", subStr);
        skipCount++;
        return;
      }

      try {
        await webPush.sendNotification(subscription, payloadString);
        successCount++;
      } catch (error: any) {
        if (error.statusCode === 410) {
          console.log("Subscription expired, removing:", subscription.endpoint);
          await kv.srem("subscriptions", JSON.stringify(subscription));
        } else {
          console.error(`Failed to send to ${subscription.endpoint}:`, error.body);
        }
        failCount++;
      }
    });

    await Promise.all(pushPromises);

    return NextResponse.json({
      success: true,
      message: "Notifications processed.",
      total: allSubscriptionStrings.length,
      sent: successCount,
      failed: failCount,
      skipped: skipCount
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return new Response("Failed to send notifications.", { status: 500 });
  }
}
