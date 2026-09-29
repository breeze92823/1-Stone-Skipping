# Lobby Landmarks

The names to use when asking for changes to the lobby world. Each entry
gives the landmark's position, the data constant that places it in
[src/data/world.js](src/data/world.js), and the component that draws it.

**Coordinates:** metres. **+X = east**, **+Z = south**, **Y = up**. The
default camera faces **north**, toward the waterfall. Positions are
`(x, z)` ground centres.

```
                         NORTH (z = -50)
        ┌────────────── North Cliffs + Waterfall ──────────────┐
        │   ≈Moat≈ [Leaderboard Courtyard] ≈Moat≈             │
        │   Admin Board ┌──[Pet]──────┐                      │
  West  │ 50x══╗        │Uncommon Rare│              +1  +75  │  East
 Cliffs │ 15x══╣        │Common Rainbw│ Claim Chest  +3  +200 │ Cliffs
 x=-46  │ 20x══╣  grass └───┐neck┌────┘          Ph  +5  +500 │ x=42
        │ 10x══╣        ┌───┘    └───── east branch ►+12 +1.25K│
        │  4x══╣◄west───│  ●spawn   │   grass        +30 +3.5K │
        │  1x══╝ grass  └──┐chev┌──┘  World 2 Portal           │
        │                  │road│    Hacked Egg                │
        └══════════════ THROW ZONE (z = 17–20.5) ══════════════┘
          Lake Banks ▒▒│    The Lake (canal)    │▒▒ Lake Banks
                       │           ↓ south      │
                       │ Palm Beach sign ~250 m │
                       │ Cactus Desert ~565 m   │
                       │ Autumn Woods  ~931 m   │
                       │ Frost Lake   ~1330 m   │
                       │ Mushroom Marsh ~1782 m │
                       │ Candy Banks   ~2239 m  │
                       │ Crystal Valley ~2768 m │
                       │ Ember River   ~3281 m  │
                       │ Starfall Shores ~3906 m│
```

---

## Plaza & paths

| Name | What it is | Where | Data | Component |
|---|---|---|---|---|
| **Spawn** | Where the player starts, facing north toward the Egg Plaza | (6, 1) | `SPAWN`, `SPAWN_FACING` | [main.jsx](src/main.jsx) |
| **Egg Plaza** | One solid gray rectangle holding the eggs and the Featured Pet | x -4…18, z -24…-10 | `PATHS[2]` | [Ground.jsx](src/components/Ground.jsx) |
| **Neck** | Short, narrow stretch of road out of the plaza's south edge | x 3…9, z -10…-6 | `PATHS[3]` | Ground.jsx |
| **Spawn Section** | Where the road widens around spawn; the east and west branches leave from here | x 0…11, z -6…7 | `PATHS[4]` | Ground.jsx |
| **West Branch** | Thin path from the Spawn Section west to the Pool Walkway | x -6…0, z 2…4.7 | `PATHS[5]` | Ground.jsx |
| **West Grass Patch** | Grass between the road and the pools, north and south of the West Branch | x -6…0 / 3 | (gap between paths) | Ground.jsx |
| **East Grass Patch** | Grass between the road and the stone yard; holds the Claim Chest, portal and Hacked Admin Egg | x 9…22 | (gap between paths) | Ground.jsx |
| **Pool Block** | One gray frame under all six pools; the strips showing between pools are part of it | x -37…-6, z -34…14 | `PATHS[0]` | Ground.jsx |
| **Pool Walkway** | Gray strip along the east ends of the pools | x -13…-6, z -35…14 | `PATHS[1]` | Ground.jsx |
| **Chevron Road** | Narrow road straight south from the Spawn Section to the Throw Zone, with dark chevrons every 3 m; grass right up to both edges | x 3…9, z 7…17 | `PATHS[7]`, `CHEVRON_X` | Ground.jsx (`Chevrons`) |
| **East Branch** (Yard Path) | Path from the Spawn Section east to the stone grid, passing south of the Claim Chest | x 9…24, z -3.5…2 | `PATHS[6]` | Ground.jsx |
| **Moat Strip** | Gray strip along the Egg Plaza's north edge, between it and the Moat; the Admin Board stands on it | x -4…28, z -27…-24 | `PATHS[8]` | Ground.jsx |
| **Grass** | Two-tone checkered grass under everything | whole floor | `CHECKER` (square size) | Ground.jsx |
| **Guide Arrows** | Tutorial arrows crawling from the player to the 1x pool | dynamic | `GUIDE_TARGET` | [GuideArrows.jsx](src/components/GuideArrows.jsx) |

Every gray path is one rectangle in `PATHS`, drawn in a two-tone gray
checker (`PALETTE.path` / `PALETTE.path2`) with a darker border.
Overlapping rectangles merge into the blocky outline, and everything
between them is grass. The central road runs **Egg Plaza → Neck → Spawn
Section → Chevron Road → Throw Zone**.

## Training Pools (west side)

These run south to north, packed side by side `POOL_PITCH` (7.5 m) apart
on the Pool Block, all `POOL_W` (6.5 m) wide. The 1x pool is at
`FIRST_POOL_Z` (z = 9), just north of the throw zone. All six line up at
their east ends and get longer going north. Each pool's **Platform** (where you stand to
throw) is at its east end, facing the Pool Walkway. The floating label
above it shows the **Pool Label** (the rebirth or Robux price,
LOCKED/UNLOCKED, and "Nx SKILL"). All pools are drawn by
[Pools.jsx](src/components/Pools.jsx) and listed in `POOLS`. The look of
each theme is in `THEMES` in that file.

| Name | Multiplier | Unlock | Center z | Length | Theme / look |
|---|---|---|---|---|---|
| **1x Pool** (`p1`) | 1x | 0 rebirths (unlocked) | 9 | 11 | `lake`: sandy pond, wooden dock, rocks |
| **4x Pool** (`p4`) | 4x | 3 rebirths | 1.5 | 14 | `teal` |
| **10x Pool** (`p10`) | 10x | 5 rebirths | -6 | 17 | `purple`, with purple crystals on the rim |
| **20x Pool** (`p20`) | 20x | 7 rebirths | -13.5 | 19 | `ice`: cream rim, blue platform |
| **15x Pool** (`p15`) | 15x | R$110 "ALL WORLDS" | -21 | 21 | `gold` |
| **50x Pool** (`p50`) | 50x | R$255 "ALL WORLDS" | -28.5 | 23 | `neon`: black, green glow, circuit water |

Settings shared by every pool: `POOL_EAST_X` (east edge, -12),
`POOL_RIM`, `POOL_RIM_TOP`, `POOL_WATER_Y`, `POOL_PLATFORM`.

**Gameplay:** in an unlocked pool (only the 1x for now, since you start
with 0 rebirths), each skip gives skill × the pool's multiplier. Each
stone that lands in the pool also gives 1 XP toward the next level. Locked
pools let stones skip but give nothing. The rules are in
[stoneActions.js](src/systems/stoneActions.js) and `isPoolUnlocked`.

## Egg Plaza & rewards (north-centre)

The eggs sit inside the **Egg Plaza**. The Featured Pet is at the back
centre, Uncommon and Rare are either side of it, and Common and Rainbow
are at the front corners.

| Name | What it is | Where | Data | Component |
|---|---|---|---|---|
| **Common Egg** | White egg on a blue pedestal, 50 Wins; front-left corner | (-2, -13.2) | `EGGS[0]` | [EggArea.jsx](src/components/EggArea.jsx) |
| **Uncommon Egg** | Green egg, 500 Wins; left of the pet | (0.8, -18) | `EGGS[1]` | EggArea.jsx |
| **Featured Pet** | Cowboy-hat pup on a red/gold pedestal, "BEST IN GAME", golden aura | (7, -20.5) | `FEATURED_PET` | EggArea.jsx (`FeaturedPet`) |
| **Rare Egg** | Blue egg, 4K Wins; right of the pet | (13.2, -18) | `EGGS[2]` | EggArea.jsx |
| **Rainbow Egg** | Rainbow egg on a pink pedestal, R$30; front-right corner | (15.6, -13.2) | `EGGS[3]` | EggArea.jsx |
| **Claim Chest** | Red/gold chest on a glowing yellow disc, "CLAIM", on the grass just south-east of the Egg Plaza | (21.5, -7.5) | `CLAIM_CHEST` | EggArea.jsx (`ClaimChest`) |
| **Admin Board** | Wooden "ADMIN ABUSE" billboard with a live countdown, behind the Featured Pet at the front-left of the Moat | (1.5, -26) | `ADMIN_BOARD` | [Leaderboards.jsx](src/components/Leaderboards.jsx) (`AdminBoard`) |

## Leaderboard area (north)

The four boards enclose a square courtyard on three sides: two along the
back, and one on each side wall facing inward. The courtyard is an island
in a moat, entered by a bridge from the south.

| Name | What it is | Where | Data | Component |
|---|---|---|---|---|
| **Leaderboard Courtyard** | Square island floor, two-tone gray checker, one step (0.4 m) up | x 0…18, z -46…-31 | `LEADER_COURT` | Leaderboards.jsx |
| **Courtyard Bridge** | Gray walkway over the moat's south arm, from the Egg Plaza into the courtyard | x 5.5…12.5, z -31…-24 | `LEADER_BRIDGE` | Leaderboards.jsx |
| **Moat** | Shallow cyan water around the courtyard, lined with light blue-gray stone blocks and lily pads. You can wade through it; stones skip on it | x -4…22, z -49.5…-27 | `LEADER_MOAT`, `LEADER_MOAT_WATERS` | Leaderboards.jsx (`Moat`) |
| **Moat Blocks** | The stone blocks along the moat's outer banks and at the courtyard corners | around the moat | `buildMoatRocks()` | Leaderboards.jsx |
| **Top Level Board** | West side wall, facing east into the courtyard | (1.3, -38.5) | `LEADERBOARDS[0]` | Leaderboards.jsx (`Leaderboard`) |
| **Top Time Played Board** | Back wall, left | (5.3, -45.2) | `LEADERBOARDS[1]` | Leaderboards.jsx |
| **Top Skills Board** | Back wall, right | (12.7, -45.2) | `LEADERBOARDS[2]` | Leaderboards.jsx |
| **Top Wins Board** | East side wall, facing west into the courtyard | (16.7, -38.5) | `LEADERBOARDS[3]` | Leaderboards.jsx |
| **Board Titles** | Each board's name painted flat along its top (not a floating label), shrunk to fit the board | on each board | `TitleSign` | Leaderboards.jsx |
| **Waterfall** | Wide glowing blue fall down the north cliff behind both back boards, splashing into the Moat | x -0.5…18.5, z -49.4 | `WATERFALL` | Leaderboards.jsx (`Waterfall`) |

Every board has a dark brown roof beam with grass on top and bushes at its
feet. Player names and scores are placeholder data (`NAMES`, `statValue`)
in Leaderboards.jsx.

## East yard

The **Skill Stones Yard** is the gray area at x 22…39, z -24…5
(`PATHS[9–10]`), backed against the east cliff directly behind the Claim
Chest. The stones form a **Stone Grid** of 2 rows × 5, each on its own
raised **Stone Tile** (size `SKILL_TILE`). Rows run north → south at the
z values in `STONE_ROW_Z`.

- **Near Row** (x = 31, `NEAR_ROW_X`) holds the cheap stones.
- **Far Row** (x = 35.5, `FAR_ROW_X`) holds the expensive ones. Its labels
  float higher (`highLabel`) so the two rows' labels don't overlap.

All the stones are listed in `SKILL_STONES` and drawn by
[SkillStones.jsx](src/components/SkillStones.jsx).

| Name | Row | Model | Wins needed | Where |
|---|---|---|---|---|
| **+1 Skill Stone** (unlocked) | Near | Gray pebble | 0 | (31, -12.5) |
| **+3 Skill Stone** (unlocked) | Near | Scallop seashell | 2 | (31, -9) |
| **+5 Skill Stone** | Near | Beige spiral shell | 10 | (31, -5.5) |
| **+12 Skill Stone** | Near | Orange starfish | 40 | (31, -2) |
| **+30 Skill Stone** | Near | Wooden disc | 150 | (31, 1.5) |
| **+75 Skill Stone** | Far | Orange arrowhead | 500 | (35.5, -12.5) |
| **+200 Skill Stone** | Far | Teal disc | 1.5K | (35.5, -9) |
| **+500 Skill Stone** | Far | Gold ring | 4.5K | (35.5, -5.5) |
| **+1.25K Skill Stone** | Far | Obsidian | 14K | (35.5, -2) |
| **+3.5K Skill Stone** | Far | Salmon coral ring | 40K | (35.5, 1.5) |
| **Phoenix Relic** | n/a | Gold wings and red gem on a red/gold pedestal, R$279; on the path directly in front of +5 | n/a | (26.5, -5.5), `PHOENIX_RELIC` |

## South: Portal, Throw Zone & Lake

| Name | What it is | Where | Data | Component |
|---|---|---|---|---|
| **World 2 Portal** | Octagonal pirate portal with a skull and lanterns, blue swirl, green dashed pad; stands on the grass east of the Chevron Road, faces spawn | (15.5, 9.5) | `PORTAL` | [Portal.jsx](src/components/Portal.jsx) (`WorldPortal`) |
| **Hacked Admin Egg** | Black egg with green cracks, floating shards, R$100; on the grass east of the Chevron Road, just north of the throw zone | (12.5, 14) | `HACKED_EGG` | Portal.jsx (`HackedAdminEgg`) |
| **Throw Zone** | Yellow strip at the lake's edge, running the full width just south of the 1x Pool. "THROW ZONE" is painted on it, centred on the Chevron Road and reading correctly as you walk up to it | x -44…40, z 17…20.5 | `THROW_ZONE` | Ground.jsx (`ThrowZone`) |
| **The Lake** | A long, straight canal of flat, bright cyan water (golden in Autumn Woods, icy pale blue in Frost Lake, teal-green in Mushroom Marsh, pink in Candy Banks, violet in Crystal Valley, glowing orange in Ember River, indigo in Starfall Shores) running south from the throw zone through Palm Beach, Cactus Desert, Autumn Woods, Frost Lake, Mushroom Marsh, Candy Banks, Crystal Valley, Ember River and Starfall Shores to the End Beach and its giant portal. It's narrower than the throw zone strip and centred on the Chevron Road. Each skip here earns 1 win; walking in respawns you at Spawn | x -22…34, z 20.5…4520 | `LAKE`, `WATER_Y` | [Water.jsx](src/components/Water.jsx) |
| **Lake Shallows** | Pale cyan strip along both edges of the canal where the water meets the banks | canal edges | n/a | [LakeBanks.jsx](src/components/LakeBanks.jsx) |
| **Lake Banks** | Low terraced banks lining both sides of the canal: 3 tiers (1.2 m, 3.7 m, 6.2 m high), each 8 m wide. Grass tops with brown faces in Palm Beach, sand-checker in Cactus Desert, orange-checker in Autumn Woods, snow-white and ice-blue in Frost Lake, dark green checker in Mushroom Marsh, pink checker in Candy Banks, purple checker in Crystal Valley, canyon-red checker in Ember River, indigo checker in Starfall Shores. They start at the throw zone and run past the far end | either side of the canal | `LAKE_BANK` | LakeBanks.jsx |
| **Bank Scatter** | Palm Beach: gray rocks, green bushes and grass tufts, with palm trees near its sign. Cactus Desert: cacti, sandstone pillars and sandy rocks. Autumn Woods: orange/yellow/red autumn trees, pumpkins, leaf piles and rocks. Frost Lake: snow-covered pines, ice crystals and snow mounds. Mushroom Marsh: giant red and purple mushrooms, reeds and bushes. Candy Banks: lollipops, layer cakes, candy canes and gumdrops. Crystal Valley: glowing crystal clusters, geodes, rune stones and rocks. Ember River: red mesas, dead trees, lava rocks and cacti. Starfall Shores: floating stars, crescent moons, ringed planets and meteorites | on the banks | `buildBankDecor()` | LakeBanks.jsx |
| **Palm Beach** | First lake zone: Grass banks with rocks, bushes and palms. The lake's opening stretch, starting right at the throw zone. Its name sign hangs over the water where the zone starts | z 20.5…586, sign at 22.5 | `LAKE_ZONES[0]` | LakeBanks.jsx (`ZONE_THEMES.palm`, `PalmTree`) |
| **Cactus Desert** | Second lake zone: Orange sand-checker banks with cacti and sandstone pillars. Its name sign hangs over the water where the zone starts | z 586…952, sign at 588 | `LAKE_ZONES[1]` | LakeBanks.jsx (`ZONE_THEMES.desert`, `Cactus`, `Pillar`) |
| **Autumn Woods** | Third lake zone: Golden water and shallows, orange-checker banks with autumn trees and pumpkins. Its name sign hangs over the water where the zone starts | z 952…1320, sign at 954 | `LAKE_ZONES[2]` | LakeBanks.jsx (`ZONE_THEMES.autumn`, `AutumnTree`, `Pumpkin`; water colour in Water.jsx) |
| **Frost Lake** | Fourth lake zone: Icy pale-blue water, snow-white banks with snow pines and ice crystals. Its name sign hangs over the water where the zone starts | z 1320…1770, sign at 1322 | `LAKE_ZONES[3]` | LakeBanks.jsx (`ZONE_THEMES.frost`, `SnowPine`, `IceCrystal`) |
| **Mushroom Marsh** | Fifth lake zone: Teal-green water, green checker banks with giant spotted mushrooms and reeds. Its name sign hangs over the water where the zone starts | z 1770…2220, sign at 1772 | `LAKE_ZONES[4]` | LakeBanks.jsx (`ZONE_THEMES.marsh`, `Mushroom`, `Reeds`) |
| **Candy Banks** | Sixth lake zone: Pink water, pink checker banks with lollipops, layer cakes, candy canes and gumdrops. Its name sign hangs over the water where the zone starts | z 2220…2760, sign at 2222 | `LAKE_ZONES[5]` | LakeBanks.jsx (`ZONE_THEMES.candy`, `Lollipop`, `CandyCane`, `Cake`) |
| **Crystal Valley** | Seventh lake zone: Violet water, purple checker banks with glowing crystal clusters, geodes and rune stones. Its name sign hangs over the water where the zone starts | z 2760…3270, sign at 2762 | `LAKE_ZONES[6]` | LakeBanks.jsx (`ZONE_THEMES.crystal`, `Crystal`, `Geode`, `RuneStone`) |
| **Ember River** | Eighth lake zone: Glowing orange water, canyon-red checker banks with red mesas, dead trees, lava rocks and cacti. Its name sign hangs over the water where the zone starts | z 3270…3900, sign at 3272 | `LAKE_ZONES[7]` | LakeBanks.jsx (`ZONE_THEMES.ember`, `Mesa`, `DeadTree`, `LavaRock`) |
| **Starfall Shores** | Ninth lake zone: Indigo water, indigo checker banks with floating stars, crescent moons, ringed planets and meteorites. Its name sign hangs over the water where the zone starts | z 3900…4520, sign at 3902 | `LAKE_ZONES[8]` | LakeBanks.jsx (`ZONE_THEMES.starfall`, `Star`, `Moon`, `Planet`, `Meteor`) |
| **End Beach** | Sandy strip across the canal's far end, lined with the last zone's props (crescent moons), with a pale blue light wall rising behind it. It's the goal at the end of a long throw | x -22…34, z 4520…4534 | `LAKE_END` | LakeBanks.jsx |
| **Lake End Portal** | Giant pirate portal (the World 2 portal model, 5x size) standing on the End Beach facing back up the canal, with a "REQUIRES ⚡ 100M" label above it. Visual only for now: no gate or teleport | x 6, z 4525 | `LAKE_PORTAL` | [Portal.jsx](src/components/Portal.jsx) (`WorldPortal`) |

## Surroundings & scatter

| Name | What it is | Data | Component |
|---|---|---|---|
| **West / North / East Cliffs** | 3-tier checkered brick terraces around the lobby. The side walls stop at the throw zone; the Lake Banks take over south of it | `BOUNDS`, sizes at the top of the file | [Cliffs.jsx](src/components/Cliffs.jsx) |
| **Cliff-top Trees** | Trees placed randomly on the first cliff tier | seeded random | Cliffs.jsx |
| **Lobby Trees** | 12 blocky trees, including one either side of the Moat, one between the Rainbow Egg and the yard, and one on the grass east of the World 2 Portal | `TREES` | [Trees.jsx](src/components/Trees.jsx) |
| **Decor** | Grass tufts, red/pink flowers, blue mushrooms on open grass | seeded random | [Decor.jsx](src/components/Decor.jsx) |
| **Sky** | Pale blue gradient dome | `SKY` colours | [App.jsx](src/App.jsx), [Sky.jsx](src/components/Sky.jsx) |

## HUD (screen overlay)

All HUD elements are in [Hud.jsx](src/components/Hud.jsx) and styled in
[index.css](src/index.css).

| Name | What it is |
|---|---|
| **Quest Banner** | Yellow "TUTORIAL / REACH LEVEL 20 (x/20)" bar at the top |
| **Top Bar** | Round menu, chat and settings buttons (top-left); calendar and quests buttons (top-right) |
| **Skill Counter** | "⚡ 107 SKILL" above the level bar, left |
| **Multiplier** | "x1 Multiplier" above the level bar, right |
| **Level Bar** | Blue studded progress bar, "Level 11 … 7 / 10" |
| **Boost Buttons** | +10K (yellow), +100K (red), +1M (rainbow), with Robux price badges |
| **Side Stats** | Rebirths, Wins (trophy), and "Friend Boost +0%" (bottom-left) |

## Shared building blocks

- **Lego material:** `legoMaterial()` in [lego.js](src/materials/lego.js)
  gives any surface the checker and stud look. `PALETTE` holds the shared
  colours (grass, dirt, path, wood, leaf, stone).
- **Floating labels:** `<Label>` in [Label.jsx](src/components/Label.jsx),
  drawn by [labelCanvas.js](src/utils/labelCanvas.js). Supports outlined
  text, gradients, `'rainbow'` fills, pills, and trophy/robux/rebirth/bolt
  icons.
- **Walkable heights and water:** [terrainHeight.js](src/systems/terrainHeight.js).
  If you move a landmark that changes the floor height (a pool, the
  courtyard, the moat), its floor updates automatically, because
  terrainHeight.js reads the same world.js data.
- **Collision:** `COLLIDERS` in world.js, one circle per solid prop.

To add another lake zone: append to `LAKE_ZONES` (with its `water`/`shallows` colours), set its `startZ` (where its sign hangs), raise `LAKE.maxZ`, and add a matching entry to `ZONE_THEMES` in LakeBanks.jsx.

## Asking for changes

Use the bold names above, for example:

- "Make the **Waterfall** wider" → `WATERFALL`
- "Move the **Claim Chest** closer to the **Rainbow Egg**" → `CLAIM_CHEST`
- "Unlock the **4x Pool**" → `POOLS` / `isPoolUnlocked`
- "Add a tree next to the **Moat**" → `TREES`
- "Change the **Quest Banner** text" → Hud.jsx

For live testing in dev mode, use the browser console:
`__game.teleport(x, y, z)` moves the player to a landmark, and
`__game.setView({ yaw, pitch, distance })` aims the camera.
`__game.stones` lists the stones in flight, and `__game.store.getState()`
shows skill, level and wins.
