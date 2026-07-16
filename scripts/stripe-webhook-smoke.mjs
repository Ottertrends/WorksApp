import crypto from "node:crypto";
import fs from "node:fs";

const envFile = process.argv[3] ?? ".env.local";

const env = Object.fromEntries(
  fs
    .readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      const key = line.slice(0, index);
      const value = line.slice(index + 1).replace(/^['"]|['"]$/g, "");
      return [key, value];
    }),
);

const baseUrl = (process.argv[2] ?? "https://www.worksapp.co").replace(/\/$/, "");
const matrixMode = process.argv.includes("--matrix");

async function postSigned(name, path, secretName, event) {
  const secret = env[secretName];
  if (!secret) {
    console.log(`${name}: missing ${secretName}`);
    return;
  }

  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body,
  });

  const text = await response.text();
  console.log(`${name}: ${response.status} ${text}`);
}

const now = Date.now();

await postSigned("billing webhook", "/api/billing/webhook", "STRIPE_WEBHOOK_SECRET", {
  id: `evt_smoke_billing_${now}`,
  object: "event",
  type: "account.updated",
  data: {
    object: {
      id: "acct_smoke_noop",
      object: "account",
      charges_enabled: false,
      details_submitted: false,
      metadata: {},
    },
  },
});

await postSigned("connect snapshot", "/api/webhooks/stripe-connect-snapshot", "STRIPE_CONNECT_SNAPSHOT_SECRET", {
  id: `evt_smoke_snapshot_${now}`,
  object: "event",
  type: "invoice.paid",
  data: {
    object: {
      id: "in_smoke_noop",
      object: "invoice",
      metadata: {},
    },
  },
});

await postSigned("connect thin", "/api/webhooks/stripe-connect-thin", "STRIPE_CONNECT_THIN_SECRET", {
  id: `evt_smoke_thin_${now}`,
  object: "event",
  type: "account.updated",
  data: {
    object: {
      id: "acct_smoke_noop",
      object: "account",
      charges_enabled: false,
      details_submitted: false,
    },
  },
});

await postSigned("subscriptions", "/api/webhooks/stripe-subscriptions", "STRIPE_SUBSCRIPTIONS_WEBHOOK_SECRET", {
  id: `evt_smoke_subs_${now}`,
  object: "event",
  type: "customer.subscription.updated",
  account: "acct_smoke_noop",
  data: {
    object: {
      id: "sub_smoke_noop",
      object: "subscription",
      status: "active",
      current_period_end: Math.floor(Date.now() / 1000) + 86400,
      trial_end: null,
    },
  },
});

if (matrixMode) {
  const routes = [
    ["billing", "/api/billing/webhook"],
    ["snapshot", "/api/webhooks/stripe-connect-snapshot"],
    ["thin", "/api/webhooks/stripe-connect-thin"],
    ["subscriptions", "/api/webhooks/stripe-subscriptions"],
  ];
  const secrets = [
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_CONNECT_SNAPSHOT_SECRET",
    "STRIPE_CONNECT_THIN_SECRET",
    "STRIPE_SUBSCRIPTIONS_WEBHOOK_SECRET",
  ];

  for (const [routeName, path] of routes) {
    for (const secretName of secrets) {
      await postSigned(`matrix ${routeName} with ${secretName}`, path, secretName, {
        id: `evt_matrix_${routeName}_${secretName}_${Date.now()}`,
        object: "event",
        type: "price.created",
        data: { object: { id: "price_smoke_noop", object: "price" } },
      });
    }
  }
}
