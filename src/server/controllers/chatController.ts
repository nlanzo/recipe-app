import { Request, Response } from "express"
import { ChatService } from "../services/chatService.js"

export const handleChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { messages } = req.body
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

    const response = await ChatService.processChat(messages)
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
