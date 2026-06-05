export async function sendSms(to, body) {
  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const exophone = process.env.EXOTEL_EXOPHONE;

  if (!accountSid || !apiKey || !apiToken) {
    console.log(`[SIMULATED SMS to ${to}]: ${body}`);
    return;
  }

  if (!exophone) {
    console.error(`Exotel SMS failed for ${to}: Missing EXOTEL_EXOPHONE in .env`);
    return;
  }

  // Basic auth header
  const auth = Buffer.from(`${apiKey}:${apiToken}`).toString("base64");
  const subdomain = process.env.EXOTEL_SUBDOMAIN || "api.exotel.com";
  const url = `https://${subdomain}/v1/Accounts/${accountSid}/Sms/send.json`;

  const params = new URLSearchParams();
  params.append("From", exophone);
  params.append("To", to);
  params.append("Body", body);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Exotel SMS failed for ${to}:`, errorText);
    } else {
      console.log(`Exotel SMS sent to ${to}`);
    }
  } catch (err) {
    console.error(`Exotel SMS error for ${to}:`, err.message);
  }
}
