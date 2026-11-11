# Kimi SMS authentication setup

Kimi uses the open-source `@alikhangholi/iran-sms@1.0.2` SDK from the Supabase Auth Send SMS Hook.

## Deployed function

- Function: `send-sms`
- URL: `https://gegkwtxpygtfzyhnnrgv.supabase.co/functions/v1/send-sms`
- JWT verification: disabled because Supabase Auth calls the hook before issuing a user JWT. Requests are authenticated by the Standard Webhooks signature.

## Required Supabase Function secrets

Set these in Supabase Dashboard → Edge Functions → Secrets. Never commit them to GitHub or put them in the browser app.

Common:
- `SEND_SMS_HOOK_SECRET`: generate this in Authentication → Hooks when creating the HTTP Send SMS Hook. Keep the full value beginning with `v1,whsec_`.
- `SMS_PROVIDER`: one of `kavenegar`, `smsir`, `farazsms`, `ghasedak`. If omitted, KavehNegar is selected.
- `SMS_TEMPLATE_ID`: the OTP template/pattern identifier configured in the provider panel. The template variable must be named `code`.

Provider-specific:
- KavehNegar: `KAVENEGAR_API_KEY`, `KAVENEGAR_LINE_NUMBER`
- SMS.ir: `SMSIR_API_KEY`, `SMSIR_LINE_NUMBER`
- FarazSMS: `FARAZSMS_USERNAME`, `FARAZSMS_PASSWORD`, `FARAZSMS_LINE_NUMBER`
- Ghasedak: `GHASEDAK_API_KEY`, `GHASEDAK_LINE_NUMBER`

## Enable the Supabase Auth hook

In Supabase Dashboard → Authentication → Hooks:
1. Add an HTTP **Send SMS** hook.
2. Set the URL to the deployed function URL above.
3. Generate a webhook secret and save the exact secret as `SEND_SMS_HOOK_SECRET` in Edge Function secrets.
4. Save the hook.

Then enable phone authentication in Authentication → Providers → Phone.

## Important

The current Kimi web signup screen still uses email/password. Deploying this hook alone does not change that screen to phone OTP. The client signup/login flow must be switched to Supabase phone OTP before users will trigger this hook. A real SMS test also requires an active provider account, sender/line and approved OTP template.
