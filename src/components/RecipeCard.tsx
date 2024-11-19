import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material"
import { useNavigate } from "react-router-dom"

export interface RecipeCardProps {
  id: number
  title: string
  imageUrl: string | null
  totalTimeInMinutes: number
  numberOfServings: number
}

export default function RecipeCard({
  id,
  title,
  imageUrl,
  totalTimeInMinutes,
  numberOfServings,
}: RecipeCardProps) {
  const navigate = useNavigate()

  // Function to handle card click
  const handleCardClick = () => {
    navigate(`/recipes/${id}`)
  }

  return (
    <Card className="border border-secondary shadow-md">
      <CardActionArea onClick={handleCardClick}>
        <CardMedia
          component="img"
          height="180"
          image={imageUrl || "not found"}
          alt={title}
        />
        <CardContent className="bg-primary text-secondary">
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Typography variant="body2">
            Total Time: {totalTimeInMinutes} mins
          </Typography>
          <Typography variant="body2">Servings: {numberOfServings}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
