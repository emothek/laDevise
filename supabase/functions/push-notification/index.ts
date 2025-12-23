import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Hello from Push Notification Function!");

serve(async (req) => {
  const { record } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // 1. Fetch tokens that have this currency in their favorites
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('token')
    .contains('favorite_currencies', [record.currency]);

  if (error) {
    console.error("Error fetching subscriptions:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log(`No subscriptions found for currency ${record.currency}`);
    return new Response(JSON.stringify({ message: "No subscribers" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokens = subscriptions.map(s => s.token);

  // 2. Prepare notifications (Expo handles 100 max per batch, but let's do simple loop or basic batching)
  // For large scale, splice tokens into chunks of 100.

  // Only send valid expo tokens
  const validTokens = tokens.filter(t => t.startsWith("ExponentPushToken"));

  const messages = validTokens.map(token => ({
    to: token,
    sound: "default",
    title: "Exchange Rate Update",
    body: `1 ${record.currency} = ${record.sell_price} DZD (${record.type === 'OFFICIAL' ? 'Official' : 'Parallel'})`,
    data: { currency: record.currency },
  }));

  if (messages.length === 0) {
    return new Response(JSON.stringify({ message: "No valid tokens" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Send to Expo
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error("Error sending push notifications:", err);
  }

  return new Response(JSON.stringify({ message: `Sent ${messages.length} notifications` }), {
    headers: { "Content-Type": "application/json" },
  });
});
