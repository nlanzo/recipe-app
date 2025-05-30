import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

// Configure AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION?.trim(),
  credentials: {
    accessKeyId:
      (
        process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
      )?.trim() ?? "",
    secretAccessKey:
      (
        process.env.AWS_SES_SECRET_ACCESS_KEY ||
        process.env.AWS_SECRET_ACCESS_KEY
      )?.trim() ?? "",
  },
})

export class EmailService {
  static async sendEmail(to: string, subject: string, html: string) {
    try {
      const params = {
        Source: process.env.SMTP_FROM?.trim() ?? "noreply@chopchoprecipes.com",
        Destination: {
          ToAddresses: [to.trim()],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: html,
              Charset: "UTF-8",
            },
          },
        },
      }

      console.log("Attempting to send email with params:", {
        source: params.Source,
        to: params.Destination.ToAddresses,
        subject: params.Message.Subject.Data,
        region: process.env.AWS_REGION?.trim(),
        hasAccessKey: Boolean(
          process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
        ),
        hasSecretKey: Boolean(
          process.env.AWS_SES_SECRET_ACCESS_KEY ||
            process.env.AWS_SECRET_ACCESS_KEY
        ),
      })

      const command = new SendEmailCommand(params)
      const result = await sesClient.send(command)
      console.log("Email sent successfully:", result.MessageId)
      return result
    } catch (error) {
      console.error("Error details:", {
        error,
        credentials: {
          region: process.env.AWS_REGION?.trim(),
          accessKeyId:
            process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
              ? "Set"
              : "Not set",
          secretAccessKey:
            process.env.AWS_SES_SECRET_ACCESS_KEY ||
            process.env.AWS_SECRET_ACCESS_KEY
              ? "Set"
              : "Not set",
          smtpFrom: process.env.SMTP_FROM?.trim(),
        },
      })
      throw new Error("Failed to send email")
    }
  }
}
