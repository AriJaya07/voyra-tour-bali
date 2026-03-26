import ToursIcon from "./ToursIcon"
import PrivateToursIcon from "./PrivateToursIcon"
import RomanceIcon from "./RomanceIcon"
import FamilyIcon from "./FamilyIcon"
import CultureIcon from "./CultureIcon"
import NatureIcon from "./NatureIcon"
import FoodDrinkIcon from "./FoodDrinkIcon"
import AdventureIcon from "./AdventureIcon"
import WaterSportsIcon from "./WaterSportsIcon"
import TempleIcon from "./TempleIcon"
import BeachIcon from "./BeachIcon"
import DayTripsIcon from "./DayTripsIcon"
import WellnessIcon from "./WellnessIcon"
import NightlifeIcon from "./NightlifeIcon"

export {
  ToursIcon,
  PrivateToursIcon,
  RomanceIcon,
  FamilyIcon,
  CultureIcon,
  NatureIcon,
  FoodDrinkIcon,
  AdventureIcon,
  WaterSportsIcon,
  TempleIcon,
  BeachIcon,
  DayTripsIcon,
  WellnessIcon,
  NightlifeIcon,
}

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { isActive?: boolean }>

/**
 * 1:1 mapping — every category slug gets exactly one unique icon.
 * No duplicates. Slugs match CATEGORY_GROUPS in lib/data/viator.ts.
 */
export const CATEGORY_ICON_MAP: Record<string, IconComponent> = {
  // ── Viator category slugs ──
  "tours":            ToursIcon,         // map pin
  "private-tours":    PrivateToursIcon,  // star
  "culture":          CultureIcon,       // landmark
  "nature":           NatureIcon,        // leaf
  "beach":            BeachIcon,         // beach umbrella
  "adventure":        AdventureIcon,     // mountain
  "food-and-drink":   FoodDrinkIcon,     // utensils
  "day-trips":        DayTripsIcon,      // clock
  "romance":          RomanceIcon,       // heart
  "family":           FamilyIcon,        // people
  "wellness-and-spa": WellnessIcon,      // lotus/zen
  "nightlife":        NightlifeIcon,     // moon

  // ── DB category slugs (kept for backward compat) ──
  "temple":           TempleIcon,
  "water-sports":     WaterSportsIcon,
  "food-drink":       FoodDrinkIcon,
}

/**
 * Resolves an icon for a category by slug.
 * Returns null if no match found (caller should use a fallback like DotsIcon).
 */
export function getCategoryIcon(slug: string): IconComponent | null {
  if (CATEGORY_ICON_MAP[slug]) return CATEGORY_ICON_MAP[slug]
  return null
}
