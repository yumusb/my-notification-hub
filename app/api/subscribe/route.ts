import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    if (!subscription || !subscription.endpoint) {
      return new Response("Invalid subscription object", { status: 400 });
    }

    const endpoint = subscription.endpoint;

    // 存储订阅数据，key 用 endpoint，覆盖已有
    await kv.set(`subscription:${endpoint}`, JSON.stringify(subscription));

    // 维护一个 Set 记录所有 endpoint，方便管理
    await kv.sadd("subscriptions_endpoints", endpoint);

    console.log("Subscription saved:", endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return new Response("Failed to save subscription.", { status: 500 });
  }
}
