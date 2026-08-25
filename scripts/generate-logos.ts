import fs from "fs";
import path from "path";
import sharp from "sharp";

// Generate the Official Oblivion Music Logo SVG (Emblem + Typography)
export function getOfficialLogoSvg(width = 512, height = 512, withBackground = true, withText = true): string {
  const bg = withBackground
    ? `<rect width="512" height="512" rx="96" fill="#151b22"/>
       <circle cx="256" cy="210" r="190" fill="url(#officialAura)" opacity="0.4"/>`
    : "";

  const textSection = withText
    ? `
    <!-- Typography -->
    <g transform="translate(256, 422)" text-anchor="middle">
      <text font-family="'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            font-size="44" 
            font-weight="700" 
            letter-spacing="5.5" 
            fill="#FFFFFF" 
            x="3">OBLIVION</text>
      <text font-family="'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            font-size="21" 
            font-weight="600" 
            letter-spacing="12" 
            fill="url(#goldGradLight)" 
            y="40" 
            x="6">MUSIC</text>
    </g>`
    : "";

  const emblemY = withText ? 0 : 46;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${width}" height="${height}" fill="none">
  <defs>
    <!-- Official Golden Gradients -->
    <linearGradient id="goldGrad1" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#dfbe7a" />
      <stop offset="35%" stop-color="#c5a059" />
      <stop offset="70%" stop-color="#9a7732" />
      <stop offset="100%" stop-color="#c5a059" />
    </linearGradient>

    <linearGradient id="goldGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8c6827" />
      <stop offset="30%" stop-color="#c5a059" />
      <stop offset="60%" stop-color="#ebd292" />
      <stop offset="100%" stop-color="#ab873c" />
    </linearGradient>

    <linearGradient id="goldGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#faecc5" />
      <stop offset="50%" stop-color="#dfbe7a" />
      <stop offset="100%" stop-color="#b89143" />
    </linearGradient>

    <linearGradient id="goldRingGrad" x1="10%" y1="10%" x2="90%" y2="90%">
      <stop offset="0%" stop-color="#ebd292" />
      <stop offset="30%" stop-color="#c5a059" />
      <stop offset="65%" stop-color="#836021" />
      <stop offset="85%" stop-color="#c5a059" />
      <stop offset="100%" stop-color="#ebd292" />
    </linearGradient>

    <!-- Bevel Highlights and Shadow Filters -->
    <filter id="dropShadowDark" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="-4" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.65" />
    </filter>

    <filter id="triangleShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="3" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.5" />
    </filter>

    <radialGradient id="officialAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c5a059" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#c5a059" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#151b22" stop-opacity="0" />
    </radialGradient>
  </defs>

  ${bg}

  <!-- Emblem Group -->
  <g transform="translate(0, ${emblemY})">
    <!-- 1. Background Circular Golden Ring -->
    <g>
      <!-- Circular Ring Path with depth -->
      <path d="M 256 68 
               A 142 142 0 1 0 380 280
               L 336 260
               A 96 96 0 1 1 256 114
               Z" 
            fill="url(#goldRingGrad)" 
            opacity="0.95" />
      
      <!-- Ring Inner Rim Highlight -->
      <path d="M 256 68 A 142 142 0 0 0 114 210 A 142 142 0 0 0 256 352" 
            stroke="url(#goldGradLight)" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            fill="none" 
            opacity="0.6" />
    </g>

    <!-- 2. Outer/Rear Triangular Wireframe (Layer 1) -->
    <g filter="url(#dropShadowDark)">
      <!-- Outer boundary: (170, 52) -> (414, 210) -> (170, 368) -->
      <!-- Inner cutout: (196, 96) -> (366, 210) -> (196, 324) -->
      <path d="M 170 52 
               L 414 210 
               L 170 368 
               Z
               M 196 98
               L 196 322
               L 364 210
               Z" 
            fill="url(#goldGrad1)" 
            fill-rule="evenodd" />

      <!-- Facet Bevel lines -->
      <line x1="170" y1="52" x2="196" y2="98" stroke="#faecc5" stroke-width="2" opacity="0.8" />
      <line x1="170" y1="368" x2="196" y2="322" stroke="#684a15" stroke-width="2" opacity="0.8" />
      <line x1="414" y1="210" x2="364" y2="210" stroke="#faecc5" stroke-width="2" opacity="0.7" />
    </g>

    <!-- 3. Front Overlapping Triangular Wireframe (Layer 2) -->
    <g filter="url(#triangleShadow)">
      <!-- Shifted slightly right for 3D prismatic overlap: (198, 52) -> (444, 210) -> (198, 368) -->
      <!-- Inner cutout: (224, 98) -> (394, 210) -> (224, 322) -->
      <path d="M 198 52 
               L 444 210 
               L 198 368 
               Z
               M 224 98
               L 224 322
               L 394 210
               Z" 
            fill="url(#goldGrad2)" 
            fill-rule="evenodd" />

      <!-- High-gloss facet highlights on front triangle -->
      <line x1="198" y1="52" x2="444" y2="210" stroke="#fff1d0" stroke-width="2.5" opacity="0.9" stroke-linecap="round" />
      <line x1="198" y1="52" x2="224" y2="98" stroke="#ffffff" stroke-width="2.5" opacity="0.9" />
      <line x1="198" y1="368" x2="224" y2="322" stroke="#52390e" stroke-width="2" opacity="0.8" />
    </g>

    <!-- 4. Overlap Shadow Accents on overlapping segments -->
    <polygon points="198,52 224,98 224,322 198,368" fill="#000000" opacity="0.3" />

    <!-- 5. Inner Core Play Button (Pure Crisp White) -->
    <g filter="url(#triangleShadow)">
      <polygon points="228,142 334,210 228,278" fill="#FFFFFF" />
      <!-- Subtle soft inner highlight on play edge -->
      <line x1="228" y1="142" x2="334" y2="210" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" />
    </g>
  </g>

  ${textSection}
</svg>`;
}

// Generate the standalone icon SVG (without background, centered in 512x512)
export function getOfficialIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <!-- Official Golden Gradients -->
    <linearGradient id="goldGrad1" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#dfbe7a" />
      <stop offset="35%" stop-color="#c5a059" />
      <stop offset="70%" stop-color="#9a7732" />
      <stop offset="100%" stop-color="#c5a059" />
    </linearGradient>

    <linearGradient id="goldGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8c6827" />
      <stop offset="30%" stop-color="#c5a059" />
      <stop offset="60%" stop-color="#ebd292" />
      <stop offset="100%" stop-color="#ab873c" />
    </linearGradient>

    <linearGradient id="goldGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#faecc5" />
      <stop offset="50%" stop-color="#dfbe7a" />
      <stop offset="100%" stop-color="#b89143" />
    </linearGradient>

    <linearGradient id="goldRingGrad" x1="10%" y1="10%" x2="90%" y2="90%">
      <stop offset="0%" stop-color="#ebd292" />
      <stop offset="30%" stop-color="#c5a059" />
      <stop offset="65%" stop-color="#836021" />
      <stop offset="85%" stop-color="#c5a059" />
      <stop offset="100%" stop-color="#ebd292" />
    </linearGradient>

    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="-2" dy="5" stdDeviation="5" flood-color="#000000" flood-opacity="0.6" />
    </filter>

    <filter id="innerPlayShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <g transform="translate(0, 46)">
    <!-- 1. Background Circular Golden Ring -->
    <g>
      <path d="M 256 68 
               A 142 142 0 1 0 380 280
               L 336 260
               A 96 96 0 1 1 256 114
               Z" 
            fill="url(#goldRingGrad)" 
            opacity="0.95" />
      <path d="M 256 68 A 142 142 0 0 0 114 210 A 142 142 0 0 0 256 352" 
            stroke="url(#goldGradLight)" 
            stroke-width="3" 
            stroke-linecap="round" 
            fill="none" 
            opacity="0.7" />
    </g>

    <!-- 2. Rear Triangular Wireframe -->
    <g filter="url(#iconShadow)">
      <path d="M 170 52 
               L 414 210 
               L 170 368 
               Z
               M 196 98
               L 196 322
               L 364 210
               Z" 
            fill="url(#goldGrad1)" 
            fill-rule="evenodd" />

      <line x1="170" y1="52" x2="196" y2="98" stroke="#faecc5" stroke-width="2" opacity="0.8" />
      <line x1="170" y1="368" x2="196" y2="322" stroke="#684a15" stroke-width="2" opacity="0.8" />
      <line x1="414" y1="210" x2="364" y2="210" stroke="#faecc5" stroke-width="2" opacity="0.7" />
    </g>

    <!-- 3. Front Overlapping Triangular Wireframe -->
    <g filter="url(#iconShadow)">
      <path d="M 198 52 
               L 444 210 
               L 198 368 
               Z
               M 224 98
               L 224 322
               L 394 210
               Z" 
            fill="url(#goldGrad2)" 
            fill-rule="evenodd" />

      <line x1="198" y1="52" x2="444" y2="210" stroke="#fff1d0" stroke-width="2.8" opacity="0.95" stroke-linecap="round" />
      <line x1="198" y1="52" x2="224" y2="98" stroke="#ffffff" stroke-width="2.5" opacity="0.9" />
      <line x1="198" y1="368" x2="224" y2="322" stroke="#52390e" stroke-width="2" opacity="0.8" />
    </g>

    <!-- 4. Depth shadow on overlap -->
    <polygon points="198,52 224,98 224,322 198,368" fill="#000000" opacity="0.32" />

    <!-- 5. Inner Core Play Button -->
    <g filter="url(#innerPlayShadow)">
      <polygon points="228,142 334,210 228,278" fill="#FFFFFF" />
      <line x1="228" y1="142" x2="334" y2="210" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" />
    </g>
  </g>
</svg>`;
}

async function buildAssets() {
  const publicDir = path.join(process.cwd(), "public");

  // 1. Write favicon.svg
  const faviconSvg = getOfficialIconSvg();
  fs.writeFileSync(path.join(publicDir, "favicon.svg"), faviconSvg);
  console.log("Created public/favicon.svg");

  // 2. Render official App Icon with Background (for PWA, Android, iOS)
  const fullAppIconSvg = getOfficialLogoSvg(512, 512, true, true);
  fs.writeFileSync(path.join(publicDir, "oblivion-logo.svg"), fullAppIconSvg);

  const emblemOnlyAppIconSvg = getOfficialLogoSvg(512, 512, true, false);

  // 3. Render 192x192 and 512x512 PNGs using sharp
  const emblemBuffer = Buffer.from(emblemOnlyAppIconSvg);
  await sharp(emblemBuffer).resize(192, 192).png().toFile(path.join(publicDir, "icon-192.png"));
  console.log("Created public/icon-192.png");

  await sharp(emblemBuffer).resize(512, 512).png().toFile(path.join(publicDir, "icon-512.png"));
  console.log("Created public/icon-512.png");

  const fullLogoBuffer = Buffer.from(fullAppIconSvg);
  await sharp(fullLogoBuffer).resize(512, 512).png().toFile(path.join(publicDir, "oblivion-logo.png"));
  console.log("Created public/oblivion-logo.png");
}

buildAssets().catch(console.error);
