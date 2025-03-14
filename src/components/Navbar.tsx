import * as React from "react"
import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import Toolbar from "@mui/material/Toolbar"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import Menu from "@mui/material/Menu"
import MenuIcon from "@mui/icons-material/Menu"
import Container from "@mui/material/Container"
import Avatar from "@mui/material/Avatar"
import Button from "@mui/material/Button"
import Tooltip from "@mui/material/Tooltip"
import MenuItem from "@mui/material/MenuItem"
import { Link, useNavigate } from "react-router-dom"
import { useTheme } from "../contexts/useTheme"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import SettingsIcon from "@mui/icons-material/Settings"
import { useAuth } from "../contexts/useAuth"

const settings = ["Profile", "Account", "Logout"]

export default function Navbar() {
  const { isDarkMode, toggleTheme } = useTheme()
  const { isAuthenticated, logout } = useAuth()
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null)
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  )
  const navigate = useNavigate()

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget)
  }
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget)
  }

  const handleCloseNavMenu = () => {
    setAnchorElNav(null)
  }

  const handleCloseUserMenu = () => {
    setAnchorElUser(null)
  }

  const handleMenuItemClick = (setting: string) => {
    handleCloseUserMenu()
    if (setting === "Logout") {
      logout()
    } else if (setting === "Profile") {
      navigate("/profile")
    } else if (setting === "Account") {
      navigate("/account")
    }
    // Add other cases for Account if needed
  }

  const themeToggle = (
    <IconButton onClick={toggleTheme} color="inherit">
      {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  )

  return (
    <AppBar position="sticky" sx={{ mb: 2, maxWidth: "xl", mx: "auto" }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h5"
            noWrap
            component={Link}
            to="/"
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              textDecoration: "none",
              color: "secondary.main",
              ":hover": { color: "white" },
            }}
          >
            chopchoprecipes.com
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              sx={{ color: "secondary.main", ":hover": { color: "white" } }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: "block", md: "none" } }}
            >
              <MenuItem>
                <Typography
                  sx={{ textAlign: "center" }}
                  component={Link}
                  to="/recipes"
                >
                  Recipes
                </Typography>
              </MenuItem>
              <MenuItem>
                <Typography
                  sx={{ textAlign: "center" }}
                  component={Link}
                  to="/about"
                >
                  About Us
                </Typography>
              </MenuItem>
            </Menu>
          </Box>
          <Typography
            variant="h5"
            noWrap
            component={Link}
            to="/"
            sx={{
              mr: 2,
              display: { xs: "flex", md: "none" },
              flexGrow: 1,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              textDecoration: "none",
              color: "secondary.main",
              ":hover": { color: "white" },
            }}
          >
            chopchoprecipes.com
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
            <Button
              onClick={handleCloseNavMenu}
              sx={{
                my: 2,
                color: "secondary.main",
                ":hover": { color: "white" },
                display: "block",
              }}
              component={Link}
              to="/recipes"
            >
              Explore Recipes
            </Button>
            <Button
              onClick={handleCloseNavMenu}
              sx={{
                my: 2,
                color: "secondary.main",
                ":hover": { color: "white" },
                display: "block",
              }}
              component={Link}
              to="/add"
            >
              Add Recipe
            </Button>

            <Button
              onClick={handleCloseNavMenu}
              sx={{
                my: 2,
                color: "secondary.main",
                ":hover": { color: "white" },
                display: "block",
              }}
              component={Link}
              to="/about"
            >
              About Us
            </Button>
          </Box>
          <Box sx={{ flexGrow: 0 }}>
            {themeToggle}
            {isAuthenticated ? (
              <>
                <Tooltip title="Open settings">
                  <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                    <Avatar>
                      <SettingsIcon />
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: "45px" }}
                  id="menu-appbar"
                  anchorEl={anchorElUser}
                  anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  open={Boolean(anchorElUser)}
                  onClose={handleCloseUserMenu}
                >
                  {settings.map((setting) => (
                    <MenuItem
                      key={setting}
                      onClick={() => handleMenuItemClick(setting)}
                    >
                      <Typography sx={{ textAlign: "center" }}>
                        {setting}
                      </Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/login"
                  sx={{
                    color: "secondary.main",
                    ":hover": { color: "white" },
                  }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/register"
                  sx={{
                    color: "secondary.main",
                    ":hover": { color: "white" },
                  }}
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}
