import { useState, useRef, useEffect } from "react"
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Stack,
} from "@mui/material"
import SendIcon from "@mui/icons-material/Send"
import SmartToyIcon from "@mui/icons-material/SmartToy"
import PersonIcon from "@mui/icons-material/Person"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function RecipeChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your recipe assistant. I can help you find recipes based on your preferences. What kinds of foods do you enjoy?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
    console.log("Messages updated:", messages)
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    console.log("Sending message:", userMessage)
    setInput("")
    setMessages((prev) => {
      console.log("Previous messages:", prev)
      return [...prev, { role: "user", content: userMessage }]
    })
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()
      console.log("Received response:", data)
      setMessages((prev) => {
        console.log("Adding assistant message to:", prev)
        return [...prev, { role: "assistant", content: data.message }]
      })
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Paper
      elevation={3}
      sx={{
        height: "600px",
        maxWidth: "800px",
        margin: "2rem auto",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 2,
          backgroundColor: "primary.main",
          color: "secondary.main",
        }}
      >
        <Typography variant="h6">Recipe Assistant</Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          backgroundColor: "grey.50",
        }}
      >
        {messages.map((message, index) => (
          <Stack
            key={index}
            direction="row"
            spacing={2}
            sx={{
              mb: 2,
              justifyContent:
                message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {message.role === "assistant" && (
              <Avatar sx={{ bgcolor: "primary.main", color: "secondary.main" }}>
                <SmartToyIcon />
              </Avatar>
            )}
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxWidth: "70%",
                backgroundColor:
                  message.role === "user" ? "primary.main" : "background.paper",
                color: message.role === "user" ? "black" : "text.primary",
              }}
            >
              <Typography>{message.content}</Typography>
            </Paper>
            {message.role === "user" && (
              <Avatar sx={{ bgcolor: "secondary.main" }}>
                <PersonIcon />
              </Avatar>
            )}
          </Stack>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <Box
        component="form"
        sx={{
          p: 2,
          backgroundColor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
        }}
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            size="small"
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            type="submit"
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  )
}
