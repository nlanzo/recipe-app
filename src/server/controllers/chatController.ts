import { Request, Response } from "express"
import { processChat } from "../services/chatService.js"

export const handleChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { messages, sessionId } = req.body
    console.log("Chat request received:")
    console.log("Session ID:", sessionId)
    console.log("Latest message:", messages[messages.length - 1])

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

    console.log("Processing chat with OpenAI...")
    const response = await processChat(sessionId, messages)
    console.log("OpenAI response:", response.content)

    // Log if a recipe was found or not
    if (response.content.includes("I'm sorry")) {
      console.log("No matching recipes found")
    } else if (response.content.includes("Here's a recipe")) {
      console.log("Recipe suggestion provided")
    }

    res.json(response)
  } catch (error) {
    console.error("Chat controller error:", error)
    res.status(500).json({
      error: "Failed to process chat message",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
