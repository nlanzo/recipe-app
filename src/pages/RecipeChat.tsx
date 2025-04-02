import { Container, Typography } from "@mui/material"
import RecipeChat from "../components/RecipeChat"

export default function RecipeChatPage() {
  return (
    <Container maxWidth="lg">
      <Typography
        component="h4"
        sx={{
          fontSize: { xs: "2rem", md: "3rem" },
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 4,
          color: "secondary.main",
        }}
      >
        Recipe Assistant
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Chat with our AI-powered assistant to discover recipes that match your
        preferences.
      </Typography>
      <RecipeChat />
    </Container>
  )
}
