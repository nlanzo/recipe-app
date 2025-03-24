import { Request, Response } from "express"
import { processChat } from "../services/chatService.js"

export const handleChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { messages, sessionId } = req.body
    console.log("Processing chat messages:", messages)

    if (!Array.isArray(messages)) {
      console.error("Invalid messages format:", messages)
      res.status(400).json({ error: "Messages must be an array" })
      return
    }

    if (!messages.length) {
      console.error("Empty messages array")
      res.status(400).json({ error: "Messages array cannot be empty" })
      return
    }

    if (!sessionId) {
      console.error("Missing sessionId")
      res.status(400).json({ error: "sessionId is required" })
      return
    }

    const response = await processChat(sessionId, messages)
    console.log("Chat response:", response)
    res.json(response)
  } catch (error) {
    console.error("Chat controller error:", error)
    res.status(500).json({
      error: "Failed to process chat message",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
