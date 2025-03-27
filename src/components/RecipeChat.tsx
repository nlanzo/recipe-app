import { useState, useRef, useEffect } from "react"
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Stack,
  CircularProgress,
} from "@mui/material"
import SendIcon from "@mui/icons-material/Send"
import SmartToyIcon from "@mui/icons-material/SmartToy"
import PersonIcon from "@mui/icons-material/Person"
import ReactMarkdown from "react-markdown"

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
  const [sessionId] = useState(() => crypto.randomUUID())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initial focus
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input when loading state changes
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isLoading])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          sessionId,
        }),
      })

      console.log("Received response:", {
        status: response.status,
        statusText: response.statusText,
      })

      const responseData = await response.json()
      console.log("Response data:", responseData)

      if (!response.ok) {
        console.error("Chat API error:", {
          status: response.status,
          statusText: response.statusText,
          error: responseData,
        })
        throw new Error(responseData.error || "Failed to get response")
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseData.content },
      ])
    } catch (error) {
      console.error("Chat error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Sorry, I encountered an error. Please try again.",
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
                "& .markdown-content": {
                  "& p": {
                    margin: "0.5em 0",
                    lineHeight: 1.6,
                    fontSize: "1rem",
                    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
                  },
                  "& a": {
                    color: message.role === "user" ? "white" : "primary.main",
                    textDecoration: "none",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  },
                  "& ul, & ol": {
                    margin: "0.5em 0",
                    paddingLeft: "1.5em",
                    "& li": {
                      margin: "0.25em 0",
                    },
                  },
                },
              }}
            >
              <div className="markdown-content">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
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
            inputRef={inputRef}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            type="submit"
            sx={{
              position: "relative",
              "& .MuiCircularProgress-root": {
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <SendIcon />
            )}
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  )
}
