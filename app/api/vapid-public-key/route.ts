export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return new Response("VAPID public key not configured.", { status: 500 });
  }

  return new Response(publicKey, { status: 200 });
}