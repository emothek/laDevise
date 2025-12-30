import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

console.log("Deletion Request Notification Function initialized");

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'mokhtar.developer@gmail.com'; // Default fallback

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

interface DeletionRequest {
    id: string;
    email: string;
    user_id: string | null;
    reason: string | null;
    created_at: string;
}

serve(async (req) => {
    try {
        console.log("Function invoked");

        // Parse the webhook payload from Supabase
        const payload = await req.json();
        console.log("Received payload:", JSON.stringify(payload, null, 2));

        // Extract the deletion request data
        const deletionRequest: DeletionRequest = payload.record || payload;

        if (!deletionRequest.email) {
            throw new Error("No email found in deletion request");
        }

        console.log(`Processing deletion request for: ${deletionRequest.email}`);

        // Format the email content
        const emailSubject = `🔴 Account Deletion Request - ${deletionRequest.email}`;
        const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 12px 12px;
        }
        .info-row {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #6366f1;
        }
        .label {
            font-weight: 600;
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .value {
            color: #1f2937;
            font-size: 16px;
            margin-top: 5px;
        }
        .action-button {
            display: inline-block;
            background: #6366f1;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 20px;
            font-weight: 600;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0;">🔴 Account Deletion Request</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">A user has requested to delete their account</p>
    </div>
    
    <div class="content">
        <div class="info-row">
            <div class="label">Email Address</div>
            <div class="value">${deletionRequest.email}</div>
        </div>
        
        ${deletionRequest.user_id ? `
        <div class="info-row">
            <div class="label">User ID</div>
            <div class="value">${deletionRequest.user_id}</div>
        </div>
        ` : ''}
        
        ${deletionRequest.reason ? `
        <div class="info-row">
            <div class="label">Reason for Deletion</div>
            <div class="value">${deletionRequest.reason}</div>
        </div>
        ` : ''}
        
        <div class="info-row">
            <div class="label">Request Date</div>
            <div class="value">${new Date(deletionRequest.created_at).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short'
        })}</div>
        </div>
        
        <div class="info-row">
            <div class="label">Request ID</div>
            <div class="value">${deletionRequest.id}</div>
        </div>
        
        <div style="text-align: center;">
            <a href="https://supabase.com/dashboard/project/jfhalmsenxfffaakehjq/editor" class="action-button">
                View in Supabase Dashboard
            </a>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Next Steps:</strong></p>
        <p>1. Verify the user's identity<br>
        2. Delete all associated data from the database<br>
        3. Send confirmation email to the user<br>
        4. Update the request status to 'completed'</p>
    </div>
</body>
</html>
        `.trim();

        // Send email using Supabase's built-in email service
        // Note: This uses Supabase Auth's email templates
        // For production, you might want to use a dedicated email service like Resend

        // Send email notification
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        if (RESEND_API_KEY) {
            console.log("Attempting to send email via Resend...");
            const resendResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'La Devise <mokhtar@gleetsy.com>', // You can customize this once you verify your domain
                    to: [ADMIN_EMAIL],
                    subject: emailSubject,
                    html: emailBody
                })
            });

            if (!resendResponse.ok) {
                const errorText = await resendResponse.text();
                console.error(`Resend API error: ${errorText}`);
                throw new Error(`Failed to send email: ${errorText}`);
            }

            console.log(`✅ Email sent successfully to ${ADMIN_EMAIL}`);
        } else {
            console.warn("⚠️ RESEND_API_KEY not found. Email not sent.");
            console.log("=== EMAIL CONTENT (LOGGED ONLY) ===");
            console.log("To:", ADMIN_EMAIL);
            console.log("Subject:", emailSubject);
            console.log("====================================");
            // We don't log the full body here to keep logs readable, 
            // but you can see it in previous versions or by logging emailBody
        }

        return new Response(JSON.stringify({
            success: true,
            message: RESEND_API_KEY ? "Notification sent via email" : "Notification logged (Resend key missing)",
            request_id: deletionRequest.id,
            email: deletionRequest.email
        }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        });

    } catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
