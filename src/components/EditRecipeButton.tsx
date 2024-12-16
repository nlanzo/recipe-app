import { Button } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { FiEdit3 } from "react-icons/fi"

interface Props {
  id: string
}

export default function EditRecipeButton({ id }: Props) {
  const navigate = useNavigate()
  return (
    <Button
      variant="contained"
      color="primary"
      onClick={() => navigate(`/recipes/${id}/edit`)}
    >
      <FiEdit3 />
      Edit Recipe
    </Button>
  )
}
