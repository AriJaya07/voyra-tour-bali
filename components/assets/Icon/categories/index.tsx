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

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { isActive?: boolean }>

/** Map category slug → icon component (exact match) */
export const CATEGORY_ICON_MAP: Record<string, IconComponent> = {
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

/**
 * Keyword → icon mapping for dynamic Viator categories.
 * Matches if the slug or name contains the keyword.
 * Order matters — first match wins.
 */
const KEYWORD_ICON_MAP: [string, IconComponent][] = [
  ["temple", TempleIcon],
  ["beach", BeachIcon],
  ["water", WaterSportsIcon],
  ["surf", WaterSportsIcon],
  ["snorkel", WaterSportsIcon],
  ["dive", WaterSportsIcon],
  ["adventure", AdventureIcon],
  ["outdoor", AdventureIcon],
  ["hiking", AdventureIcon],
  ["trek", AdventureIcon],
  ["food", FoodDrinkIcon],
  ["drink", FoodDrinkIcon],
  ["culinary", FoodDrinkIcon],
  ["dining", FoodDrinkIcon],
  ["culture", CultureIcon],
  ["cultural", CultureIcon],
  ["heritage", CultureIcon],
  ["museum", CultureIcon],
  ["nature", NatureIcon],
  ["wildlife", NatureIcon],
  ["eco", NatureIcon],
  ["garden", NatureIcon],
  ["romance", RomanceIcon],
  ["honeymoon", RomanceIcon],
  ["couple", RomanceIcon],
  ["sunset", RomanceIcon],
  ["family", FamilyIcon],
  ["kid", FamilyIcon],
  ["tour", ToursIcon],
  ["sightseeing", ToursIcon],
  ["excursion", ToursIcon],
]

/**
 * Resolves an icon for a category.
 * Tries exact slug match first, then keyword match against the slug.
 */
export function getCategoryIcon(slug: string): IconComponent | null {
  // 1. Exact match
  if (CATEGORY_ICON_MAP[slug]) return CATEGORY_ICON_MAP[slug]

  // 2. Keyword match
  const lower = slug.toLowerCase()
  for (const [keyword, icon] of KEYWORD_ICON_MAP) {
    if (lower.includes(keyword)) return icon
  }

  return null
}
