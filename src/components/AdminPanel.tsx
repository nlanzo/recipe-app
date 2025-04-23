import React, { useState, useEffect, useCallback } from "react"
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  TablePagination,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Container,
  Chip,
} from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import SearchIcon from "@mui/icons-material/Search"
import { useNavigate } from "react-router-dom"
import { AdminRecipeItem } from "../types/Recipe"
import { authenticatedFetch } from "../utils/auth"

interface User {
  id: number
  username: string
  email: string
  createdAt: string
  isAdmin: boolean
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "Invalid Date"
  }
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    "aria-controls": `admin-tabpanel-${index}`,
  }
}

export default function AdminPanel() {
  const [recipes, setRecipes] = useState<AdminRecipeItem[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [totalRecipes, setTotalRecipes] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState(0)
  const navigate = useNavigate()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch(
        `/api/admin/users?page=${page}&limit=${rowsPerPage}${
          searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""
        }`
      )

      if (!response.ok) throw new Error("Failed to fetch users")

      const data = await response.json()
      setUsers(data.users || [])
      setTotalUsers(data.total || 0)
    } catch (error) {
      console.error("Error fetching users:", error)
      setUsers([])
      setTotalUsers(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, searchTerm])

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch(
        `/api/recipes?page=${page + 1}&limit=${rowsPerPage}${
          searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""
        }`
      )

      if (!response.ok) throw new Error("Failed to fetch recipes")

      const data = await response.json()
      setRecipes(data.recipes || [])
      setTotalRecipes(data.total || 0)
    } catch (error) {
      console.error("Error fetching recipes:", error)
      setRecipes([])
      setTotalRecipes(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, searchTerm])

  useEffect(() => {
    if (selectedTab === 0) {
      fetchUsers()
    } else if (selectedTab === 1) {
      fetchRecipes()
    }
  }, [selectedTab, fetchUsers, fetchRecipes])

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleEdit = (recipeId: number) => {
    navigate(`/recipes/${recipeId}/edit`)
  }

  const handleDelete = async (recipeId: number) => {
    if (!window.confirm("Are you sure you want to delete this recipe?")) return

    try {
      const response = await authenticatedFetch(
        `/api/admin/recipes/${recipeId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) throw new Error("Failed to delete recipe")

      // Refresh the recipes list
      fetchRecipes()
    } catch (error) {
      console.error("Error deleting recipe:", error)
    }
  }

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setPage(0)
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue)
    setPage(0)
    setSearchTerm("")
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <Typography
          component="h1"
          variant="h4"
          color="primary"
          gutterBottom
          sx={{ p: 2 }}
        >
          Admin Panel
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            aria-label="admin panel tabs"
          >
            <Tab label="Users" {...a11yProps(0)} />
            <Tab label="Recipes" {...a11yProps(1)} />
            <Tab label="Reports" {...a11yProps(2)} />
          </Tabs>
        </Box>
        <TabPanel value={selectedTab} index={0}>
          <Typography variant="h4" gutterBottom>
            User Management
          </Typography>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearch}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Role</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.isAdmin ? "Admin" : "User"}
                          color={user.isAdmin ? "primary" : "default"}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={selectedTab === 0 ? totalUsers : totalRecipes}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </TabPanel>
        <TabPanel value={selectedTab} index={1}>
          <Typography variant="h4" gutterBottom>
            Recipe Management
          </Typography>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={handleSearch}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Author</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : recipes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No recipes found
                    </TableCell>
                  </TableRow>
                ) : (
                  recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell>{recipe.title}</TableCell>
                      <TableCell>{recipe.username}</TableCell>
                      <TableCell>{formatDate(recipe.createdAt)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => handleEdit(recipe.id)}
                          color="primary"
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(recipe.id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalRecipes}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </TabPanel>
        <TabPanel value={selectedTab} index={2}>
          <Typography>Reports and Analytics Coming Soon</Typography>
        </TabPanel>
      </Paper>
    </Container>
  )
}
