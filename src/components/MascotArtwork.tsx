import React from 'react';

interface MascotArtworkProps {
  variant: 'hero' | 'head' | 'card' | 'full';
  className?: string;
}

export const MascotArtwork: React.FC<MascotArtworkProps> = ({ variant, className = '' }) => {
  if (variant === 'head') {
    return (
      <div className={`relative flex items-center justify-center bg-[#67cdcc] overflow-hidden select-none ${className}`}>
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Turquoise base */}
          <rect width="120" height="120" fill="#67cdcc" />
          {/* Yellow speed slash behind head */}
          <polygon points="0,95 120,20 120,42 0,115" fill="#f6cf3f" opacity="0.85" />

          {/* Left Cat Ear */}
          <polygon points="18,40 24,7 48,32" fill="#121318" stroke="#0b0c10" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="22,36 25,12 31,33" fill="#f6cf3f" opacity="0.9" />

          {/* Right Cat Ear */}
          <polygon points="102,32 95,5 72,27" fill="#121318" stroke="#0b0c10" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="94,29 92,10 83,26" fill="#f6cf3f" opacity="0.9" />

          {/* 3D Cube Head Main Face */}
          <polygon
            points="15,34 103,26 107,95 20,101"
            fill="#17171d"
            stroke="#090a0d"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Cube Bottom Depth Plane */}
          <polygon points="20,101 107,95 96,107 30,111" fill="#0b0c10" />

          {/* Gold Rim Highlights on Cube Edges */}
          <polygon points="17,36 42,33 22,43 19,96 16,96" fill="#f6cf3f" opacity="0.9" />
          <polygon points="101,28 105,92 101,92 98,32" fill="#f6cf3f" opacity="0.9" />
          <polygon points="22,98 104,92 104,95 22,101" fill="#f6cf3f" opacity="0.8" />

          {/* Glossy Diagonal Reflections */}
          <polygon points="44,33 56,32 34,72 26,72" fill="#ffffff" opacity="0.12" />

          {/* Happy Squinting Yellow Eyes */}
          <path
            d="M29,57 Q42,48 54,55"
            fill="none"
            stroke="#f7c838"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M68,53 Q81,45 92,52"
            fill="none"
            stroke="#f7c838"
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Wide Mischievous Yellow Toothy Grin */}
          <path
            d="M28,70 Q62,74 94,65 Q88,91 61,92 Q35,93 28,70 Z"
            fill="#f7c838"
            stroke="#090a0d"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Teeth Vertical Dividers */}
          <line x1="41" y1="71" x2="42" y2="88" stroke="#090a0d" strokeWidth="2.6" />
          <line x1="54" y1="72" x2="54" y2="91" stroke="#090a0d" strokeWidth="2.6" />
          <line x1="68" y1="71" x2="68" y2="90" stroke="#090a0d" strokeWidth="2.6" />
          <line x1="81" y1="69" x2="80" y2="85" stroke="#090a0d" strokeWidth="2.6" />
        </svg>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`relative flex items-end justify-center overflow-hidden select-none ${className}`}>
        <svg viewBox="0 0 240 240" className="w-full h-full object-cover">
          {/* Yellow Burst Background with Black Comic Spikes */}
          <rect width="240" height="240" fill="#f6cf3f" />
          <polygon points="0,0 58,0 18,75 0,55" fill="#0d1317" />
          <polygon points="0,145 45,175 22,240 0,240" fill="#0d1317" />
          <polygon points="185,0 240,0 240,85 195,45" fill="#0d1317" />

          {/* Upturned Yellow & Black Jacket Collar */}
          <polygon
            points="18,240 42,152 94,182 120,240"
            fill="#14151b"
            stroke="#090a0d"
            strokeWidth="3.5"
          />
          <polygon
            points="222,240 198,146 144,180 120,240"
            fill="#14151b"
            stroke="#090a0d"
            strokeWidth="3.5"
          />
          <polygon
            points="32,168 82,140 96,195 48,215"
            fill="#f7c838"
            stroke="#090a0d"
            strokeWidth="3"
          />
          <polygon
            points="208,160 156,134 142,192 192,212"
            fill="#f7c838"
            stroke="#090a0d"
            strokeWidth="3"
          />

          {/* Glossy Black Neck */}
          <polygon points="86,142 152,138 146,215 92,215" fill="#111217" stroke="#090a0d" strokeWidth="3" />

          {/* Left & Right Cat Ears */}
          <polygon points="48,62 54,14 88,50" fill="#14151b" stroke="#090a0d" strokeWidth="3.5" strokeLinejoin="round" />
          <polygon points="53,56 56,22 65,51" fill="#f7c838" />
          <polygon points="186,48 178,8 144,42" fill="#14151b" stroke="#090a0d" strokeWidth="3.5" strokeLinejoin="round" />
          <polygon points="178,44 174,16 162,40" fill="#f7c838" />

          {/* Tilted 3D Cube Head */}
          <g transform="rotate(4 120 95)">
            <polygon
              points="44,52 188,38 194,146 52,156"
              fill="#18181f"
              stroke="#090a0d"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Cube Bottom Bevel */}
            <polygon points="52,156 194,146 176,166 68,172" fill="#0b0c10" stroke="#090a0d" strokeWidth="3" />

            {/* Gold Rim Highlights */}
            <polygon points="47,55 82,51 54,66 55,150 49,150" fill="#f7c838" opacity="0.9" />
            <polygon points="184,42 190,142 184,142 179,48" fill="#f7c838" opacity="0.9" />

            {/* Gloss Highlights */}
            <polygon points="88,49 108,47 76,118 62,118" fill="#ffffff" opacity="0.13" />

            {/* Squinting Happy Eyes */}
            <path d="M68,88 Q88,75 106,85" fill="none" stroke="#f7c838" strokeWidth="6.5" strokeLinecap="round" />
            <path d="M132,82 Q152,70 170,80" fill="none" stroke="#f7c838" strokeWidth="6.5" strokeLinecap="round" />

            {/* Wide Yellow Toothy Grin */}
            <path
              d="M66,108 Q120,115 172,100 Q164,140 120,142 Q78,143 66,108 Z"
              fill="#f7c838"
              stroke="#090a0d"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <line x1="86" y1="110" x2="88" y2="136" stroke="#090a0d" strokeWidth="3" />
            <line x1="108" y1="112" x2="108" y2="141" stroke="#090a0d" strokeWidth="3" />
            <line x1="131" y1="111" x2="131" y2="140" stroke="#090a0d" strokeWidth="3" />
            <line x1="152" y1="107" x2="150" y2="133" stroke="#090a0d" strokeWidth="3" />
          </g>
        </svg>
      </div>
    );
  }

  // Hero & Full Mascot Illustration (No frame/box — pure character artwork on transparent background)
  return (
    <div className={`relative flex items-end justify-center select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 500 470"
        className="w-full h-auto overflow-visible drop-shadow-[0_16px_28px_rgba(9,18,21,0.32)]"
      >
        {/* Dynamic Yellow Paint Slashes Behind Mascot Shoulders */}
        <polygon points="15,430 165,285 182,300 35,445" fill="#f6cf3f" opacity="0.9" />
        <polygon points="345,275 485,155 495,168 360,292" fill="#f6cf3f" opacity="0.9" />
        <polygon points="380,310 475,235 482,246 392,324" fill="#f6cf3f" opacity="0.8" />

        {/* Glossy Black Coat / Shoulders */}
        <path
          d="M38,468 C52,392 98,358 158,346 L348,346 C405,358 446,395 462,468 Z"
          fill="#121318"
          stroke="#08090c"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        {/* Yellow Coat Trim & Gloss Highlights on Shoulders */}
        <path d="M58,465 C75,412 114,385 162,374 L182,465 Z" fill="#1c1e26" />
        <path d="M442,465 C425,412 388,385 342,374 L322,465 Z" fill="#1c1e26" />
        <polygon points="82,425 135,388 122,415 92,445" fill="#f6cf3f" opacity="0.85" />
        <polygon points="412,420 362,385 375,412 402,442" fill="#f6cf3f" opacity="0.85" />

        {/* Dramatic Upturned Yellow-Lined Collar (Left & Right Wings) */}
        {/* Back Collar Layer */}
        <polygon
          points="128,278 64,302 108,356 175,352"
          fill="#d9b566"
          stroke="#08090c"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <polygon
          points="364,268 438,292 392,348 325,346"
          fill="#d9b566"
          stroke="#08090c"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Main Left Yellow Collar Wing */}
        <path
          d="M32,338 L146,274 L218,378 L195,466 L128,466 C118,412 85,368 32,338 Z"
          fill="#f7c93e"
          stroke="#08090c"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Left Collar Shading Facet */}
        <polygon points="52,336 144,284 185,348 118,362" fill="#e5b530" />
        <polygon points="118,362 185,348 205,435 142,402" fill="#fff099" opacity="0.65" />

        {/* Main Right Yellow Collar Wing */}
        <path
          d="M468,318 L348,262 L278,378 L298,466 L372,466 C382,408 415,356 468,318 Z"
          fill="#f7c93e"
          stroke="#08090c"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Right Collar Shading Facet */}
        <polygon points="446,318 352,272 312,342 384,354" fill="#e5b530" />
        <polygon points="312,342 384,354 358,432 294,405" fill="#fff099" opacity="0.65" />

        {/* Glossy Black Neck & Throat */}
        <path
          d="M188,265 L312,258 L302,418 L248,456 L198,418 Z"
          fill="#111217"
          stroke="#08090c"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Neck Gloss & Gold Flecks */}
        <polygon points="212,285 228,285 222,375 205,360" fill="#272935" />
        <polygon points="236,338 246,344 241,354 232,348" fill="#f7c93e" />
        <polygon points="248,365 256,388 245,392" fill="#ffffff" opacity="0.7" />

        {/* ================= 3D CUBE CAT HEAD (Tilted Expressively) ================= */}
        <g transform="rotate(4 250 165)">
          {/* Left Pointed Cat Ear */}
          <polygon
            points="92,92 96,6 168,74"
            fill="#121318"
            stroke="#08090c"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          {/* Left Ear Gold Rim & Inner Facet */}
          <polygon points="99,86 102,18 118,78" fill="#f7c93e" />
          <polygon points="118,78 102,18 156,72" fill="#1b1c24" />

          {/* Right Pointed Cat Ear */}
          <polygon
            points="402,74 392,2 324,64"
            fill="#121318"
            stroke="#08090c"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          {/* Right Ear Gold Rim & Inner Facet */}
          <polygon points="393,68 386,14 372,62" fill="#f7c93e" />
          <polygon points="334,62 386,14 372,62" fill="#1b1c24" />

          {/* 3D Cube Underside / Jaw Depth Plane */}
          <polygon
            points="102,268 408,252 376,292 138,302"
            fill="#0a0b0e"
            stroke="#08090c"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          {/* Underside Cyan & Gold Rim Reflections */}
          <polygon points="118,274 215,270 195,282 132,285" fill="#67cdcc" opacity="0.55" />
          <polygon points="315,264 395,258 378,274 305,276" fill="#f7c93e" opacity="0.85" />

          {/* Main Front Cube Face */}
          <polygon
            points="88,78 406,58 414,252 102,268"
            fill="#1a1921"
            stroke="#08090c"
            strokeWidth="5.5"
            strokeLinejoin="round"
          />

          {/* Subtle Diagonal Cel-Shaded Planes Across Black Cube Face */}
          <polygon points="88,78 255,68 175,264 102,268" fill="#23212b" opacity="0.7" />
          <polygon points="185,72 245,68 148,225 118,215" fill="#2e2b38" opacity="0.55" />

          {/* Gold / Yellow Rim Lighting Along Cube Edges */}
          {/* Left Vertical Rim */}
          <polygon points="92,82 108,82 112,262 104,264" fill="#f7c93e" />
          {/* Top-Left Corner Chipped Highlight */}
          <polygon points="94,82 145,78 122,96 96,104" fill="#ffe680" />
          {/* Right Vertical Rim */}
          <polygon points="396,62 404,60 411,248 402,248" fill="#f7c93e" />
          {/* Bottom Horizontal Rim */}
          <polygon points="108,260 406,245 406,251 108,266" fill="#f7c93e" opacity="0.9" />

          {/* Crisp Anime-Style Specular Cracks / Reflections */}
          <path d="M168,145 L142,192 L156,188 L178,148 Z" fill="#67cdcc" opacity="0.75" />
          <path d="M358,128 L372,182 L362,185 L352,132 Z" fill="#f7c93e" opacity="0.8" />
          <path d="M342,195 L376,242 L362,245 L334,202 Z" fill="#e2d6b5" opacity="0.75" />
          <path d="M132,212 L168,252 L156,255 L125,218 Z" fill="#67cdcc" opacity="0.5" />

          {/* Happy Squinting Yellow Eyes (Curved Arcs) */}
          <path
            d="M134,154 Q168,134 205,146"
            fill="none"
            stroke="#f7c838"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M286,142 Q324,124 360,138"
            fill="none"
            stroke="#f7c838"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Wide Mischievous Yellow Toothy Grin */}
          <path
            d="M138,186 Q252,194 362,172 Q346,238 252,242 Q162,244 138,186 Z"
            fill="#f7c838"
            stroke="#08090c"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          {/* Teeth Vertical Ink Lines */}
          <line x1="176" y1="189" x2="180" y2="230" stroke="#08090c" strokeWidth="4" strokeLinecap="round" />
          <line x1="216" y1="191" x2="218" y2="239" stroke="#08090c" strokeWidth="4" strokeLinecap="round" />
          <line x1="262" y1="190" x2="262" y2="240" stroke="#08090c" strokeWidth="4" strokeLinecap="round" />
          <line x1="306" y1="185" x2="304" y2="232" stroke="#08090c" strokeWidth="4" strokeLinecap="round" />
          <line x1="340" y1="178" x2="336" y2="214" stroke="#08090c" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* White 4-Pointed Sparkles Around Mascot */}
        <path
          d="M42,135 Q48,158 70,162 Q48,166 42,190 Q36,166 14,162 Q36,158 42,135 Z"
          fill="#ffffff"
        />
        <path
          d="M58,205 Q61,218 74,221 Q61,224 58,238 Q55,224 42,221 Q55,218 58,205 Z"
          fill="#ffffff"
        />
        <path
          d="M448,68 Q454,92 478,96 Q454,100 448,125 Q442,100 418,96 Q442,92 448,68 Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
};
