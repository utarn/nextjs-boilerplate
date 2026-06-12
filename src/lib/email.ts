import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { WebUserRole } from '@/generated/client'

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

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// ---------------------------------------------------------------------------
// Branded email HTML wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap body HTML in a branded email template with consistent header, spacing,
 * and footer.  The wrapper is fully responsive with inline styles for maximum
 * email-client compatibility.
 *
 * @internal Public only so worker modules can reuse the same wrapper for
 *           queue-based email jobs.
 */
export function brandedEmailWrapper(title: string, bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f5f7;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
        <tr>
          <td align="center" style="padding: 32px 16px;">
            <!-- Container -->
            <table role="presentation" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px 32px 0 32px;">
                  <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1a1a1a;">
                    ${appName}
                  </h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 16px 32px 24px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333333;">
                  ${bodyHtml}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 16px 32px 24px 32px; border-top: 1px solid #e8e8e8;">
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #999999;">
                    ${appName} &mdash; Your productivity platform
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

/**
 * Create a branded CTA button link HTML.
 */
function ctaButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="border-radius: 6px; background-color: #2563eb;">
          <a
            href="${href}"
            style="
              display: inline-block;
              padding: 12px 28px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 15px;
              font-weight: 600;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              line-height: 1;
            "
          >
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `
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
// 1. Magic link email
// ---------------------------------------------------------------------------

export async function sendMagicLinkEmail(
  email: string,
  magicLinkUrl: string,
): Promise<void> {
  const transport = getTransporter()

  const html = brandedEmailWrapper(
    `Sign in to ${appName}`,
    `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">
        Sign in to ${appName}
      </h2>
      <p style="margin: 0 0 16px 0; color: #555555;">
        Click the button below to sign in. This link expires in 15 minutes.
      </p>
      ${ctaButton(magicLinkUrl, 'Sign In')}
      <p style="margin: 0 0 0 0; color: #888888; font-size: 13px;">
        If you did not request this link, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="margin: 0; color: #aaaaaa; font-size: 12px;">
        If the button above does not work, copy and paste this URL into your browser:<br />
        <a href="${magicLinkUrl}" style="color: #2563eb;">${magicLinkUrl}</a>
      </p>
    `,
  )

  const text = `Sign in to ${appName}:\n${magicLinkUrl}\n\nThis link expires in 15 minutes. If you did not request this, ignore this email.`

  await transport.sendMail({
    from: getFromAddress(),
    to: email,
    subject: `Sign in to ${appName}`,
    html,
    text,
  })
}

// ---------------------------------------------------------------------------
// 2. New user notification to admins
// ---------------------------------------------------------------------------

interface NewUserNotificationOptions {
  userEmail: string
  userDisplayName: string
}

export async function sendNewUserNotificationToAdmins({
  userEmail,
  userDisplayName,
}: NewUserNotificationOptions): Promise<void> {
  const admins = await prisma.webUser.findMany({
    where: {
      role: WebUserRole.ADMIN,
      status: 'ACTIVE',
    },
    select: { email: true },
  })

  if (admins.length === 0) return

  const appUrl = getAppUrl()
  const to = admins.map((a) => a.email)

  const html = brandedEmailWrapper(
    'New user signup',
    `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">
        New User Signup
      </h2>
      <p style="margin: 0 0 16px 0; color: #555555;">
        A new user has signed up and is awaiting approval:
      </p>
      <table style="margin: 16px 0; font-size: 14px; color: #333333;">
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #888888;">Name:</td>
          <td style="font-weight: 600;">${userDisplayName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #888888;">Email:</td>
          <td>${userEmail}</td>
        </tr>
      </table>
      ${ctaButton(`${appUrl}/admin/users`, 'Review in Admin Panel')}
    `,
  )

  const text = `New user signup: ${userDisplayName}\n\nA new user has signed up and is awaiting approval:\nName: ${userDisplayName}\nEmail: ${userEmail}\n\nReview in Admin Panel: ${appUrl}/admin/users`

  const transport = getTransporter()

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject: `New user signup: ${userDisplayName}`,
    html,
    text,
  })
}

// ---------------------------------------------------------------------------
// 3. Account approved email
// ---------------------------------------------------------------------------

interface AccountStatusEmailOptions {
  to: string
  displayName: string
}

export async function sendAccountApprovedEmail({
  to,
  displayName,
}: AccountStatusEmailOptions): Promise<void> {
  const appUrl = getAppUrl()
  const transport = getTransporter()

  const html = brandedEmailWrapper(
    'Account approved',
    `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">
        Account Approved
      </h2>
      <p style="margin: 0 0 8px 0; color: #555555;">
        Hello ${displayName},
      </p>
      <p style="margin: 0 0 16px 0; color: #555555;">
        Your account has been approved. You can now sign in to ${appName}.
      </p>
      ${ctaButton(`${appUrl}/login`, 'Sign In')}
    `,
  )

  const text = `Hello ${displayName},\n\nYour account has been approved. You can now sign in to ${appName}.\n\nSign in here: ${appUrl}/login`

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject: `Your account has been approved — ${appName}`,
    html,
    text,
  })
}

// ---------------------------------------------------------------------------
// 4. Account rejected email
// ---------------------------------------------------------------------------

export async function sendAccountRejectedEmail({
  to,
  displayName,
}: AccountStatusEmailOptions): Promise<void> {
  const transport = getTransporter()

  const html = brandedEmailWrapper(
    'Account not approved',
    `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">
        Account Not Approved
      </h2>
      <p style="margin: 0 0 8px 0; color: #555555;">
        Hello ${displayName},
      </p>
      <p style="margin: 0 0 16px 0; color: #555555;">
        We regret to inform you that your account request was not approved.
        If you believe this is an error, please contact your administrator.
      </p>
    `,
  )

  const text =
    `Hello ${displayName},\n\n` +
    `We regret to inform you that your account request was not approved.\n` +
    `If you believe this is an error, please contact your administrator.`

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject: `Your account request was not approved — ${appName}`,
    html,
    text,
  })
}

// ---------------------------------------------------------------------------
// 5. Quota warning email
// ---------------------------------------------------------------------------

interface QuotaWarningEmailOptions {
  to: string
  displayName: string
  usedBytes: bigint
  quotaBytes: bigint
  remainingBytes: bigint
}

export async function sendQuotaWarningEmail({
  to,
  displayName,
  usedBytes,
  quotaBytes,
  remainingBytes,
}: QuotaWarningEmailOptions): Promise<void> {
  const transport = getTransporter()

  const bytesToMB = (bytes: bigint): number => Number(bytes / BigInt(1048576))
  const formatMB = (mb: number): string => mb.toFixed(1)

  const usedMB = bytesToMB(usedBytes)
  const quotaMB = bytesToMB(quotaBytes)
  const remainingMB = bytesToMB(remainingBytes)

  const html = brandedEmailWrapper(
    'Storage quota warning',
    `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">
        Storage Quota Warning
      </h2>
      <p style="margin: 0 0 8px 0; color: #555555;">
        Hello ${displayName},
      </p>
      <p style="margin: 0 0 16px 0; color: #555555;">
        Your storage usage is approaching the quota limit on <strong>${appName}</strong>.
      </p>
      <table style="margin: 16px 0; font-size: 14px; color: #333333;">
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #888888;">Current usage:</td>
          <td style="font-weight: 600;">${formatMB(usedMB)} MB</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #888888;">Quota limit:</td>
          <td style="font-weight: 600;">${formatMB(quotaMB)} MB</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #888888;">Remaining:</td>
          <td style="font-weight: 600; color: #d97706;">${formatMB(remainingMB)} MB</td>
        </tr>
      </table>
      <p style="margin: 0 0 0 0; color: #555555;">
        Once the quota is reached, new file attachments will not be accepted.
        Please contact your administrator to request a quota increase.
      </p>
    `,
  )

  const text =
    `Hello ${displayName},\n\n` +
    `Your storage usage is approaching the quota limit on ${appName}.\n\n` +
    `Current usage: ${formatMB(usedMB)} MB\n` +
    `Quota limit: ${formatMB(quotaMB)} MB\n` +
    `Remaining: ${formatMB(remainingMB)} MB\n\n` +
    `Once the quota is reached, new file attachments will not be accepted. ` +
    `Please contact your administrator to request a quota increase.`

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject: `Storage quota warning — ${appName}`,
    html,
    text,
  })
}

// ---------------------------------------------------------------------------
// 6. Overdue reminder email
// ---------------------------------------------------------------------------

interface OverdueReminderOptions {
  to: string
  displayName: string
  todos: Array<{
    id: string
    title: string
    dueDate: Date | null
  }>
}

export async function sendOverdueReminderEmail({
  to,
  displayName,
  todos,
}: OverdueReminderOptions): Promise<void> {
  const appUrl = getAppUrl()
  const transport = getTransporter()
  const overdueCount = todos.length

  const todoRows = todos
    .map((t) => {
      const dueLabel = t.dueDate
        ? ` (due: ${t.dueDate.toLocaleDateString()})`
        : ''
      return `<tr><td style="padding: 6px 0; border-bottom: 1px solid #f0f0f0; color: #333333;">• ${t.title}${dueLabel}</td></tr>`
    })
    .join('')

  const html = brandedEmailWrapper(
    `${overdueCount} overdue todo${overdueCount > 1 ? 's' : ''}`,
    `
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #dc2626;">
        Overdue Todo${overdueCount > 1 ? 's' : ''}
      </h2>
      <p style="margin: 0 0 8px 0; color: #555555;">
        Hello ${displayName},
      </p>
      <p style="margin: 0 0 16px 0; color: #555555;">
        You have <strong>${overdueCount}</strong> overdue todo${overdueCount > 1 ? 's' : ''}:
      </p>
      <table style="margin: 12px 0; font-size: 14px;">
        ${todoRows}
      </table>
      ${ctaButton(`${appUrl}/todos`, 'View My Todos')}
    `,
  )

  const todoListText = todos
    .map((t) => {
      const dueLabel = t.dueDate
        ? ` (due: ${t.dueDate.toLocaleDateString()})`
        : ''
      return `- ${t.title}${dueLabel}`
    })
    .join('\n')

  const text =
    `Hello ${displayName},\n\n` +
    `You have ${overdueCount} overdue todo${overdueCount > 1 ? 's' : ''}:\n\n` +
    `${todoListText}\n\n` +
    `View My Todos: ${appUrl}/todos`

  const subject = `${overdueCount} overdue todo${overdueCount > 1 ? 's' : ''} on ${appName}`

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  })
}
