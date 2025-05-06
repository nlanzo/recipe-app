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
  Button,
  Alert,
  Snackbar,
} from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import SearchIcon from "@mui/icons-material/Search"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { useNavigate } from "react-router-dom"
import { AdminRecipeItem } from "../types/Recipe"
import { authenticatedFetch } from "../utils/api"
import { useDebounce } from "../hooks/useDebounce"
import { useAuth } from "../contexts/useAuth"

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
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userRecipes, setUserRecipes] = useState<AdminRecipeItem[]>([])
  const [totalUserRecipes, setTotalUserRecipes] = useState(0)
  const [userRecipesPage, setUserRecipesPage] = useState(0)
  const [userRecipesPerPage, setUserRecipesPerPage] = useState(10)
  const [userRecipesLoading, setUserRecipesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuth()

  // Apply 500ms debounce to the search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const handleApiError = useCallback(
    (error: unknown, operation: string) => {
      console.error(`Failed to ${operation}:`, error)
      const message = error instanceof Error ? error.message : String(error)

      if (
        message.includes("Invalid token") ||
        message.includes("Authentication required")
      ) {
        setError(`Session expired. Attempting to refresh your session...`)
        setShowError(true)

        // Don't immediately log out - the authenticatedFetch utility should
        // try to refresh the token automatically

        // If we still see this error after token refresh attempt, something more serious is wrong
        setTimeout(() => {
          if (showError) {
            setError("Could not refresh your session. Please log in again.")
            setTimeout(() => {
              logout()
              navigate("/login")
            }, 2000)
          }
        }, 5000)
      } else {
        setError(`Failed to ${operation}: ${message}`)
        setShowError(true)
      }
    },
    [logout, navigate, showError]
  )

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch(
        `/api/admin/users?page=${page + 1}&limit=${rowsPerPage}${
          debouncedSearchTerm
            ? `&search=${encodeURIComponent(debouncedSearchTerm)}`
            : ""
        }`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setUsers(data.users || [])
      setTotalUsers(data.total || 0)
    } catch (error) {
      handleApiError(error, "fetch users")
      setUsers([])
      setTotalUsers(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, debouncedSearchTerm, handleApiError])

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch(
        `/api/admin/recipes?page=${page + 1}&limit=${rowsPerPage}${
          debouncedSearchTerm
            ? `&search=${encodeURIComponent(debouncedSearchTerm)}`
            : ""
        }`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setRecipes(data.recipes || [])
      setTotalRecipes(data.total || 0)
    } catch (error) {
      handleApiError(error, "fetch recipes")
      setRecipes([])
      setTotalRecipes(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, debouncedSearchTerm, handleApiError])

  const fetchUserRecipes = useCallback(
    async (userId: number) => {
      setUserRecipesLoading(true)
      try {
        const response = await authenticatedFetch(
          `/api/admin/users/${userId}/recipes?page=${
            userRecipesPage + 1
          }&limit=${userRecipesPerPage}`
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setUserRecipes(data.recipes || [])
        setTotalUserRecipes(data.total || 0)
      } catch (error) {
        handleApiError(error, "fetch user recipes")
        setUserRecipes([])
        setTotalUserRecipes(0)
      } finally {
        setUserRecipesLoading(false)
      }
    },
    [userRecipesPage, userRecipesPerPage, handleApiError]
  )

  useEffect(() => {
    if (selectedTab === 0) {
      fetchUsers()
    } else if (selectedTab === 1) {
      fetchRecipes()
    }
  }, [selectedTab, fetchUsers, fetchRecipes])

  useEffect(() => {
    if (selectedUser) {
      fetchUserRecipes(selectedUser.id)
    }
  }, [selectedUser, fetchUserRecipes])

  // Reset to page 0 when search term changes
  useEffect(() => {
    setPage(0)
  }, [debouncedSearchTerm])

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
      if (selectedUser) {
        fetchUserRecipes(selectedUser.id)
      } else {
        fetchRecipes()
      }
    } catch (error) {
      handleApiError(error, "delete recipe")
    }
  }

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    // No need to reset page here since we're using debounce
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue)
    setPage(0)
    setSearchTerm("")
  }

  const handleUserClick = (user: User) => {
    setSelectedUser(user)
    setUserRecipesPage(0)
  }

  const handleUserRecipesChangePage = (event: unknown, newPage: number) => {
    setUserRecipesPage(newPage)
  }

  const handleUserRecipesChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setUserRecipesPerPage(parseInt(event.target.value, 10))
    setUserRecipesPage(0)
  }

  const handleBackToUsers = () => {
    setSelectedUser(null)
  }

  // User Recipes Component
  const UserRecipes = () => {
    if (!selectedUser) return null

    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToUsers}
            sx={{ mr: 2 }}
          >
            Back to Users
          </Button>
          <Typography variant="h5">
            Recipes by {selectedUser.username}
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userRecipesLoading ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : userRecipes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    This user has no recipes
                  </TableCell>
                </TableRow>
              ) : (
                userRecipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>{recipe.title}</TableCell>
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
            count={totalUserRecipes}
            rowsPerPage={userRecipesPerPage}
            page={userRecipesPage}
            onPageChange={handleUserRecipesChangePage}
            onRowsPerPageChange={handleUserRecipesChangeRowsPerPage}
          />
        </TableContainer>
      </Box>
    )
  }

  const handleCloseError = () => {
    setShowError(false)
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

          {selectedUser ? (
            <UserRecipes />
          ) : (
            <>
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
                        <TableRow
                          key={user.id}
                          onClick={() => handleUserClick(user)}
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "rgba(0, 0, 0, 0.04)",
                            },
                          }}
                        >
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
            </>
          )}
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
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Container>
  )
}
