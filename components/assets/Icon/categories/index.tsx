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
  "tours":            ToursIcon,
  "private-tours":    PrivateToursIcon,
  "culture":          CultureIcon,
  "nature":           NatureIcon,
  "beach":            BeachIcon,
  "adventure":        AdventureIcon,
  "food-and-drink":   FoodDrinkIcon,
  "day-trips":        DayTripsIcon,
  "romance":          RomanceIcon,
  "family":           FamilyIcon,
  "wellness-and-spa": WellnessIcon,
  "nightlife":        NightlifeIcon,

  // ── DB / alternate slugs ──
  "temple":           TempleIcon,
  "water-sports":     WaterSportsIcon,
  "food-drink":       FoodDrinkIcon,
  "culture-temples":  CultureIcon,
  "culture-and-temples": CultureIcon,
  "beach-and-water":  BeachIcon,
  "wellness":         WellnessIcon,
  "spa":              WellnessIcon,
  "romantic":         RomanceIcon,
  "sightseeing":      ToursIcon,
  "full-day-tours":   DayTripsIcon,
  "bus-tours":        ToursIcon,
  "car-tours":        ToursIcon,
  "walking-tours":    ToursIcon,
  "private-sightseeing-tours": PrivateToursIcon,
  "private-and-luxury": PrivateToursIcon,
  "private-luxury":   PrivateToursIcon,
  "wildlife":         NatureIcon,
  "waterfall":        NatureIcon,
  "snorkeling":       WaterSportsIcon,
  "diving":           WaterSportsIcon,
  "surfing":          WaterSportsIcon,
  "rafting":          AdventureIcon,
  "hiking":           AdventureIcon,
  "trekking":         AdventureIcon,
  "cycling":          AdventureIcon,
  "photography":      ToursIcon,
  "shopping":         ToursIcon,
  "transfers":        ToursIcon,
  "liburan":          BeachIcon,
}

/**
 * Keyword → icon fallback table.
 * Checked in order when no exact slug match is found.
 */
const KEYWORD_ICON_MAP: Array<[string, IconComponent]> = [
  ["temple",    TempleIcon],
  ["culture",   CultureIcon],
  ["beach",     BeachIcon],
  ["water",     WaterSportsIcon],
  ["snorkel",   WaterSportsIcon],
  ["dive",      WaterSportsIcon],
  ["surf",      WaterSportsIcon],
  ["adventure", AdventureIcon],
  ["trek",      AdventureIcon],
  ["hik",       AdventureIcon],
  ["raft",      AdventureIcon],
  ["climb",     AdventureIcon],
  ["nature",    NatureIcon],
  ["wildlife",  NatureIcon],
  ["waterfall", NatureIcon],
  ["forest",    NatureIcon],
  ["food",      FoodDrinkIcon],
  ["drink",     FoodDrinkIcon],
  ["culinary",  FoodDrinkIcon],
  ["cook",      FoodDrinkIcon],
  ["dinner",    FoodDrinkIcon],
  ["wellness",  WellnessIcon],
  ["spa",       WellnessIcon],
  ["yoga",      WellnessIcon],
  ["romant",    RomanceIcon],
  ["honeymoon", RomanceIcon],
  ["couple",    RomanceIcon],
  ["family",    FamilyIcon],
  ["kid",       FamilyIcon],
  ["child",     FamilyIcon],
  ["night",     NightlifeIcon],
  ["club",      NightlifeIcon],
  ["party",     NightlifeIcon],
  ["private",   PrivateToursIcon],
  ["luxury",    PrivateToursIcon],
  ["vip",       PrivateToursIcon],
  ["day-trip",  DayTripsIcon],
  ["day trip",  DayTripsIcon],
  ["full-day",  DayTripsIcon],
  ["tour",      ToursIcon],
]

/**
 * Resolves an icon for a category by slug.
 * 1. Exact match against CATEGORY_ICON_MAP
 * 2. Keyword-based fuzzy match against the slug
 * Returns null if no match found (caller should use a fallback like DotsIcon).
 */
export function getCategoryIcon(slug: string): IconComponent | null {
  if (CATEGORY_ICON_MAP[slug]) return CATEGORY_ICON_MAP[slug]

  // Fuzzy: check if slug contains a known keyword
  const lower = slug.toLowerCase()
  for (const [keyword, icon] of KEYWORD_ICON_MAP) {
    if (lower.includes(keyword)) return icon
  }

  return null
}
