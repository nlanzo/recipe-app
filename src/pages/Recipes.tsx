import RecipeList from "../components/RecipeList"

type Props = {}
export default function Recipes({}: Props) {
  return (
    <div>
      <h2>All Recipes</h2>
      <RecipeList />
    </div>
  )
}
