import { Outlet } from "react-router-dom"
import Navbar from "./components/Navbar" // Adjust the path based on your file structure
import { Box } from "@mui/material"

const Layout = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <Navbar />
      {/* Outlet renders the nested route components */}
      <Outlet />
    </Box>
  )
}

export default Layout
