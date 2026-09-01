import React, { useEffect, useRef } from "react";

// The 16 distinct sweet SVG sprite definitions strictly matching the 16 illustrations in sweets.jpg
export const SWEET_SPRITES: { id: string; name: string; svg: string }[] = [
  {
    // 1. Soft-serve ice cream cone (chocolate & vanilla twist on waffle cone)
    id: "soft-serve",
    name: "Soft-serve ice cream cone",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Waffle Cone with cross-hatch texture -->
      <path d="M28 64 L72 64 L53 124 C51.5 128 48.5 128 47 124 Z" fill="#E8B074" stroke="#4A2810" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Cone waffle grid pattern -->
      <path d="M34 74 L66 106 M39 67 L68 96 M30 84 L60 114 M66 74 L34 106 M61 67 L32 96 M70 84 L40 114" stroke="#C98845" stroke-width="1.8" stroke-linecap="round"/>
      <!-- Cone Rim -->
      <rect x="25" y="60" width="50" height="9" rx="4.5" fill="#F4C690" stroke="#4A2810" stroke-width="2.5"/>
      <!-- Soft-Serve Vanilla & Chocolate Swirl Layers -->
      <!-- Chocolate Upper Swirl Top -->
      <path d="M26 60 C20 54 22 42 34 38 C32 30 38 20 48 18 C46 10 52 4 60 6 C68 8 67 18 64 22 C74 24 77 34 73 42 C81 46 79 56 73 60 Z" fill="#54301B" stroke="#381D0D" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Vanilla Swirl Ribbon -->
      <path d="M30 58 C24 48 30 40 40 38 C44 28 54 20 62 18 C58 12 60 8 63 8 C67 10 65 20 59 26 C68 28 71 36 67 44 C75 48 71 56 65 58 Z" fill="#FFFDF8"/>
      <!-- Chocolate Gloss & Swirl Dividers -->
      <path d="M34 50 C44 53 58 48 68 52" stroke="#784729" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M38 36 C48 38 56 32 64 36" stroke="#784729" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M48 20 C52 14 56 12 59 14" stroke="#FFFDF8" stroke-width="2" stroke-linecap="round"/>
      <circle cx="44" cy="28" r="2" fill="#FFFFFF"/>
    </svg>`,
  },
  {
    // 2. Swirl lollipop (rainbow swirl lollipop on white stick)
    id: "swirl-lollipop",
    name: "Swirl lollipop",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- White Stick -->
      <path d="M48 62 L66 124" stroke="#4A3B32" stroke-width="6" stroke-linecap="round"/>
      <path d="M48 62 L66 124" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M49 63 L67 125" stroke="#E2DCD5" stroke-width="1" stroke-linecap="round"/>
      <!-- Lollipop Outer Disc -->
      <circle cx="44" cy="42" r="32" fill="#FF8DA1" stroke="#3D281E" stroke-width="2.8"/>
      <!-- Rainbow Swirl Bands -->
      <path d="M44 42 M44 10 A32 32 0 0 1 76 42 A32 32 0 0 1 44 74 A32 32 0 0 1 12 42 A32 32 0 0 1 44 10" fill="#FF758F"/>
      <path d="M44 42 C44 24 62 24 62 42 C62 60 26 60 26 42 C26 16 70 16 70 42 C70 72 18 72 18 42" stroke="#70D6FF" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M44 42 C36 42 36 34 44 34 C57 34 57 51 44 51 C22 51 22 25 44 25" stroke="#FFD166" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M44 42 C48 42 48 38 44 38 C38 38 38 46 44 46" stroke="#06D6A0" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M44 42 C41 42 43 45 44 45" stroke="#C77DFF" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Gloss Highlight -->
      <path d="M24 28 C30 18 42 15 50 16" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="56" cy="19" r="2" fill="#FFFFFF"/>
    </svg>`,
  },
  {
    // 3. Wrapped chocolate bar (exposed 6-block chocolate bar in open silver foil)
    id: "chocolate-bar",
    name: "Wrapped chocolate bar",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Exposed Dark Milk Chocolate -->
      <rect x="24" y="14" width="52" height="48" rx="2" fill="#6B3A2A" stroke="#3D1E0E" stroke-width="2.5"/>
      <!-- 6 Chocolate Blocks (2 cols x 3 rows) -->
      <rect x="29" y="19" width="19" height="11" rx="1.5" fill="#824835" stroke="#4D2616" stroke-width="1.5"/>
      <rect x="52" y="19" width="19" height="11" rx="1.5" fill="#824835" stroke="#4D2616" stroke-width="1.5"/>
      <rect x="29" y="33" width="19" height="11" rx="1.5" fill="#824835" stroke="#4D2616" stroke-width="1.5"/>
      <rect x="52" y="33" width="19" height="11" rx="1.5" fill="#824835" stroke="#4D2616" stroke-width="1.5"/>
      <rect x="29" y="47" width="19" height="11" rx="1.5" fill="#824835" stroke="#4D2616" stroke-width="1.5"/>
      <rect x="52" y="47" width="19" height="11" rx="1.5" fill="#824835" stroke="#4D2616" stroke-width="1.5"/>
      <!-- Chocolate Block Highlights -->
      <path d="M31 21 L45 21 M54 21 L68 21 M31 35 L45 35 M54 35 L68 35" stroke="#9E5D46" stroke-width="1" stroke-linecap="round"/>
      <!-- Inner Silver Foil (Crinkled Open) -->
      <path d="M20 54 L34 46 L46 56 L62 44 L79 52 L80 118 L20 118 Z" fill="#E8EEF5" stroke="#3D281E" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Outer Silver Wrapper Body -->
      <path d="M22 62 L36 54 L50 64 L66 52 L78 60 L78 118 L22 118 Z" fill="#D3DDE8" stroke="#3D281E" stroke-width="2.5"/>
      <!-- Serrated Zigzag Bottom -->
      <path d="M22 118 L26 123 L30 118 L34 123 L38 118 L42 123 L46 118 L50 123 L54 118 L58 123 L62 118 L66 123 L70 118 L74 123 L78 118" fill="#D3DDE8" stroke="#3D281E" stroke-width="2" stroke-linejoin="round"/>
      <!-- Foil Highlights -->
      <path d="M26 66 L34 58 L46 68" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    // 4. Candy cane with red bow (classic red & white striped candy cane with red ribbon)
    id: "candy-cane-red",
    name: "Candy cane with red bow",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Cane Hook Path -->
      <path d="M66 122 L66 42 C66 22 55 12 39 12 C23 12 15 24 15 39 L15 47" stroke="#3D281E" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M66 122 L66 42 C66 22 55 12 39 12 C23 12 15 24 15 39 L15 47" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Diagonal Red Stripes -->
      <path d="M60 110 L72 117 M60 95 L72 102 M60 80 L72 87 M60 65 L72 72 M60 50 L72 57" stroke="#E63946" stroke-width="5" stroke-linecap="round"/>
      <path d="M56 28 L66 38 M41 14 L47 24 M26 14 L32 24 M11 34 L21 40" stroke="#E63946" stroke-width="5" stroke-linecap="round"/>
      <!-- Red Ribbon Bow -->
      <!-- Left Loop -->
      <path d="M50 68 C34 54 28 73 48 76 Z" fill="#E63946" stroke="#3D281E" stroke-width="2.2"/>
      <path d="M40 66 C37 68 37 72 44 73" stroke="#FF758F" stroke-width="1.8"/>
      <!-- Right Loop -->
      <path d="M64 68 C80 54 86 73 66 76 Z" fill="#E63946" stroke="#3D281E" stroke-width="2.2"/>
      <path d="M74 66 C77 68 77 72 70 73" stroke="#FF758F" stroke-width="1.8"/>
      <!-- Ribbon Tails -->
      <path d="M51 76 L42 96 L52 92 L57 96 L55 76 Z" fill="#C1121F" stroke="#3D281E" stroke-width="2" stroke-linejoin="round"/>
      <path d="M63 76 L72 96 L62 92 L57 96 L59 76 Z" fill="#C1121F" stroke="#3D281E" stroke-width="2" stroke-linejoin="round"/>
      <!-- Center Knot -->
      <ellipse cx="57" cy="72" rx="6" ry="5" fill="#E63946" stroke="#3D281E" stroke-width="2.2"/>
      <circle cx="55" cy="70" r="1.5" fill="#FF758F"/>
    </svg>`,
  },
  {
    // 5. Pastel wrapped candy (tilted candy with twisted wrapper ends)
    id: "pastel-wrapped-candy",
    name: "Pastel wrapped candy",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-28 50 65)">
        <!-- Left Wrapper Twist -->
        <path d="M22 65 L6 46 C7 56 11 64 7 72 C11 76 9 84 6 84 L22 65 Z" fill="#FFB3C6" stroke="#3D281E" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M9 54 L19 62 M9 76 L19 68" stroke="#FF758F" stroke-width="2"/>
        <!-- Right Wrapper Twist -->
        <path d="M78 65 L94 46 C93 56 89 64 93 72 C89 76 91 84 94 84 L78 65 Z" fill="#FFB3C6" stroke="#3D281E" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M91 54 L81 62 M91 76 L81 68" stroke="#FF758F" stroke-width="2"/>
        <!-- Oval Candy Body -->
        <rect x="20" y="42" width="60" height="46" rx="23" fill="#FFF0F5" stroke="#3D281E" stroke-width="2.8"/>
        <!-- Pastel Diagonal Stripes -->
        <path d="M34 43 C38 48 42 62 36 87" stroke="#FF70A6" stroke-width="7" stroke-linecap="round"/>
        <path d="M48 42 C52 50 56 65 50 88" stroke="#FFD166" stroke-width="7" stroke-linecap="round"/>
        <path d="M62 43 C66 50 70 65 64 87" stroke="#70D6FF" stroke-width="7" stroke-linecap="round"/>
        <path d="M72 48 C76 56 78 68 74 82" stroke="#C77DFF" stroke-width="5" stroke-linecap="round"/>
        <!-- Gloss Shine -->
        <path d="M29 50 Q49 44 68 50" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="33" cy="53" r="2" fill="#FFFFFF"/>
      </g>
    </svg>`,
  },
  {
    // 6. Cotton candy stick (blue and pink fluffy cloud on striped paper cone)
    id: "cotton-candy",
    name: "Cotton candy stick",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Striped Paper Cone Stick -->
      <path d="M46 76 L43 125 L57 125 L54 76 Z" fill="#FFFFFF" stroke="#3D281E" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M45 88 L55 94 M44 102 L56 108 M43 116 L57 122" stroke="#E63946" stroke-width="2.5"/>
      <!-- Left Blue Cloud Lobes -->
      <circle cx="40" cy="38" r="20" fill="#A2D2FF" stroke="#3D281E" stroke-width="2.8"/>
      <circle cx="34" cy="56" r="17" fill="#A2D2FF" stroke="#3D281E" stroke-width="2.8"/>
      <circle cx="48" cy="26" r="18" fill="#BDE0FE" stroke="#3D281E" stroke-width="2.8"/>
      <!-- Right Pink Cloud Lobes -->
      <circle cx="62" cy="40" r="20" fill="#FFC8DD" stroke="#3D281E" stroke-width="2.8"/>
      <circle cx="60" cy="58" r="17" fill="#FFAFCC" stroke="#3D281E" stroke-width="2.8"/>
      <circle cx="48" cy="66" r="17" fill="#FFC8DD" stroke="#3D281E" stroke-width="2.8"/>
      <!-- Cloud Highlights -->
      <path d="M30 34 C33 28 42 24 48 26" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <path d="M60 34 C66 31 72 36 72 43" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <circle cx="38" cy="58" r="2" fill="#FFFFFF"/>
    </svg>`,
  },
  {
    // 7. Ice cream sundae bowl (3 scoops: strawberry, vanilla, chocolate, cherry on top, spoon)
    id: "sundae-bowl",
    name: "Ice cream sundae bowl",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Pedestal Foot & Stem -->
      <ellipse cx="50" cy="118" rx="20" ry="5" fill="#E4F1F7" stroke="#3D281E" stroke-width="2.5"/>
      <path d="M46 96 L46 116 L54 116 L54 96 Z" fill="#E4F1F7" stroke="#3D281E" stroke-width="2.5"/>
      <!-- Glass Bowl Body -->
      <path d="M22 68 Q18 96 50 97 Q82 96 78 68 Z" fill="#D2E8F3" stroke="#3D281E" stroke-width="2.8"/>
      <!-- Silver Spoon -->
      <path d="M68 62 L83 34 C86 28 92 32 89 38 L77 68 Z" fill="#D3DDE8" stroke="#3D281E" stroke-width="2.2"/>
      <!-- 3 Scoops -->
      <!-- Left Scoop (Strawberry Pink) -->
      <circle cx="34" cy="58" r="15" fill="#FF8DA1" stroke="#3D281E" stroke-width="2.5"/>
      <!-- Strawberry on Left Scoop -->
      <path d="M23 48 C21 40 29 36 33 42 C35 46 29 54 25 52 Z" fill="#E63946" stroke="#3D281E" stroke-width="1.8"/>
      <path d="M27 38 L25 34 M29 38 L31 34" stroke="#2B9348" stroke-width="2" stroke-linecap="round"/>
      <!-- Right Scoop (Chocolate Brown) -->
      <circle cx="66" cy="58" r="15" fill="#6B4423" stroke="#3D281E" stroke-width="2.5"/>
      <!-- Center Scoop (Vanilla Cream) -->
      <circle cx="50" cy="52" r="16" fill="#FFF7DC" stroke="#3D281E" stroke-width="2.5"/>
      <!-- Whipped Cream Dollop & Cherry on Top -->
      <path d="M42 42 C40 34 48 30 50 26 C52 30 60 34 58 42 Z" fill="#FFFFFF" stroke="#3D281E" stroke-width="2.2"/>
      <circle cx="50" cy="25" r="6.5" fill="#D90429" stroke="#3D281E" stroke-width="2.2"/>
      <circle cx="48" cy="23" r="1.5" fill="#FFFFFF"/>
      <path d="M52 20 C56 12 65 14 68 10" stroke="#3D281E" stroke-width="2" stroke-linecap="round"/>
      <!-- Glass Bowl Reflection -->
      <path d="M28 75 Q26 88 40 92" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>
    </svg>`,
  },
  {
    // 8. Gumball machine (vintage red gumball machine with clear globe and colorful gumballs)
    id: "gumball-machine",
    name: "Gumball machine",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Top Red Dome Cap & Ball Finial -->
      <path d="M38 18 C38 12 62 12 62 18 Z" fill="#E63946" stroke="#3D281E" stroke-width="2.5"/>
      <circle cx="50" cy="10" r="4" fill="#E63946" stroke="#3D281E" stroke-width="2.2"/>
      <!-- Clear Glass Globe -->
      <circle cx="50" cy="48" r="30" fill="#EBF4F8" stroke="#3D281E" stroke-width="3"/>
      <!-- Colorful Gumballs -->
      <circle cx="42" cy="40" r="5.5" fill="#FF70A6" stroke="#3D281E" stroke-width="1.5"/>
      <circle cx="56" cy="38" r="5.5" fill="#70D6FF" stroke="#3D281E" stroke-width="1.5"/>
      <circle cx="48" cy="48" r="5.5" fill="#FFD166" stroke="#3D281E" stroke-width="1.5"/>
      <circle cx="36" cy="52" r="5.5" fill="#06D6A0" stroke="#3D281E" stroke-width="1.5"/>
      <circle cx="62" cy="50" r="5.5" fill="#9D4EDD" stroke="#3D281E" stroke-width="1.5"/>
      <circle cx="45" cy="62" r="5.5" fill="#FF9E00" stroke="#3D281E" stroke-width="1.5"/>
      <circle cx="58" cy="62" r="5.5" fill="#EF476F" stroke="#3D281E" stroke-width="1.5"/>
      <circle cx="32" cy="42" r="5" fill="#118AB2" stroke="#3D281E" stroke-width="1.5"/>
      <!-- Glass Arc Reflection -->
      <path d="M28 34 C34 24 45 22 55 22" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <!-- Red Metallic Base -->
      <path d="M30 76 L24 118 L76 118 L70 76 Z" fill="#E63946" stroke="#3D281E" stroke-width="2.8" stroke-linejoin="round"/>
      <rect x="20" y="116" width="60" height="8" rx="4" fill="#C1121F" stroke="#3D281E" stroke-width="2.5"/>
      <!-- Silver Turn Crank Mechanism -->
      <rect x="40" y="84" width="20" height="17" rx="3" fill="#D3DDE8" stroke="#3D281E" stroke-width="2.2"/>
      <circle cx="50" cy="91" r="3" fill="#3D281E"/>
      <rect x="45" y="90" width="10" height="2" fill="#FFFFFF"/>
      <!-- Dispenser Flap Chute -->
      <path d="M44 105 L56 105 L54 113 L46 113 Z" fill="#333333" stroke="#3D281E" stroke-width="1.8"/>
    </svg>`,
  },
  {
    // 9. Pink sprinkled donut (ring donut with pink glaze and multi-color sprinkles)
    id: "sprinkled-donut",
    name: "Pink sprinkled donut",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Golden Brown Donut Dough Ring -->
      <circle cx="50" cy="65" r="40" fill="#E9C46A" stroke="#3D281E" stroke-width="3"/>
      <circle cx="50" cy="65" r="38" fill="#F4A261"/>
      <!-- Strawberry Pink Frosting with Curvy Edge -->
      <path d="M50 27 C62 27 75 30 83 42 C90 52 88 68 83 78 C78 86 65 93 50 93 C35 93 22 86 17 76 C12 66 10 52 18 42 C26 30 38 27 50 27 Z" fill="#FF85A1" stroke="#3D281E" stroke-width="2.8"/>
      <!-- Donut Hole -->
      <circle cx="50" cy="65" r="16" fill="#F4A261" stroke="#3D281E" stroke-width="3"/>
      <circle cx="50" cy="65" r="14" fill="#FFFFFF"/>
      <!-- Multi-color oblong sprinkles -->
      <rect x="30" y="38" width="8" height="3" rx="1.5" transform="rotate(25 30 38)" fill="#FFFFFF"/>
      <rect x="62" y="36" width="8" height="3" rx="1.5" transform="rotate(-30 62 36)" fill="#70D6FF"/>
      <rect x="74" y="55" width="8" height="3" rx="1.5" transform="rotate(45 74 55)" fill="#FFD166"/>
      <rect x="68" y="75" width="8" height="3" rx="1.5" transform="rotate(15 68 75)" fill="#06D6A0"/>
      <rect x="42" y="84" width="8" height="3" rx="1.5" transform="rotate(-40 42 84)" fill="#FFFFFF"/>
      <rect x="25" y="68" width="8" height="3" rx="1.5" transform="rotate(60 25 68)" fill="#9D4EDD"/>
      <rect x="26" y="52" width="8" height="3" rx="1.5" transform="rotate(-15 26 52)" fill="#FFD166"/>
      <rect x="45" y="32" width="8" height="3" rx="1.5" transform="rotate(10 45 32)" fill="#06D6A0"/>
      <rect x="54" y="82" width="8" height="3" rx="1.5" transform="rotate(80 54 82)" fill="#70D6FF"/>
      <!-- Frosting Highlight -->
      <path d="M30 35 C38 30 52 29 60 31" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    // 10. Strawberry cake slice (layer shortcake slice with strawberries inside and on top)
    id: "strawberry-cake",
    name: "Strawberry cake slice",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Cake Sponge Body -->
      <path d="M15 80 L85 52 L85 96 L15 116 Z" fill="#FDE2BD" stroke="#3D281E" stroke-width="2.8" stroke-linejoin="round"/>
      <!-- White Top Frosting -->
      <path d="M15 80 L60 38 L85 52 L15 80 Z" fill="#FFFFFF" stroke="#3D281E" stroke-width="2.8" stroke-linejoin="round"/>
      <!-- Middle Cream Filling Band -->
      <path d="M15 95 L85 70 L85 78 L15 103 Z" fill="#FFF0F5"/>
      <!-- 4 Strawberry Slices in Cream Layer -->
      <path d="M24 99 C24 93 32 93 32 99 Z" fill="#E63946" stroke="#3D281E" stroke-width="1.5"/>
      <path d="M42 92 C42 86 50 86 50 92 Z" fill="#E63946" stroke="#3D281E" stroke-width="1.5"/>
      <path d="M60 86 C60 80 68 80 68 86 Z" fill="#E63946" stroke="#3D281E" stroke-width="1.5"/>
      <path d="M74 80 C74 74 82 74 82 80 Z" fill="#E63946" stroke="#3D281E" stroke-width="1.5"/>
      <!-- Whipped Cream Dollop at Back -->
      <path d="M65 42 C62 34 72 28 75 24 C78 28 85 34 80 42 Z" fill="#FFFFFF" stroke="#3D281E" stroke-width="2"/>
      <!-- Two Whole Strawberries on Top -->
      <path d="M35 60 C30 45 45 40 52 50 C55 58 45 68 38 65 Z" fill="#E63946" stroke="#3D281E" stroke-width="2.2"/>
      <path d="M52 52 C48 38 62 34 68 44 C72 52 62 62 55 58 Z" fill="#E63946" stroke="#3D281E" stroke-width="2.2"/>
      <!-- Strawberry Green Leaves -->
      <path d="M42 46 L38 42 M44 48 L44 40 M46 47 L50 42" stroke="#2B9348" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M58 40 L54 36 M60 42 L60 34 M62 41 L66 36" stroke="#2B9348" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="42" cy="54" r="0.8" fill="#FFD166"/>
      <circle cx="46" cy="58" r="0.8" fill="#FFD166"/>
      <circle cx="58" cy="48" r="0.8" fill="#FFD166"/>
    </svg>`,
  },
  {
    // 11. Chocolate chip cookie (golden baked round cookie with chocolate chips)
    id: "chocolate-cookie",
    name: "Chocolate chip cookie",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Cookie Base -->
      <path d="M50 25 C68 24 82 35 85 50 C88 66 84 82 72 90 C60 98 38 98 26 90 C14 82 12 65 15 50 C18 35 32 25 50 25 Z" fill="#DDA15E" stroke="#3D281E" stroke-width="3"/>
      <path d="M48 28 C64 27 78 37 80 50 C82 64 78 78 68 85 C58 92 38 92 28 85 C18 78 16 64 18 50 C20 37 32 28 48 28 Z" fill="#E9C46A" opacity="0.6"/>
      <!-- Dark Chocolate Chips & Morsels -->
      <path d="M38 42 C42 38 48 40 46 46 C44 50 38 50 36 46 Z" fill="#3D1E0E" stroke="#2B1509" stroke-width="1.8"/>
      <circle cx="40" cy="42" r="1" fill="#7F4F24"/>
      <path d="M60 40 C66 38 70 44 66 48 C62 52 58 48 58 44 Z" fill="#3D1E0E" stroke="#2B1509" stroke-width="1.8"/>
      <circle cx="62" cy="42" r="1" fill="#7F4F24"/>
      <path d="M46 60 C54 56 58 64 54 70 C50 74 42 72 42 66 Z" fill="#3D1E0E" stroke="#2B1509" stroke-width="1.8"/>
      <circle cx="48" cy="62" r="1.5" fill="#7F4F24"/>
      <path d="M26 62 C30 58 36 60 34 66 C32 70 26 70 24 66 Z" fill="#3D1E0E" stroke="#2B1509" stroke-width="1.8"/>
      <path d="M68 64 C74 62 76 70 72 74 C68 76 64 72 66 66 Z" fill="#3D1E0E" stroke="#2B1509" stroke-width="1.8"/>
      <path d="M36 78 C40 76 44 80 42 84 C40 88 34 86 34 82 Z" fill="#3D1E0E" stroke="#2B1509" stroke-width="1.8"/>
      <path d="M56 80 C62 78 65 84 62 88 C58 90 54 86 54 82 Z" fill="#3D1E0E" stroke="#2B1509" stroke-width="1.8"/>
      <circle cx="50" cy="35" r="1.5" fill="#3D1E0E"/>
      <circle cx="30" cy="48" r="1.2" fill="#3D1E0E"/>
      <circle cx="72" cy="52" r="1.2" fill="#3D1E0E"/>
    </svg>`,
  },
  {
    // 12. Rainbow popsicle (striped ice pop with pink, yellow, blue, purple on wooden stick)
    id: "rainbow-popsicle",
    name: "Rainbow popsicle",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Wooden Craft Stick -->
      <rect x="44" y="85" width="12" height="38" rx="6" fill="#E8B074" stroke="#3D281E" stroke-width="2.5"/>
      <!-- Rainbow Layered Ice Pop -->
      <path d="M26 40 C26 22 74 22 74 40 L74 95 L26 95 Z" fill="#FF70A6" stroke="#3D281E" stroke-width="2.8" stroke-linejoin="round"/>
      <!-- 4 Horizontal Rainbow Flavor Layers -->
      <path d="M26 40 C26 22 74 22 74 40 L74 48 L26 48 Z" fill="#FF758F"/>
      <rect x="26" y="48" width="48" height="15" fill="#FFD166"/>
      <rect x="26" y="63" width="48" height="16" fill="#70D6FF"/>
      <rect x="26" y="79" width="48" height="16" fill="#C77DFF"/>
      <!-- Vertical Grooves -->
      <path d="M38 32 L38 90 M50 26 L50 90 M62 32 L62 90" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round"/>
      <!-- Pop Gloss Highlight -->
      <path d="M30 35 C32 26 40 25 45 25" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="46" r="2" fill="#FFFFFF"/>
    </svg>`,
  },
  {
    // 13. Boba tea cup (iced milk tea cup with boba pearls at bottom and striped straw)
    id: "boba-tea",
    name: "Boba tea cup",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Diagonal Striped Straw -->
      <path d="M56 10 L44 55" stroke="#3D281E" stroke-width="7" stroke-linecap="round"/>
      <path d="M56 10 L44 55" stroke="#70D6FF" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M54 18 L50 22 M50 30 L46 34" stroke="#FFFFFF" stroke-width="2"/>
      <!-- Plastic Cup Outline -->
      <path d="M24 38 L32 115 C33 120 67 120 68 115 L76 38 Z" fill="#EBF4F8" stroke="#3D281E" stroke-width="2.8" stroke-linejoin="round"/>
      <!-- Milk Tea Drink Body -->
      <path d="M26 48 L32 114 C33 118 67 118 68 114 L74 48 Z" fill="#DDB892"/>
      <path d="M26 48 Q50 54 74 48" stroke="#B08968" stroke-width="2.5" fill="#DDB892"/>
      <!-- Transparent Floating Ice Cubes -->
      <rect x="34" y="54" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.6" stroke="#3D281E" stroke-width="1.2"/>
      <rect x="52" y="58" width="14" height="14" rx="2" fill="#FFFFFF" opacity="0.6" stroke="#3D281E" stroke-width="1.2"/>
      <!-- Dark Boba Pearls at Bottom -->
      <circle cx="38" cy="106" r="4.5" fill="#22150E" stroke="#120A06" stroke-width="1.2"/>
      <circle cx="50" cy="108" r="4.5" fill="#22150E" stroke="#120A06" stroke-width="1.2"/>
      <circle cx="62" cy="106" r="4.5" fill="#22150E" stroke="#120A06" stroke-width="1.2"/>
      <circle cx="44" cy="98" r="4.5" fill="#22150E" stroke="#120A06" stroke-width="1.2"/>
      <circle cx="56" cy="98" r="4.5" fill="#22150E" stroke="#120A06" stroke-width="1.2"/>
      <circle cx="36" cy="92" r="4" fill="#22150E" stroke="#120A06" stroke-width="1.2"/>
      <circle cx="64" cy="92" r="4" fill="#22150E" stroke="#120A06" stroke-width="1.2"/>
      <circle cx="36" cy="104" r="1" fill="#FFFFFF"/>
      <circle cx="48" cy="106" r="1" fill="#FFFFFF"/>
      <circle cx="60" cy="104" r="1" fill="#FFFFFF"/>
      <!-- Domed Lid & Cup Rim -->
      <path d="M20 38 L80 38" stroke="#3D281E" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M25 38 C25 26 75 26 75 38" fill="#EBF4F8" stroke="#3D281E" stroke-width="2.2"/>
      <path d="M30 52 L36 108" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>
    </svg>`,
  },
  {
    // 14. Sprinkled muffin (golden domed muffin with sprinkles in lilac cupcake liner)
    id: "sprinkled-muffin",
    name: "Sprinkled muffin",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Pleated Lilac Cupcake Liner -->
      <path d="M28 72 L36 120 L64 120 L72 72 Z" fill="#D8B4E2" stroke="#3D281E" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M35 74 L41 118 M44 74 L47 118 M53 74 L53 118 M62 74 L59 118" stroke="#BF8FD4" stroke-width="2"/>
      <circle cx="41" cy="95" r="2" fill="#FF8DA1"/>
      <circle cx="53" cy="105" r="2" fill="#70D6FF"/>
      <circle cx="59" cy="90" r="2" fill="#FFD166"/>
      <!-- Domed Golden Muffin Top -->
      <path d="M20 72 C14 62 20 42 38 38 C42 28 58 28 62 38 C80 42 86 62 80 72 C75 78 25 78 20 72 Z" fill="#E9C46A" stroke="#3D281E" stroke-width="3" stroke-linejoin="round"/>
      <path d="M24 68 C22 55 28 45 42 42 C48 36 56 36 60 42 C72 45 78 55 76 68 Z" fill="#F4A261" opacity="0.7"/>
      <!-- Multi-color Sprinkles on Crust -->
      <rect x="34" y="48" width="6" height="2.5" rx="1.2" transform="rotate(30 34 48)" fill="#06D6A0"/>
      <rect x="48" y="42" width="6" height="2.5" rx="1.2" transform="rotate(-20 48 42)" fill="#FF70A6"/>
      <rect x="62" y="46" width="6" height="2.5" rx="1.2" transform="rotate(45 62 46)" fill="#70D6FF"/>
      <rect x="40" y="58" width="6" height="2.5" rx="1.2" transform="rotate(-15 40 58)" fill="#FFD166"/>
      <rect x="54" y="56" width="6" height="2.5" rx="1.2" transform="rotate(60 54 56)" fill="#9D4EDD"/>
      <rect x="68" y="60" width="6" height="2.5" rx="1.2" transform="rotate(-35 68 60)" fill="#EF476F"/>
      <rect x="28" y="60" width="6" height="2.5" rx="1.2" transform="rotate(10 28 60)" fill="#70D6FF"/>
      <path d="M34 44 C40 38 52 38 58 40" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    // 15. Ice cream float glass ("Coke" float with dark cola, ice cream on top, straw)
    id: "ice-cream-float",
    name: "Ice cream float glass (\"Coke\")",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Red & White Striped Soda Straw -->
      <path d="M68 8 L54 48" stroke="#3D281E" stroke-width="6" stroke-linecap="round"/>
      <path d="M68 8 L54 48" stroke="#E63946" stroke-width="4" stroke-linecap="round"/>
      <path d="M66 14 L62 18 M60 26 L56 30" stroke="#FFFFFF" stroke-width="2"/>
      <!-- Glass Fountain Goblet Body -->
      <path d="M30 42 L34 115 C35 122 65 122 66 115 L70 42 Z" fill="#EBF4F8" stroke="#3D281E" stroke-width="2.8" stroke-linejoin="round"/>
      <!-- Dark Cola Soda -->
      <path d="M31 52 L34 114 C35 120 65 120 66 114 L69 52 Z" fill="#281406"/>
      <!-- "Coke" Typography on Glass -->
      <text x="50" y="86" text-anchor="middle" fill="#FFFFFF" font-family="'Brush Script MT', 'Segoe Script', cursive, sans-serif" font-weight="bold" font-size="12" letter-spacing="0.5">Coke</text>
      <!-- Vanilla Ice Cream Scoop Melting Over Rim -->
      <circle cx="50" cy="38" r="18" fill="#FFF8EE" stroke="#3D281E" stroke-width="2.8"/>
      <!-- Melting Foamy Ice Cream Froth -->
      <path d="M28 48 C32 42 42 42 46 48 C50 42 60 42 64 48 C68 44 74 46 72 52 C65 56 35 56 28 48 Z" fill="#FFF2DA" stroke="#3D281E" stroke-width="2"/>
      <path d="M34 52 C36 60 40 60 42 52" fill="#FFF8EE" stroke="#3D281E" stroke-width="1.8"/>
      <path d="M58 52 C60 62 64 62 66 52" fill="#FFF8EE" stroke="#3D281E" stroke-width="1.8"/>
      <!-- Glass Shine -->
      <path d="M34 60 L37 105" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>
    </svg>`,
  },
  {
    // 16. Green striped candy cane with bow (mint green striped candy cane with green bow)
    id: "candy-cane-green",
    name: "Green striped candy cane with bow",
    svg: `<svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Cane Hook Path -->
      <path d="M66 122 L66 42 C66 22 55 12 39 12 C23 12 15 24 15 39 L15 47" stroke="#3D281E" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M66 122 L66 42 C66 22 55 12 39 12 C23 12 15 24 15 39 L15 47" stroke="#E9F5DB" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Diagonal Green Stripes -->
      <path d="M60 110 L72 117 M60 95 L72 102 M60 80 L72 87 M60 65 L72 72 M60 50 L72 57" stroke="#52B788" stroke-width="5" stroke-linecap="round"/>
      <path d="M56 28 L66 38 M41 14 L47 24 M26 14 L32 24 M11 34 L21 40" stroke="#52B788" stroke-width="5" stroke-linecap="round"/>
      <!-- Green Ribbon Bow -->
      <!-- Left Loop -->
      <path d="M50 68 C34 54 28 73 48 76 Z" fill="#52B788" stroke="#3D281E" stroke-width="2.2"/>
      <path d="M40 66 C37 68 37 72 44 73" stroke="#95D5B2" stroke-width="1.8"/>
      <!-- Right Loop -->
      <path d="M64 68 C80 54 86 73 66 76 Z" fill="#52B788" stroke="#3D281E" stroke-width="2.2"/>
      <path d="M74 66 C77 68 77 72 70 73" stroke="#95D5B2" stroke-width="1.8"/>
      <!-- Ribbon Tails -->
      <path d="M51 76 L42 96 L52 92 L57 96 L55 76 Z" fill="#2D6A4F" stroke="#3D281E" stroke-width="2" stroke-linejoin="round"/>
      <path d="M63 76 L72 96 L62 92 L57 96 L59 76 Z" fill="#2D6A4F" stroke="#3D281E" stroke-width="2" stroke-linejoin="round"/>
      <!-- Center Knot -->
      <ellipse cx="57" cy="72" rx="6" ry="5" fill="#52B788" stroke="#3D281E" stroke-width="2.2"/>
      <circle cx="55" cy="70" r="1.5" fill="#D8F3DC"/>
    </svg>`,
  },
];

// Pre-instantiate and cache all 16 sweet images immediately at module scope
const PRELOADED_SWEET_IMAGES: HTMLImageElement[] = [];
if (typeof window !== "undefined") {
  SWEET_SPRITES.forEach((sprite) => {
    const img = new Image();
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(sprite.svg)}`;
    PRELOADED_SWEET_IMAGES.push(img);
  });
}

interface FallingSweet {
  id: number;
  spriteIndex: number;
  x: number;
  y: number;
  vx: number; // Horizontal velocity (px/sec) for realistic momentum and bouncing
  size: number;
  speed: number; // Vertical baseline velocity (px/sec)
  rotation: number; // Degrees (0-360)
  rotationSpeed: number; // Degrees/sec (increased by ~10-20%)
  scale: number; // Scale variance (0.8x to 1.2x)
  swayPhase: number; // Fallback sine wave phase
  swayFrequency: number;
  swayAmplitude: number;
}

interface CandylandFallingSweetsProps {
  isActive: boolean;
}

export const CandylandFallingSweets: React.FC<CandylandFallingSweetsProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Physics state refs
  const sweetsPoolRef = useRef<FallingSweet[]>([]);
  const tiltAngleRef = useRef<number>(0); // Current low-pass filtered roll (gamma degrees)
  const targetTiltAngleRef = useRef<number>(0); // Raw target tilt from deviceorientation
  const lastTimeRef = useRef<number>(0);

  // Theme activation & lifecycle management
  useEffect(() => {
    if (!isActive) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth || document.documentElement.clientWidth || 800;
    let height = window.innerHeight || document.documentElement.clientHeight || 600;

    const syncCanvasSize = () => {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth || document.documentElement.clientWidth || 800;
      height = window.innerHeight || document.documentElement.clientHeight || 600;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();
    window.addEventListener("resize", syncCanvasSize);

    // Device orientation handler for phone roll tilt with reduced sensitivity
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.gamma !== undefined) {
        // Clamp gamma angle to [-45, 45] range and scale down sensitivity by ~50%
        const clampedGamma = Math.max(-45, Math.min(45, e.gamma));
        targetTiltAngleRef.current = clampedGamma * 0.5;
      }
    };

    let orientationListenerAttached = false;
    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      try {
        window.addEventListener("deviceorientation", handleDeviceOrientation, true);
        orientationListenerAttached = true;
      } catch {}
    }

    // Helper to spawn a new sweet with randomized properties & scale variance (0.8x to 1.2x)
    const createSweet = (
      id: number,
      startY?: number,
      randomX?: number
    ): FallingSweet => {
      const spriteIdx = Math.floor(Math.random() * SWEET_SPRITES.length);
      const scale = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x scale variance
      const baseSize = 58; // Base pixel size for crisp visibility
      const size = baseSize * scale;
      const radius = size / 2;
      const fallDuration = 9 + Math.random() * 7; // 9s to 16s duration to traverse screen
      const speed = height / fallDuration; // px/sec

      // Increased angular rotation speed (~10-20% faster and dynamic)
      const spinDirection = Math.random() < 0.5 ? -1 : 1;
      const rotationSpeed = spinDirection * (30 + Math.random() * 36); // 30 to 66 deg/sec

      // Spawn with spread-out distance above top boundary or staggered vertically on screen
      const spawnY = startY !== undefined ? startY : -size - Math.random() * 220 - 40;
      const spawnX =
        randomX !== undefined
          ? Math.max(radius + 10, Math.min(width - radius - 10, randomX))
          : radius + 10 + Math.random() * Math.max(20, width - size - 20);

      return {
        id,
        spriteIndex: spriteIdx,
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.5) * 20,
        size,
        speed,
        rotation: Math.random() * 360,
        rotationSpeed,
        scale,
        swayPhase: Math.random() * Math.PI * 2,
        swayFrequency: 0.6 + Math.random() * 0.6,
        swayAmplitude: 14 + Math.random() * 18,
      };
    };

    // Strict Screen Density Guard: Strictly between 5 and 7 sweets at any given time (ACTIVE_POPULATION = 6)
    const ACTIVE_POPULATION = 6;
    const initialPool: FallingSweet[] = [];
    for (let i = 0; i < ACTIVE_POPULATION; i++) {
      // Stagger vertical positions on initial load across the entire viewport height so sweets fall immediately
      const initialY = (height / ACTIVE_POPULATION) * i + (Math.random() * 60 - 30);
      initialPool.push(createSweet(i, initialY));
    }
    sweetsPoolRef.current = initialPool;
    lastTimeRef.current = performance.now();

    // Physics Animation Loop
    const renderLoop = (time: number) => {
      if (!ctx || !canvas) return;

      const deltaMs = Math.min(100, time - (lastTimeRef.current || time));
      const deltaSec = deltaMs / 1000;
      lastTimeRef.current = time;

      // Low-pass filter / smooth linear interpolation (lerp) on orientation input to prevent sudden twitching
      const lerpFactor = 0.045;
      tiltAngleRef.current += (targetTiltAngleRef.current - tiltAngleRef.current) * lerpFactor;

      // Controlled lateral drift velocity from device tilt
      const targetDriftSpeed = Math.sin((tiltAngleRef.current * Math.PI) / 180) * 80; // px/sec

      // Clear previous canvas frame
      ctx.clearRect(0, 0, width, height);

      const pool = sweetsPoolRef.current;
      for (let i = 0; i < pool.length; i++) {
        const sweet = pool[i];
        const radius = sweet.size / 2;

        // 1. Vertical motion
        sweet.y += sweet.speed * deltaSec;

        // 2. Horizontal trajectory with gentle gyro drift and sway
        const sway = Math.sin(time * 0.001 * sweet.swayFrequency + sweet.swayPhase) * sweet.swayAmplitude;
        sweet.vx += (targetDriftSpeed - sweet.vx) * 0.06;
        sweet.x += (sweet.vx + sway) * deltaSec;

        // 3. Side-Wall Bounce Collision Physics (Elastic reflection on left & right borders)
        const restitution = 0.75; // Elastic bounce coefficient
        if (sweet.x - radius <= 0) {
          sweet.x = radius;
          sweet.vx = Math.abs(sweet.vx) * restitution + 18; // Bounce toward center
          sweet.rotationSpeed = -sweet.rotationSpeed * 0.85 + (Math.random() * 20 - 10);
        } else if (sweet.x + radius >= width) {
          sweet.x = width - radius;
          sweet.vx = -Math.abs(sweet.vx) * restitution - 18; // Bounce toward center
          sweet.rotationSpeed = -sweet.rotationSpeed * 0.85 + (Math.random() * 20 - 10);
        }

        // 4. Angular Rotation
        sweet.rotation = (sweet.rotation + sweet.rotationSpeed * deltaSec) % 360;

        // 5. Bottom Exit Only: Sweets ONLY despawn when passing below bottom viewport boundary
        if (sweet.y > height + sweet.size + 20) {
          // Instantly recycle & re-enter above top boundary with spread-out distance & new graphic
          const newSpawnX = radius + 10 + Math.random() * Math.max(20, width - sweet.size - 20);
          const spreadY = -sweet.size - Math.random() * 200 - 30;
          pool[i] = createSweet(sweet.id, spreadY, newSpawnX);
          continue;
        }

        // 6. Draw Sweet Sprite with soft shadow
        const img = PRELOADED_SWEET_IMAGES[sweet.spriteIndex];
        if (img) {
          ctx.save();
          ctx.translate(sweet.x, sweet.y);
          ctx.rotate((sweet.rotation * Math.PI) / 180);

          // Subtle candy drop shadow
          ctx.shadowColor = "rgba(107, 45, 95, 0.15)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 4;

          const renderSize = sweet.size;
          ctx.drawImage(img, -renderSize / 2, -renderSize / 2, renderSize, renderSize);

          ctx.restore();
        }
      }

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    animationFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      window.removeEventListener("resize", syncCanvasSize);
      if (orientationListenerAttached) {
        window.removeEventListener("deviceorientation", handleDeviceOrientation, true);
      }
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      id="candyland-physics-canvas"
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden select-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
};
