import { Box, Typography } from "@mui/material"

export default function About() {
  return (
    <Box
      component="div"
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary to-secondary text-white p-8"
    >
      <Typography variant="h2" className="font-bold mb-6 text-center">
        About Recipe App
      </Typography>

      <Typography
        variant="body1"
        className="text-lg text-center max-w-3xl mb-4 leading-relaxed"
      >
        Discover and share your favorite recipes from around the world. Whether
        you're a professional chef or just getting started, Recipe App is your
        go-to platform for culinary inspiration.
      </Typography>

      <Typography
        variant="body1"
        className="text-lg text-center max-w-3xl mb-4 leading-relaxed"
      >
        Our mission is to bring people together through the love of cooking.
        From hearty family meals to exquisite dishes, we aim to make the cooking
        experience joyful and accessible for everyone. Share your culinary
        creations, learn from others, and explore new flavors to elevate your
        kitchen adventures.
      </Typography>

      <Typography
        variant="body1"
        className="text-lg text-center max-w-3xl leading-relaxed"
      >
        Whether it’s creating a delicious dessert for a special occasion or
        whipping up a quick weeknight dinner, Recipe App empowers you with the
        tools and community to succeed in the kitchen. Let's make cooking more
        than a task — let's make it a passion.
      </Typography>
    </Box>
  )
}
