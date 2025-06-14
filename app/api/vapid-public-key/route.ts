export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return new Response("VAPID public key not configured.", { status: 500 });
  }

  return new Response(publicKey);
}
