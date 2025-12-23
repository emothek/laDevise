---
description: Test Supabase Edge Functions Locally
---

# How to Test `fetch-rates` Locally

Follow these steps to run and test your Edge Function on your machine before deploying.

## 1. Prerequisites

### Option A: Local Testing (Requires Docker)
If you have Docker installed, you can run the function locally. The Supabase CLI uses Docker to run the Edge Runtime (Deno) on your machine.
If you **do not** want to use Docker, skip to **Option B: Remote Testing**.

### Option B: Remote Testing (No Docker required)
You can deploy the function directly to your Supabase project and test it there. This bypasses the need for a local Docker container.

## 2. Option A: Local Testing (with Docker)

Run the following command in your terminal to start the local function server.
```bash
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# or ANON_KEY if using client-side auth
```
*Note: For `fetch-rates` to insert into the database bypassing RLS, you usually need the `SERVICE_ROLE_KEY`.*

## 2. Server the Function

Run the following command in your terminal to start the local function server.
We use `--no-verify-jwt` to bypass auth verification for easier testing, and `--env-file .env` to load your environment variables.

```bash
npx supabase functions serve fetch-rates --no-verify-jwt --env-file .env
```

You should see output indicating the function is running, typically at:
`http://localhost:54321/functions/v1/fetch-rates`

## 3. Invoke the Function

Open a **new terminal window** (keep the previous one running) and use `curl` to trigger the function:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/fetch-rates'
```

## 4. Check Logs

Go back to the terminal where you ran `supabase functions serve`. You will see the `console.log` outputs from your function (e.g., "Starting official rates scrape...", "Found table element...", etc.).

If you are connecting to your remote project (via the URL in `.env`), check your table in the Supabase Dashboard to see if new rows were added.

## 6. Option B: Remote Testing (No Docker)

If you cannot run Docker locally, follow these steps to deploy and test remotely.

### 1. Login to Supabase CLI
```bash
npx supabase login
```

### 2. Deploy the Function
```bash
npx supabase functions deploy fetch-rates --no-verify-jwt
```
*Note: This pushes the code to your live Supabase project.*

### 3. Set Environment Variables (Secrets)
Your remote function needs the secrets (like `SUPABASE_URL` and `SERVICE_ROLE_KEY` is auto-injected but usually good to double check or if you use other API keys).
For this function, standard Supabase keys are auto-injected, but if you added custom env vars:
```bash
npx supabase secrets set MY_SECRET=value
```

### 4. Invoke the Remote Function
You can trigger it from your terminal:
```bash
# Get your project Reference ID (e.g., 'abcdefgh') from your Supabase URL
# URL format: https://<PROJECT_REF>.supabase.co/functions/v1/fetch-rates

curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-rates' \
  --header 'Authorization: Bearer YOUR_ANON_KEY_FROM_ENV_FILE'
```

### 5. Check Remote Logs
You can see the logs from the real server:
```bash
npx supabase functions logs --app fetch-rates
```
