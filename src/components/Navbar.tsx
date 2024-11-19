import { AppBar, Toolbar, Typography, Button } from "@mui/material"
import Grid from "@mui/material/Grid2"
import { Link } from "react-router-dom" // Assuming React Router is used for navigation
import { useState } from "react"

export default function Navbar() {
  // Replace this with your actual authentication logic
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <AppBar position="static" className="bg-primary text-secondary shadow-md">
      <Toolbar>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ flexGrow: 1 }}
        >
          {/* Left Side: Company Name */}
          <Grid>
            <Typography
              variant="h6"
              component={Link}
              to="/"
              className="flex-grow text-secondary no-underline hover:underline"
            >
              Recipe App
            </Typography>
          </Grid>

          {/* Right Side: Navigation Links */}
          <Grid
            container
            spacing={2}
            alignItems="center"
            justifyContent="flex-end"
            size={{ xs: "auto" }}
          >
            <Grid>
              <Button
                component={Link}
                to="/"
                className="text-secondary hover:underline"
              >
                Home
              </Button>
            </Grid>
            <Grid>
              <Button
                component={Link}
                to="/recipes"
                className="text-secondary hover:underline"
              >
                Recipes
              </Button>
            </Grid>
            <Grid>
              <Button
                component={Link}
                to="/about"
                className="text-secondary hover:underline"
              >
                About Us
              </Button>
            </Grid>
            {isLoggedIn ? (
              <Grid>
                <Button
                  onClick={() => setIsLoggedIn(false)}
                  className="text-secondary hover:underline"
                >
                  Logout
                </Button>
              </Grid>
            ) : (
              <Grid>
                <Button
                  component={Link}
                  to="/login"
                  className="text-secondary hover:underline"
                >
                  Login
                </Button>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  )
}
