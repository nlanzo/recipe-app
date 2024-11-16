import { Outlet } from "react-router-dom"
import Navbar from "./components/Navbar" // Adjust the path based on your file structure

const Layout = () => {
  return (
    <>
      <Navbar />
      {/* Outlet renders the nested route components */}
      <Outlet />
    </>
  )
}

export default Layout
