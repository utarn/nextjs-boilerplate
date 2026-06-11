import nodemailer from 'nodemailer'

// ---------------------------------------------------------------------------
// SMTP Transport (lazy singleton)
// ---------------------------------------------------------------------------

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const useSSL = process.env.SMTP_USE_SSL !== 'false'
  const insecureSkipVerify = process.env.SMTP_INSECURE_SKIP_VERIFY === 'true'

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env',
    )
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: useSSL,
    auth: { user, pass },
    ...(insecureSkipVerify && {
      tls: { rejectUnauthorized: false },
    }),
  })

  return transporter
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Next.js Boilerplate'

function getFromAddress(): string {
  const senderEmail =
    process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@example.com'
  const senderName = process.env.SMTP_SENDER_NAME
  return senderName ? `"${senderName}" <${senderEmail}>` : senderEmail
}

// ---------------------------------------------------------------------------
// Generic sendEmail
// ---------------------------------------------------------------------------

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transport = getTransporter()

  await transport.sendMail({
    from: getFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}

// ---------------------------------------------------------------------------
// Magic link email
// ---------------------------------------------------------------------------

export async function sendMagicLinkEmail(
  email: string,
  magicLinkUrl: string,
): Promise<void> {
  const from = getFromAddress()

  const transport = getTransporter()

  await transport.sendMail({
    from,
    to: email,
    subject: `Sign in to ${appName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Sign in to ${appName}</h2>
        <p style="color: #555;">
          Click the link below to sign in. This link expires in 15 minutes.
        </p>
        <p>
          <a
            href="${magicLinkUrl}"
            style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #2563eb;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
            "
          >
            Sign In
          </a>
        </p>
        <p style="color: #888; font-size: 13px;">
          If you did not request this link, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
        <p style="color: #aaa; font-size: 12px;">
          If the button above does not work, copy and paste this URL into your browser:<br />
          <a href="${magicLinkUrl}">${magicLinkUrl}</a>
        </p>
      </div>
    `,
    text: `Sign in to ${appName}:\n${magicLinkUrl}\n\nThis link expires in 15 minutes. If you did not request this, ignore this email.`,
  })
}
