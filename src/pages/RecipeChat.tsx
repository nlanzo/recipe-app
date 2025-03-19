import { Container, Typography } from "@mui/material"
import RecipeChat from "../components/RecipeChat"

export default function RecipeChatPage() {
  return (
    <Container maxWidth="lg">
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ mt: 4, mb: 3 }}
      >
        Recipe Assistant
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Chat with our AI assistant to discover recipes that match your
        preferences and dietary requirements.
      </Typography>
      <RecipeChat />
    </Container>
  )
}
