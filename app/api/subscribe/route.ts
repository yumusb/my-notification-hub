import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    if (!subscription || !subscription.endpoint) {
        return new Response('Invalid subscription object', { status: 400 });
    }
    
    await kv.sadd("subscriptions", JSON.stringify(subscription));
    console.log("Subscription saved:", subscription.endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return new Response("Failed to save subscription.", { status: 500 });
  }
}
