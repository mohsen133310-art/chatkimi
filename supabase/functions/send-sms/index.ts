import { Webhook } from "npm:standardwebhooks@1.0.0";
import { IranSms } from "npm:@alikhangholi/iran-sms@1.0.2";

type ProviderName = "kavenegar" | "smsir" | "farazsms" | "ghasedak";

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

function providerConfig() {
  const provider = (Deno.env.get("SMS_PROVIDER") ?? "kavenegar") as ProviderName;

  switch (provider) {
    case "kavenegar":
      return {
        provider,
        apiKey: required("KAVENEGAR_API_KEY"),
        lineNumber: required("KAVENEGAR_LINE_NUMBER"),
      };
    case "smsir":
      return {
        provider,
        apiKey: required("SMSIR_API_KEY"),
        lineNumber: Number(required("SMSIR_LINE_NUMBER")),
      };
    case "farazsms":
      return {
        provider,
        username: required("FARAZSMS_USERNAME"),
        password: required("FARAZSMS_PASSWORD"),
        lineNumber: required("FARAZSMS_LINE_NUMBER"),
      };
    case "ghasedak":
      return {
        provider,
        apiKey: required("GHASEDAK_API_KEY"),
        lineNumber: required("GHASEDAK_LINE_NUMBER"),
      };
    default:
      throw new Error("Unsupported SMS_PROVIDER. Use kavenegar, smsir, farazsms, or ghasedak.");
  }
}

function formatPhone(phone: string, provider: ProviderName): string {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("98") ? digits.slice(2) : digits;
  const mobile = national.startsWith("0") ? national.slice(1) : national;

  if (!/^9\d{9}$/.test(mobile)) {
    throw new Error("Only Iranian mobile numbers are supported by this SMS setup.");
  }

  return provider === "farazsms" ? `+98${mobile}` : mobile;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  if (!hookSecret) {
    return new Response(JSON.stringify({ error: "SMS hook is not configured." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.text();
    const verifier = new Webhook(hookSecret.replace(/^v1,whsec_/, ""));
    const event = verifier.verify(payload, Object.fromEntries(req.headers)) as {
      user?: { phone?: string };
      sms?: { otp?: string };
    };

    const phone = event.user?.phone;
    const otp = event.sms?.otp;
    if (!phone || !otp || !/^\d{6}$/.test(otp)) {
      throw new Error("Invalid Supabase SMS hook payload.");
    }

    const config = providerConfig();
    const provider = config.provider as ProviderName;
    const templateId = required("SMS_TEMPLATE_ID");

    const sms = new IranSms({ provider: config as never, timeout: 4500 });
    await sms.sendPattern({
      to: formatPhone(phone, provider),
      templateId,
      variables: { code: otp },
    });

    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SMS hook failed:", error);
    return new Response(JSON.stringify({
      error: {
        http_code: 503,
        message: "Unable to send verification SMS. Please try again later.",
      },
    }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Retry-After": "true" },
    });
  }
});
