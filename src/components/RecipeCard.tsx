import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material"
import { useNavigate } from "react-router-dom"

interface RecipeCardProps {
  id: number
  title: string
  imageUrl: string
  totalTime: number
  numberOfServings: number
}

const RecipeCard = ({
  id,
  title,
  imageUrl,
  totalTime,
  numberOfServings,
}: RecipeCardProps) => {
  const navigate = useNavigate()

  // Function to handle card click
  const handleCardClick = () => {
    navigate(`/recipes/${id}`)
  }

  return (
    <Card className="border border-secondary shadow-md">
      <CardActionArea onClick={handleCardClick}>
        <CardMedia component="img" height="180" image={imageUrl} alt={title} />
        <CardContent className="bg-primary text-secondary">
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Typography variant="body2">Total Time: {totalTime} mins</Typography>
          <Typography variant="body2">Servings: {numberOfServings}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default RecipeCard
