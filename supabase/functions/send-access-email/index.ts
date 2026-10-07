import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "sahilkhude11@gmail.com";

async function sendSesEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const region = Deno.env.get("AWS_EMAIL_REGION") || "ap-south-1";
  const accessKeyId = Deno.env.get("AWS_EMAIL_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_EMAIL_SECRET_ACCESS_KEY");
  const source = Deno.env.get("AWS_EMAIL_FROM") || "auth@offensiq.ai";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS SES credentials are not configured in edge function environment.");
  }

  const ses = new AwsClient({
    region,
    accessKeyId,
    secretAccessKey,
  });

  const params = new URLSearchParams({
    Action: "SendEmail",
    Source: source,
    "Destination.ToAddresses.member.1": to,
    "Message.Subject.Data": subject,
    "Message.Subject.Charset": "UTF-8",
    "Message.Body.Html.Charset": "UTF-8",
    "Message.Body.Html.Data": html,
  });

  const response = await ses.fetch(`https://email.${region}.amazonaws.com`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AWS SES send error (${response.status}): ${errorText}`);
  }

  return response.text();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { type, applicantEmail, recipientEmail, approvalToken, origin } = payload;
    const siteUrl = origin || "https://shringar-pos.vercel.app";

    if (type === "new_request") {
      if (!applicantEmail || !approvalToken) {
        return new Response(
          JSON.stringify({ error: "applicantEmail and approvalToken are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const approvalUrl = `${siteUrl}/approve-access?token=${encodeURIComponent(approvalToken)}`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f8fa; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e1e4e8; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #1a1a1a; margin: 0; font-size: 22px;">💍 Shringar POS</h2>
      <p style="color: #6a737d; margin: 6px 0 0; font-size: 14px;">Access Request Received</p>
    </div>
    <p style="font-size: 15px; color: #24292e; line-height: 1.5;">
      A new user has requested access to join Shringar POS:
    </p>
    <div style="background: #f1f8ff; border: 1px solid #c8e1ff; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
      <span style="font-size: 13px; color: #586069; display: block; margin-bottom: 2px;">Applicant Email:</span>
      <strong style="font-size: 16px; color: #0366d6;">${applicantEmail}</strong>
    </div>
    <div style="text-align: center; margin: 30px 0 20px;">
      <a href="${approvalUrl}" style="background-color: #2da44e; color: #ffffff; padding: 12px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">
        Approve Request & Send Invite Link
      </a>
    </div>
    <p style="font-size: 12px; color: #6a737d; text-align: center; margin-top: 20px;">
      Or copy direct approval link:<br/>
      <a href="${approvalUrl}" style="color: #0366d6; word-break: break-all;">${approvalUrl}</a>
    </p>
  </div>
</body>
</html>`;

      await sendSesEmail({
        to: ADMIN_EMAIL,
        subject: `New Access Request for Shringar POS: ${applicantEmail}`,
        html,
      });

      return new Response(JSON.stringify({ success: true, message: "Email sent to admin" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (type === "invite_approved_user") {
      const targetEmail = recipientEmail || applicantEmail;
      if (!targetEmail || !approvalToken) {
        return new Response(
          JSON.stringify({ error: "targetEmail and approvalToken are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const createAccountUrl = `${siteUrl}/create-account?token=${encodeURIComponent(approvalToken)}`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f8fa; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e1e4e8; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #1a1a1a; margin: 0; font-size: 22px;">💍 Shringar POS</h2>
      <p style="color: #6a737d; margin: 6px 0 0; font-size: 14px;">Showroom Management Suite</p>
    </div>
    <p style="font-size: 15px; color: #24292e; line-height: 1.5;">
      Hello,
    </p>
    <p style="font-size: 15px; color: #24292e; line-height: 1.5;">
      Your request to access Shringar POS has been <strong>approved</strong>! You can now set your password and launch the application directly without email verification.
    </p>
    <div style="text-align: center; margin: 30px 0 20px;">
      <a href="${createAccountUrl}" style="background-color: #2da44e; color: #ffffff; padding: 12px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">
        Create Account & Launch POS
      </a>
    </div>
    <p style="font-size: 12px; color: #6a737d; text-align: center; margin-top: 20px;">
      Or copy the link directly into your browser:<br/>
      <a href="${createAccountUrl}" style="color: #0366d6; word-break: break-all;">${createAccountUrl}</a>
    </p>
  </div>
</body>
</html>`;

      await sendSesEmail({
        to: targetEmail,
        subject: `Your Access to Shringar POS Has Been Approved!`,
        html,
      });

      return new Response(JSON.stringify({ success: true, message: "Invitation email sent to user" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid email type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-access-email error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
