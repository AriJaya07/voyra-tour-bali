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
 * Primary slug → icon mapping.
 * Each slug gets ONE preferred icon.
 */
const SLUG_ICON_MAP: Record<string, IconComponent> = {
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
  "wildlife":         NatureIcon,
  "waterfall":        NatureIcon,
  "snorkeling":       WaterSportsIcon,
  "diving":           WaterSportsIcon,
  "surfing":          WaterSportsIcon,
  "rafting":          AdventureIcon,
  "hiking":           AdventureIcon,
  "trekking":         AdventureIcon,
  "cycling":          AdventureIcon,
  "liburan":          BeachIcon,
}

/**
 * Keyword fallback — checked when no exact slug match.
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
  ["nature",    NatureIcon],
  ["wildlife",  NatureIcon],
  ["forest",    NatureIcon],
  ["food",      FoodDrinkIcon],
  ["drink",     FoodDrinkIcon],
  ["culinary",  FoodDrinkIcon],
  ["wellness",  WellnessIcon],
  ["spa",       WellnessIcon],
  ["yoga",      WellnessIcon],
  ["romant",    RomanceIcon],
  ["honeymoon", RomanceIcon],
  ["family",    FamilyIcon],
  ["kid",       FamilyIcon],
  ["night",     NightlifeIcon],
  ["club",      NightlifeIcon],
  ["private",   PrivateToursIcon],
  ["luxury",    PrivateToursIcon],
  ["day-trip",  DayTripsIcon],
  ["full-day",  DayTripsIcon],
  ["tour",      ToursIcon],
]

/**
 * All 14 available icons — used as fallback pool for categories
 * that don't match any slug or keyword.
 */
const ALL_ICONS: IconComponent[] = [
  ToursIcon,
  PrivateToursIcon,
  CultureIcon,
  NatureIcon,
  BeachIcon,
  AdventureIcon,
  FoodDrinkIcon,
  DayTripsIcon,
  RomanceIcon,
  FamilyIcon,
  WellnessIcon,
  NightlifeIcon,
  TempleIcon,
  WaterSportsIcon,
]

function resolveIcon(slug: string): IconComponent | null {
  if (SLUG_ICON_MAP[slug]) return SLUG_ICON_MAP[slug]

  const lower = slug.toLowerCase()
  for (const [keyword, icon] of KEYWORD_ICON_MAP) {
    if (lower.includes(keyword)) return icon
  }

  return null
}

/**
 * Assigns unique icons to a list of category slugs.
 *
 * Rules:
 * 1. Each slug is resolved via exact match → keyword fallback
 * 2. If the resolved icon is already taken, it tries the next keyword match
 * 3. If all matches are taken (or no match), assigns from the unused icon pool
 * 4. Every category is guaranteed an icon — no nulls
 * 5. Icons are never duplicated across categories
 *
 * Call this ONCE with all your category slugs, then use the returned map.
 */
export function assignCategoryIcons(slugs: string[]): Map<string, IconComponent> {
  const result = new Map<string, IconComponent>()
  const usedIcons = new Set<IconComponent>()

  // Pass 1: assign best-match icons (exact slug or first keyword hit)
  for (const slug of slugs) {
    const icon = resolveIcon(slug)
    if (icon && !usedIcons.has(icon)) {
      result.set(slug, icon)
      usedIcons.add(icon)
    }
  }

  // Pass 2: for unassigned slugs, try all keyword matches for an unused icon
  for (const slug of slugs) {
    if (result.has(slug)) continue

    const lower = slug.toLowerCase()

    // Try exact first
    const exactIcon = SLUG_ICON_MAP[slug]
    if (exactIcon && !usedIcons.has(exactIcon)) {
      result.set(slug, exactIcon)
      usedIcons.add(exactIcon)
      continue
    }

    // Try all keyword matches
    let assigned = false
    for (const [keyword, icon] of KEYWORD_ICON_MAP) {
      if (lower.includes(keyword) && !usedIcons.has(icon)) {
        result.set(slug, icon)
        usedIcons.add(icon)
        assigned = true
        break
      }
    }
    if (assigned) continue

    // Fallback: pick first unused icon from the full pool
    for (const icon of ALL_ICONS) {
      if (!usedIcons.has(icon)) {
        result.set(slug, icon)
        usedIcons.add(icon)
        break
      }
    }
  }

  // Pass 3: if we somehow have more categories than icons (14+),
  // cycle through ALL_ICONS so every slug still gets something
  for (const slug of slugs) {
    if (!result.has(slug)) {
      const idx = slugs.indexOf(slug) % ALL_ICONS.length
      result.set(slug, ALL_ICONS[idx])
    }
  }

  return result
}

/**
 * Single-slug lookup (backward compat).
 * Use `assignCategoryIcons` for guaranteed uniqueness across categories.
 */
export function getCategoryIcon(slug: string): IconComponent | null {
  return resolveIcon(slug)
}
