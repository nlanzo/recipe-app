import { Box, Typography } from "@mui/material"

export default function About() {
  return (
    <Box component="div" sx={{ maxWidth: "xl", mx: "auto", mt: 5 }}>
      <Typography variant="h2" sx={{ mb: 4, fontWeight: 500 }}>
        About RecipeApp
      </Typography>

      <Typography variant="h5" sx={{ mb: 2 }}>
        Discover and share your favorite recipes from around the world. Whether
        you're a professional chef or just getting started, Recipe App is your
        go-to platform for culinary inspiration.
      </Typography>

      <Typography variant="h5" sx={{ mb: 2 }}>
        Our mission is to bring people together through the love of cooking.
        From hearty family meals to exquisite dishes, we aim to make the cooking
        experience joyful and accessible for everyone. Share your culinary
        creations, learn from others, and explore new flavors to elevate your
        kitchen adventures.
      </Typography>

      <Typography variant="h5" sx={{ mb: 2 }}>
        Whether it’s creating a delicious dessert for a special occasion or
        whipping up a quick weeknight dinner, Recipe App empowers you with the
        tools and community to succeed in the kitchen. Let's make cooking more
        than a task — let's make it a passion.
      </Typography>
    </Box>
  )
}
