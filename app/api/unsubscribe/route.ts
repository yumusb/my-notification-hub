import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const subscription = await request.json();
    if (!subscription || !subscription.endpoint) {
      return new Response("Invalid subscription object", { status: 400 });
    }

    const endpoint = subscription.endpoint;

    // 删除对应的订阅数据
    await kv.del(`subscription:${endpoint}`);

    // 从 Set 中移除 endpoint
    await kv.srem("subscriptions_endpoints", endpoint);

    console.log("Subscription removed:", endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing subscription:", error);
    return new Response("Failed to remove subscription.", { status: 500 });
  }
}
