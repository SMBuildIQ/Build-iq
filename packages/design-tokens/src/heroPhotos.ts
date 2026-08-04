/**
 * Full-bleed hero photography — editorial luxury residential & millwork.
 * Warm wood, custom cabinetry, finished homes (not stock construction/warehouse).
 *
 * Web apps load these from `/heroes/*.jpg` (apps/web/public/heroes).
 * Mobile maps the same filenames via require() in HeroBand.
 */
export type HeroTone =
  | "jobs"
  | "jobDetail"
  | "proposals"
  | "proposalDetail"
  | "shop"
  | "cart"
  | "track"
  | "orders"
  | "account"
  | "cabinetry"
  | "settings"
  | "login";

export const HERO_PHOTOS: Record<
  HeroTone,
  { file: string; path: string; alt: string }
> = {
  jobs: {
    file: "jobs-framing.jpg",
    path: "/heroes/jobs-framing.jpg",
    alt: "Modern residence with wood soffits and infinity pool",
  },
  jobDetail: {
    file: "job-blueprints.jpg",
    path: "/heroes/job-blueprints.jpg",
    alt: "Open-concept living with wood millwork wall and patio",
  },
  proposals: {
    file: "proposals-home.jpg",
    path: "/heroes/proposals-home.jpg",
    alt: "Contemporary home with horizontal wood siding",
  },
  proposalDetail: {
    file: "proposal-kitchen.jpg",
    path: "/heroes/proposal-kitchen.jpg",
    alt: "Oak cabinetry kitchen with marble waterfall island",
  },
  shop: {
    file: "shop-lumber.jpg",
    path: "/heroes/shop-lumber.jpg",
    alt: "Floor-to-ceiling wood millwork and fluted island",
  },
  cart: {
    file: "cart-windows.jpg",
    path: "/heroes/cart-windows.jpg",
    alt: "Dusk facade with vertical wood cladding and glass",
  },
  track: {
    file: "track-warehouse.jpg",
    path: "/heroes/track-warehouse.jpg",
    alt: "Bright living hall with open-tread wood staircase",
  },
  orders: {
    file: "orders-warehouse.jpg",
    path: "/heroes/orders-warehouse.jpg",
    alt: "Pool terrace with cedar siding and outdoor lounge",
  },
  account: {
    file: "account-tools.jpg",
    path: "/heroes/account-tools.jpg",
    alt: "Curated cane millwork sideboard in a designer living room",
  },
  cabinetry: {
    file: "cabinetry-kitchen.jpg",
    path: "/heroes/cabinetry-kitchen.jpg",
    alt: "Marble island kitchen with handleless cabinetry",
  },
  settings: {
    file: "settings-office.jpg",
    path: "/heroes/settings-office.jpg",
    alt: "Quiet studio corridor with integrated cabinetry",
  },
  login: {
    file: "login-lumber.jpg",
    path: "/heroes/login-lumber.jpg",
    alt: "Twilight entry with vertical timber cladding",
  },
};

export function heroPhoto(tone: HeroTone = "jobs") {
  return HERO_PHOTOS[tone];
}
