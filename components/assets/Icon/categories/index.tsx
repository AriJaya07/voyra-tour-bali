import ToursIcon from "./ToursIcon"
import RomanceIcon from "./RomanceIcon"
import FamilyIcon from "./FamilyIcon"
import CultureIcon from "./CultureIcon"
import NatureIcon from "./NatureIcon"
import FoodDrinkIcon from "./FoodDrinkIcon"
import AdventureIcon from "./AdventureIcon"
import WaterSportsIcon from "./WaterSportsIcon"
import TempleIcon from "./TempleIcon"
import BeachIcon from "./BeachIcon"

export {
  ToursIcon,
  RomanceIcon,
  FamilyIcon,
  CultureIcon,
  NatureIcon,
  FoodDrinkIcon,
  AdventureIcon,
  WaterSportsIcon,
  TempleIcon,
  BeachIcon,
}

/** Map category slug → icon component */
export const CATEGORY_ICON_MAP: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement> & { isActive?: boolean }>
> = {
  tours: ToursIcon,
  romance: RomanceIcon,
  family: FamilyIcon,
  culture: CultureIcon,
  nature: NatureIcon,
  "food-drink": FoodDrinkIcon,
  adventure: AdventureIcon,
  "water-sports": WaterSportsIcon,
  temple: TempleIcon,
  beach: BeachIcon,
}
