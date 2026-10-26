/* Clay scene renderer: turns "backdrop|mood|title|props" into an 800x500 SVG that looks hand-sculpted.
 * Everything is drawn as soft shapes, then a filter adds lumpy edges, a sheen, a dark rim and fingerprint grain.
 * The glowing pad in each scene is where the Smiski stands. */

const R = (x, y, w, h, rx, f, ex = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${ex}/>`;
const E = (cx, cy, rx, ry, f, ex = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${ex}/>`;
const O = (cx, cy, r, f, ex = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${ex}/>`;
const P = (d, f, ex = '') => `<path d="${d}" fill="${f}" ${ex}/>`;
const L = (d, s, w, ex = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${ex}/>`;
const G = (t, inner, ex = '') => `<g transform="${t}" ${ex}>${inner}</g>`;
const rot = (a, x, y) => `transform="rotate(${a} ${x} ${y})"`;

function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];

const MOODS = {
  day:     { sky: ['#8FD3F4', '#DDF3FF'], overlay: null, glow: 0 },
  morning: { sky: ['#FFC98F', '#FFF1D6'], overlay: ['#FFE9B0', .14], glow: .15 },
  dusk:    { sky: ['#F7866A', '#C99BD8'], overlay: ['#FF7A59', .16], glow: .55 },
  night:   { sky: ['#11173A', '#2E3870'], overlay: ['#0E1433', .48], glow: 1 },
};
export const MOOD_NAMES = { day: 'Daytime', morning: 'Morning', dusk: 'Sunset', night: 'Night (glow time)' };

/* ---------------- backdrops: wall/sky down to y=330, floor below ---------------- */
const FLOOR = 330;
function sky(ctx) { return `<rect width="800" height="${FLOOR + 20}" fill="url(#sky)"/>`; }
function planks(c1, c2) { let s = R(0, FLOOR, 800, 170, 0, c1); for (let y = FLOOR + 22; y < 500; y += 28 + (y - FLOOR) * .12) s += R(0, y, 800, 3, 0, c2); return s; }
function tilesFloor(c1, c2) { let s = R(0, FLOOR, 800, 170, 0, c1); for (let i = -8; i < 20; i++) s += L(`M${400 + i * 70 - 400} 500 L${400 + (i * 70 - 400) * .45} ${FLOOR}`, c2, 3); for (let y = FLOOR + 30; y < 500; y += 34 + (y - FLOOR) * .2) s += R(0, y, 800, 3, 0, c2); return s; }
function base(c) { return R(0, FLOOR - 10, 800, 14, 4, c); }

export const BACKDROPS = {
  bath: { name: 'Bathroom', out: false, d: () => { let s = R(0, 0, 800, FLOOR, 0, '#BFE3EE'); for (let y = 6; y < FLOOR - 10; y += 52) for (let x = 6 - ((y / 52) % 2) * 26; x < 800; x += 52) s += R(x, y, 46, 46, 8, '#CDEBF4'); return s + tilesFloor('#F4F1EA', '#E2DCCF') + base('#FFFFFF'); } },
  restroom: { name: 'Restroom', out: false, d: () => R(0, 0, 800, FLOOR, 0, '#CDEBD6') + R(0, 200, 800, FLOOR - 200, 0, '#A8D8B9') + R(0, 194, 800, 12, 6, '#8CC7A2') + tilesFloor('#EDE7DA', '#DAD2C2') + base('#8CC7A2') },
  living: { name: 'Living room', out: false, d: () => { let s = R(0, 0, 800, FLOOR, 0, '#F6D9B8'); for (let x = 20; x < 800; x += 62) s += R(x, 0, 24, FLOOR, 12, '#F1CDA6'); return s + planks('#C99B6D', '#B5845A') + base('#FFF6EA'); } },
  bedroom: { name: 'Bedroom', out: false, d: () => { let s = R(0, 0, 800, FLOOR, 0, '#D9CCEF'); for (let y = 30; y < FLOOR - 20; y += 48) for (let x = 24 + (y % 96 ? 24 : 0); x < 800; x += 48) s += O(x, y, 4, '#CBBBE6'); return s + R(0, FLOOR, 800, 170, 0, '#EADDCB') + base('#FFFFFF'); } },
  office: { name: 'Office', out: false, d: () => { let s = R(0, 0, 800, FLOOR, 0, '#DCE4EC') + R(0, 0, 800, 18, 0, '#C9D3DE'); for (let x = 0; x < 800; x += 160) s += R(x, 0, 6, FLOOR, 0, '#CDD6E0'); return s + R(0, FLOOR, 800, 170, 0, '#9AA7B6') + base('#7E8B9B'); } },
  gym: { name: 'Gym', out: false, d: () => R(0, 0, 800, FLOOR, 0, '#E9EEF2') + R(0, 190, 800, 28, 0, '#FF6F61') + R(0, 226, 800, 12, 0, '#FFD23F') + R(0, FLOOR, 800, 170, 0, '#5C6B78') + L(`M0 ${FLOOR + 60} H800 M0 ${FLOOR + 120} H800`, '#6E7D8A', 4) + base('#3E4A55') },
  studio: { name: 'Yoga studio', out: false, d: (ctx) => { let s = R(0, 0, 800, FLOOR, 0, '#F4E9DC'); for (const x of [90, 330, 570]) s += P(`M${x} 280 V120 a70 70 0 0 1 140 0 V280Z`, '#FFFFFF') + P(`M${x + 10} 270 V122 a60 60 0 0 1 120 0 V270Z`, ctx.skyMid) + R(x + 66, 60, 8, 210, 0, '#FFFFFF'); return s + planks('#D9B48A', '#C69E74') + base('#FFFFFF'); } },
  closet: { name: 'Dressing room', out: false, d: () => R(0, 0, 800, FLOOR, 0, '#F8D4DA') + R(40, 40, 210, 290, 14, '#FFFFFF') + R(52, 52, 90, 266, 8, '#FBE7EA') + R(148, 52, 90, 266, 8, '#FBE7EA') + O(132, 190, 6, '#D9A86C') + O(158, 190, 6, '#D9A86C') + R(0, FLOOR, 800, 170, 0, '#EADDCB') + base('#FFFFFF') },
  kitchen: { name: 'Kitchen', out: false, d: () => { let s = R(0, 0, 800, FLOOR, 0, '#FFF3D6'); for (let x = 0; x < 800; x += 40) for (let y = 120; y < 230; y += 40) s += R(x + 3, y + 3, 34, 34, 6, (x / 40 + y / 40) % 2 ? '#FFE0A3' : '#FFFFFF'); s += R(0, 40, 800, 70, 0, '#B5D8C9') + L('M0 75 H800', '#9BC9B6', 4); return s + tilesFloor('#F4EAD8', '#E3D5BC') + base('#C99B6D'); } },
  cafe: { name: 'Café', out: false, d: () => { let s = R(0, 0, 800, FLOOR, 0, '#E8C9A8') + R(470, 50, 250, 150, 12, '#8A5A3B') + R(482, 62, 226, 126, 6, '#3B4A42'); s += L('M505 92 h70 M505 120 h110 M505 148 h86', '#E9F0EA', 4, 'opacity=".75"') + O(650, 100, 16, 'none', 'stroke="#FFD166" stroke-width="4"'); let f = R(0, FLOOR, 800, 170, 0, '#F4EAD8'); for (let y = FLOOR, i = 0; y < 500; y += 34, i++) for (let x = (i % 2) * 40; x < 800; x += 80) f += R(x, y, 40, 34, 0, '#D9C3A5'); return s + f + base('#8A5A3B'); } },
  moving: { name: 'Empty new place', out: false, d: () => R(0, 0, 800, FLOOR, 0, '#F2EEE6') + R(560, 70, 130, 100, 6, '#F8F5EF') + L('M600 70 L620 50 L640 70', '#E2DCCF', 3) + planks('#D3AA7D', '#BF946A') + base('#FFFFFF') },
  party: { name: 'Party room', out: false, d: () => { let s = R(0, 0, 800, FLOOR, 0, '#FFE0EA'); for (let y = 24; y < FLOOR - 10; y += 50) for (let x = 20 + (y % 100 ? 25 : 0); x < 800; x += 50) s += O(x, y, 8, '#FFC2D4'); return s + R(0, FLOOR, 800, 170, 0, '#F7E8C8') + base('#FFFFFF'); } },
  gallery: { name: 'Museum gallery', out: false, d: () => R(0, 0, 800, FLOOR, 0, '#F7F4EE') + R(0, 0, 800, 22, 0, '#E9E3D8') + planks('#C99B6D', '#B5845A') + base('#E9E3D8') },
  stage: { name: 'Stage', out: false, d: () => { let s = R(0, 0, 800, FLOOR, 0, '#8E2534'); for (let x = 30; x < 800; x += 56) s += R(x, 40, 16, FLOOR - 40, 8, '#74192A'); s += P('M0 0 H800 V54 Q760 80 720 54 T640 54 T560 54 T480 54 T400 54 T320 54 T240 54 T160 54 T80 54 T0 54Z', '#A52F40'); return s + planks('#B5814D', '#9E6E40') + R(0, FLOOR - 6, 800, 10, 4, '#7A532F'); } },
  garden: { name: 'Garden', out: true, d: (ctx) => sky(ctx) + E(180, FLOOR + 10, 300, 90, '#A8DC90') + E(640, FLOOR + 20, 320, 100, '#9CD48A') + R(0, FLOOR - 10, 800, 180, 0, '#7BC67E') + E(400, 470, 520, 60, '#86CF84') },
  park: { name: 'Park', out: true, d: (ctx) => { let s = sky(ctx); for (let x = -20; x < 820; x += 90) s += O(x, FLOOR - 30, 56, '#6CC47A'); return s + R(0, FLOOR - 10, 800, 180, 0, '#8ED081') + P(`M300 500 Q380 420 520 ${FLOOR + 10} L560 ${FLOOR + 10} Q470 420 440 500Z`, '#EAD9B4'); } },
  beach: { name: 'Beach', out: true, d: (ctx) => sky(ctx) + R(0, 240, 800, 90, 0, '#4FB3D9') + L('M0 262 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0', '#BDE8F5', 5) + L('M0 296 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0', '#BDE8F5', 4) + P(`M0 ${FLOOR - 14} Q400 ${FLOOR - 34} 800 ${FLOOR - 14} V500 H0Z`, '#F1D9A7') },
  street: { name: 'City street', out: true, d: (ctx) => { let s = sky(ctx); const b = [[0, 120, 130, '#F2A07B'], [130, 70, 110, '#9BB7D4'], [240, 150, 120, '#F4D35E'], [360, 90, 150, '#B8A9D9'], [510, 130, 120, '#8FCB9B'], [630, 60, 170, '#F7B2C1']]; for (const [x, y, w, c] of b) { s += R(x + 4, y, w - 8, FLOOR - y, 10, c); for (let wy = y + 22; wy < FLOOR - 50; wy += 46) for (let wx = x + 20; wx < x + w - 34; wx += 36) s += R(wx, wy, 20, 26, 5, ctx.night ? '#FFE8A3' : '#EAF6FB'); } return s + R(0, FLOOR - 4, 800, 56, 0, '#CFC9BE') + R(0, FLOOR + 50, 800, 130, 0, '#5C5F66') + L('M20 440 h60 M160 440 h60 M300 440 h60 M440 440 h60 M580 440 h60 M720 440 h60', '#F4F1EA', 7); } },
  site: { name: 'Construction site', out: true, d: (ctx) => sky(ctx) + L('M620 330 V60 M620 70 H400 M620 70 L760 70 M620 70 L660 30 L620 30', '#F2B134', 12) + L('M440 70 V150', '#5C5F66', 4) + R(424, 150, 32, 20, 4, '#5C5F66') + R(0, FLOOR - 10, 800, 180, 0, '#C9A27A') + E(160, 420, 60, 8, '#B58D66') + E(560, 470, 80, 9, '#B58D66') + E(700, 380, 40, 6, '#B58D66') },
  stadium: { name: 'Stadium', out: true, d: (ctx) => { let s = sky(ctx) + R(0, 150, 800, 180, 0, '#5C6B8A'); for (let y = 170; y < 320; y += 30) for (let x = 12 + (y % 60 ? 10 : 0); x < 800; x += 22) s += O(x, y, 7, ['#FF6F91', '#FFD23F', '#8EC5FF', '#7BC67E', '#FFFFFF'][(x * 7 + y) % 5]); return s + R(0, FLOOR - 10, 800, 180, 0, '#5DBB63') + L(`M0 ${FLOOR + 40} H800 M400 ${FLOOR - 10} V500`, '#E9F7E9', 5) + E(400, 440, 90, 28, 'none', 'stroke="#E9F7E9" stroke-width="5"'); } },
  rooftop: { name: 'Rooftop', out: true, d: (ctx) => { let s = sky(ctx); const b = [[0, 210, 90], [80, 170, 70], [150, 230, 110], [260, 150, 60], [320, 200, 120], [440, 120, 70], [510, 190, 100], [610, 160, 80], [690, 220, 110]]; for (const [x, y, w] of b) { s += R(x, y, w, FLOOR - y, 6, ctx.night ? '#2B3360' : '#9AA8C6'); if (ctx.night) for (let wy = y + 16; wy < FLOOR - 20; wy += 28) for (let wx = x + 12; wx < x + w - 14; wx += 22) if ((wx * 3 + wy) % 5 < 2) s += R(wx, wy, 10, 12, 2, '#FFE8A3'); } return s + R(0, FLOOR - 16, 800, 22, 6, '#9A948C') + R(0, FLOOR + 4, 800, 170, 0, '#B8B2AA'); } },
  forest: { name: 'Forest', out: true, d: (ctx) => { let s = sky(ctx); for (const [x, w] of [[30, 34], [140, 26], [250, 40], [520, 30], [640, 44], [750, 28]]) s += R(x, 0, w, FLOOR + 10, w / 2, '#7E5A3E') + O(x + w / 2, 30, 90, '#4E9A5A'); return s + R(0, FLOOR - 10, 800, 180, 0, '#6CA96A') + E(200, 420, 120, 14, '#5E9B5D') + E(640, 470, 140, 14, '#5E9B5D'); } },
  snow: { name: 'Snowy hill', out: true, d: (ctx) => sky(ctx) + E(150, FLOOR + 20, 300, 110, '#E6EEF5') + E(650, FLOOR + 10, 320, 120, '#EDF3F8') + R(0, FLOOR - 4, 800, 180, 0, '#F6F9FC') + E(300, 440, 120, 10, '#E1E9F1') },
  pond: { name: 'Pond', out: true, d: (ctx) => sky(ctx) + E(400, FLOOR + 10, 520, 60, '#9CD48A') + R(0, FLOOR, 800, 170, 0, '#8ED081') + E(640, 405, 170, 44, '#6FBFE0') + E(640, 400, 150, 34, '#8ED3EE') + E(600, 398, 24, 8, '#6CC47A') + E(690, 410, 20, 7, '#6CC47A') },
  camp: { name: 'Campsite', out: true, d: (ctx) => sky(ctx) + P('M-40 330 L180 110 L400 330Z', '#8C9BB8') + P('M140 175 L180 110 L222 176 L200 168 L180 182 L160 168Z', '#FFFFFF') + P('M300 330 L540 80 L820 330Z', '#7E8DAD') + P('M494 128 L540 80 L586 128 L560 120 L540 136 L520 120Z', '#FFFFFF') + R(0, FLOOR - 10, 800, 180, 0, '#8FBF7A') },
  space: { name: 'Outer space', out: true, d: () => { let s = R(0, 0, 800, FLOOR + 20, 0, '#1D1B3A') + O(140, 90, 40, '#FF8FB1') + E(140, 90, 70, 12, 'none', 'stroke="#FFD23F" stroke-width="6"') + O(690, 160, 22, '#8EC5FF'); return s + P(`M0 ${FLOOR} Q400 ${FLOOR - 40} 800 ${FLOOR} V500 H0Z`, '#BDB7C8') + E(200, 420, 44, 12, '#A8A1B5') + E(600, 460, 60, 14, '#A8A1B5') + E(680, 370, 30, 8, '#A8A1B5'); } },
};

/* ---------------- props: [kind, size, draw(ctx, r)] — drawn with the base at (0,0), pointing up ---------------- */
const BOOK_C = ['#6FA8DC', '#F28C8C', '#FFD166', '#7BC67E', '#B39DDB', '#FF8A65'];
const flower = (x, y, c) => P(`M${x - 9} ${y - 12} q0 -12 4 -10 l5 6 l5 -6 q4 -2 4 10 q0 10 -9 10 q-9 0 -9 -10z`, c);
const cloud = (x, y, s = 1) => G(`translate(${x} ${y}) scale(${s})`, O(-32, 0, 22, '#FFFFFF') + O(0, -14, 30, '#FFFFFF') + O(32, 0, 22, '#FFFFFF') + R(-54, -2, 108, 26, 13, '#FFFFFF'));
const balloon = (x, y, c) => L(`M${x} ${y + 30} Q${x - 8} ${y + 70} 0 0`, '#9AA5B1', 2) + E(x, y, 22, 28, c) + P(`M${x - 5} ${y + 30} h10 l-5 -6z`, c) + E(x - 8, y - 10, 5, 8, '#FFFFFF', 'opacity=".5"');

export const PROPS = {
  tub: ['floor', 'big', () => R(-120, -80, 240, 80, 36, '#FDFBF6') + R(-130, -92, 260, 22, 11, '#FFFFFF') + E(0, -90, 108, 7, '#A8DDF0') + E(-88, 2, 12, 7, '#D4AF6A') + E(88, 2, 12, 7, '#D4AF6A') + R(100, -130, 12, 44, 5, '#BFCBD3') + R(80, -130, 32, 10, 5, '#BFCBD3')],
  towel: ['floor', 'mid', () => R(-44, -130, 88, 8, 4, '#B98B5B') + R(-42, -130, 8, 130, 4, '#B98B5B') + R(34, -130, 8, 130, 4, '#B98B5B') + R(-30, -126, 60, 74, 10, '#7FD1C7') + R(-30, -62, 60, 9, 4, '#5FB8AD')],
  duck: ['floor', 'small', () => E(0, -16, 24, 16, '#FFD23F') + O(13, -36, 12, '#FFD23F') + P('M23 -38 l15 3 l-15 5z', '#FF8A3D') + O(16, -39, 2.2, '#2B2B2B') + E(-6, -20, 10, 6, '#F5C22E')],
  shampoo: ['floor', 'small', () => R(-12, -56, 24, 56, 8, '#FF8FB1') + R(-6, -68, 12, 14, 3, '#FFFFFF') + R(-9, -40, 18, 15, 4, '#FFFFFF')],
  sponge: ['floor', 'small', () => R(-20, -22, 40, 22, 7, '#FFE066') + O(-9, -13, 3, '#E8C547') + O(6, -9, 2.4, '#E8C547') + O(10, -16, 2.2, '#E8C547')],
  brush: ['floor', 'small', () => L('M-24 0 L18 -52', '#B5814D', 7) + E(24, -60, 10, 17, '#F4E3B5', rot(38, 24, -60))],
  toilet: ['floor', 'big', () => R(-42, -142, 84, 56, 12, '#FFFFFF') + R(-30, -130, 16, 6, 3, '#BFCBD3') + P('M-54 -86 h108 q0 52 -32 62 v24 h-44 v-24 q-32 -10 -32 -62z', '#FAF8F2') + E(0, -86, 56, 11, '#EFEAE0') + E(0, -86, 40, 6, '#DCEFF6')],
  tp: ['floor', 'small', () => R(-17, -38, 34, 38, 7, '#FFFFFF') + E(0, -38, 17, 6, '#EDEBE6') + E(0, -38, 6, 2.6, '#CDB89A') + P('M17 -22 q8 10 2 22 h-8 v-22z', '#FFFFFF')],
  plunger: ['floor', 'small', () => L('M0 -80 L0 -18', '#C68C52', 7) + P('M-20 0 q0 -22 20 -22 q20 0 20 22z', '#E85D5D')],
  mirror: ['wall', 'mid', () => E(0, 0, 48, 62, '#D9A86C') + E(0, 0, 39, 53, '#CFE9F2') + L('M-18 -26 q8 -14 22 -18', '#FFFFFF', 5, 'opacity=".7"')],
  plant: ['floor', 'mid', () => E(-16, -72, 13, 32, '#5DBB63', rot(-28, -16, -72)) + E(16, -72, 13, 32, '#5DBB63', rot(28, 16, -72)) + E(0, -86, 13, 36, '#4CA954') + P('M-28 -42 h56 l-7 42 h-42z', '#D9825B') + R(-31, -48, 62, 10, 5, '#E39470')],
  cactus: ['floor', 'mid', () => R(-15, -108, 30, 76, 15, '#6CC47A') + R(10, -84, 26, 13, 6.5, '#6CC47A') + R(24, -104, 13, 32, 6.5, '#6CC47A') + R(-36, -74, 24, 12, 6, '#6CC47A') + R(-37, -94, 12, 30, 6, '#6CC47A') + O(0, -112, 6, '#FF8FB1') + P('M-24 -36 h48 l-6 36 h-36z', '#E0A15E')],
  sunflower: ['floor', 'mid', () => { let s = L('M0 0 L0 -122', '#5DAA55', 7) + E(-16, -50, 17, 8, '#5DBB63', rot(-25, -16, -50)) + E(16, -76, 17, 8, '#5DBB63', rot(25, 16, -76)); for (let a = 0; a < 360; a += 36) s += E(0, -150, 9, 18, '#FFD23F', rot(a, 0, -128)); return s + O(0, -128, 15, '#8A5A2B'); }],
  tulips: ['floor', 'small', () => L('M-9 -26 L-12 -58 M0 -26 L0 -66 M9 -26 L12 -56', '#5DAA55', 4) + flower(-12, -58, '#FF6F91') + flower(0, -66, '#FFB547') + flower(12, -56, '#FF8FB1') + P('M-20 -28 h40 l-5 28 h-30z', '#9FC3E8')],
  sofa: ['floor', 'big', () => R(-118, -112, 236, 62, 28, '#E8897A') + R(-120, -64, 240, 46, 16, '#D9705F') + R(-100, -84, 94, 28, 14, '#F2A496') + R(6, -84, 94, 28, 14, '#F2A496') + R(-148, -94, 44, 80, 20, '#E8897A') + R(104, -94, 44, 80, 20, '#E8897A') + R(-124, -20, 12, 20, 4, '#8A5A3B') + R(112, -20, 12, 20, 4, '#8A5A3B')],
  armchair: ['floor', 'big', () => R(-60, -116, 120, 62, 26, '#7FB3D5') + R(-62, -64, 124, 44, 15, '#6699BF') + R(-44, -84, 88, 26, 13, '#9CC6E2') + R(-88, -94, 36, 80, 17, '#7FB3D5') + R(52, -94, 36, 80, 17, '#7FB3D5') + R(-64, -20, 10, 20, 4, '#8A5A3B') + R(54, -20, 10, 20, 4, '#8A5A3B')],
  rug: ['flat', 'big', () => E(0, 0, 170, 32, '#F2C14E') + E(0, 0, 140, 24, '#F7D57C') + E(0, 0, 100, 16, '#F2C14E')],
  mat: ['flat', 'big', () => P('M-118 6 L-88 -26 L112 -26 L134 6 Z', '#B39DDB') + P('M-118 6 L134 6 L134 12 L-118 12Z', '#9C86CF')],
  lamp: ['floor', 'mid', () => E(0, -3, 26, 8, '#7A6A5A') + L('M0 -6 L0 -150', '#7A6A5A', 6) + P('M-36 -146 h72 l-16 -50 h-40z', '#FFE8A3')],
  bookshelf: ['floor', 'big', (ctx, r) => { let s = R(-66, -186, 132, 186, 10, '#B5814D'); for (const y of [-176, -116, -56]) { s += R(-56, y, 112, 50, 4, '#F4E6CF'); let x = -52; while (x < 44) { const w = 9 + Math.floor(r() * 8), h = 30 + Math.floor(r() * 16); s += R(x, y + 50 - h, w, h, 3, pick(r, BOOK_C)); x += w + 2; } } return s; }],
  books: ['floor', 'small', () => R(-30, -14, 60, 14, 4, '#6FA8DC') + R(-26, -28, 54, 14, 4, '#F28C8C') + R(-28, -42, 52, 14, 4, '#FFD166') + R(-24, -38, 40, 3, 1, '#FFFFFF', 'opacity=".6"')],
  tv: ['floor', 'mid', (ctx) => R(-44, -26, 88, 26, 6, '#B5814D') + R(-6, -36, 12, 12, 2, '#3A3A46') + R(-72, -124, 144, 92, 14, '#3A3A46') + R(-62, -114, 124, 72, 8, ctx.night ? '#8FE3FF' : '#6B7FA6') + L('M-40 -100 q20 -10 40 0', '#FFFFFF', 4, 'opacity=".35"')],
  mug: ['floor', 'small', () => L('M15 -22 q12 0 12 9 q0 9 -12 9', '#FF8A65', 5) + R(-15, -30, 30, 30, 8, '#FF8A65') + E(0, -30, 13, 3.5, '#6B3F1D')],
  cushion: ['floor', 'small', () => R(-36, -30, 72, 30, 14, '#B39DDB') + O(0, -15, 3.5, '#9575CD')],
  cat: ['floor', 'small', () => L('M-26 -14 q-22 -6 -14 -28', '#F4A259', 8) + E(0, -18, 28, 18, '#F4A259') + P('M12 -44 l4 -16 l9 11z', '#F4A259') + P('M26 -46 l6 -13 l6 13z', '#F4A259') + O(22, -34, 14, '#F4A259') + O(17, -36, 2.2, '#2B2B2B') + O(27, -36, 2.2, '#2B2B2B') + E(-8, -10, 8, 4, '#E58B3E')],
  bed: ['floor', 'big', () => R(-176, -150, 30, 150, 14, '#B5845A') + R(-160, -72, 326, 52, 18, '#C99B6D') + R(-152, -96, 310, 36, 15, '#FFFFFF') + R(-70, -100, 226, 46, 18, '#8FB8E8') + R(-70, -100, 226, 14, 7, '#A9C9F0') + E(-112, -98, 36, 16, '#FFF6E0') + R(-160, -24, 12, 24, 4, '#8A5A3B') + R(152, -24, 12, 24, 4, '#8A5A3B')],
  clock: ['floor', 'small', () => L('M-12 -40 l-7 -8 M12 -40 l7 -8', '#E05555', 6) + O(0, -25, 22, '#FF7B7B') + O(0, -25, 16, '#FFFFFF') + L('M0 -25 L0 -35 M0 -25 L7 -21', '#2B2B2B', 3) + R(-16, -5, 7, 6, 3, '#E05555') + R(9, -5, 7, 6, 3, '#E05555')],
  moon: ['wall', 'mid', () => P('M0 -40 A40 40 0 1 0 36 18 A31 31 0 1 1 0 -40z', '#FFF1A8') + O(-12, 10, 4, '#F2DE86') + O(-20, -10, 3, '#F2DE86')],
  sun: ['wall', 'mid', () => { let s = ''; for (let a = 0; a < 360; a += 45) s += R(-5, -64, 10, 20, 5, '#FFC93C', rot(a, 0, 0)); return s + O(0, 0, 36, '#FFD34E') + O(-10, -10, 8, '#FFE58A'); }],
  window: ['wall', 'big', (ctx) => R(-76, -66, 152, 132, 12, '#FFFFFF') + R(-66, -56, 132, 112, 6, 'url(#sky)') + (ctx.night ? O(30, -26, 12, '#FFF1A8') : cloud(-18, 6, .5)) + R(-4, -56, 8, 112, 0, '#FFFFFF') + R(-66, -4, 132, 8, 0, '#FFFFFF') + R(-84, 60, 168, 12, 6, '#F0E4D0')],
  clouds: ['wall', 'mid', () => cloud(0, 0, 1) + cloud(70, 30, .55)],
  desk: ['floor', 'big', (ctx) => R(-122, -88, 244, 18, 8, '#C99B6D') + R(-112, -72, 16, 72, 5, '#B5814D') + R(96, -72, 16, 72, 5, '#B5814D') + R(30, -72, 66, 42, 6, '#B5814D') + R(52, -56, 22, 6, 3, '#E8D1AE') + R(-62, -98, 76, 10, 4, '#9AA5B1') + P('M-58 -98 l6 -54 h64 l6 54z', '#B7C2CC') + P('M-52 -102 l5 -44 h52 l5 44z', ctx.night ? '#9EE7FF' : '#DDEFF7') + R(42, -114, 24, 26, 7, '#FF8A65')],
  chair: ['floor', 'mid', () => R(-30, -124, 60, 58, 16, '#5C6B8A') + R(-34, -70, 68, 18, 9, '#5C6B8A') + L('M0 -52 L0 -12 M-28 -6 L28 -6', '#7A7A86', 7) + O(-28, -4, 6, '#3A3A46') + O(28, -4, 6, '#3A3A46')],
  chart: ['floor', 'mid', () => L('M-40 0 L-26 -130 M40 0 L26 -130', '#B5814D', 6) + R(-58, -164, 116, 104, 8, '#FFFFFF') + R(-42, -84, 16, 14, 2, '#6FA8DC') + R(-20, -104, 16, 34, 2, '#FFB547') + R(2, -124, 16, 54, 2, '#7BC67E') + R(24, -146, 16, 76, 2, '#FF6F91')],
  bulb: ['wall', 'mid', () => { let s = ''; for (let a = -90; a <= 90; a += 45) s += R(-4, -62, 8, 16, 4, '#FFE066', rot(a, 0, 0)); return s + O(0, 0, 32, '#FFE066') + R(-13, 26, 26, 20, 6, '#9AA5B1') + L('M-8 6 q8 -14 16 0', '#F2B134', 3); }],
  papers: ['floor', 'small', () => R(-28, -8, 56, 8, 2, '#FFFFFF') + R(-24, -16, 54, 8, 2, '#F1EDE3') + R(-30, -24, 56, 8, 2, '#FFFFFF') + R(-26, -32, 52, 8, 2, '#F7F3EA')],
  coffee: ['floor', 'small', () => L('M14 -22 q10 0 10 8 q0 8 -10 8', '#FFFFFF', 5) + R(-14, -30, 28, 30, 6, '#FFFFFF') + R(-16, -34, 32, 8, 4, '#7B4A2A') + L('M-4 -44 q-6 -8 0 -16 M6 -46 q-6 -8 0 -16', '#FFFFFF', 3, 'opacity=".8"')],
  car: ['floor', 'big', () => P('M-62 -60 q12 -46 42 -46 h44 q26 0 42 46z', '#FF6F61') + P('M-50 -62 q8 -32 28 -32 h22 v32z', '#CFE9F2') + P('M8 -62 v-32 h18 q18 0 28 32z', '#CFE9F2') + R(-112, -66, 224, 50, 20, '#FF6F61') + O(-62, -16, 21, '#3A3A46') + O(62, -16, 21, '#3A3A46') + O(-62, -16, 8, '#BFCBD3') + O(62, -16, 8, '#BFCBD3') + R(96, -54, 14, 9, 4, '#FFE066')],
  roadsign: ['floor', 'mid', () => L('M0 0 L0 -112', '#9AA5B1', 7) + R(-30, -162, 60, 60, 8, '#FFD23F', rot(45, 0, -132)) + L('M-12 -132 L12 -132 M5 -139 L12 -132 L5 -125', '#2B2B2B', 5)],
  trafficlight: ['floor', 'mid', () => L('M0 0 L0 -100', '#5C6B6F', 8) + R(-21, -178, 42, 86, 10, '#3A3A46') + O(0, -161, 10, '#FF6F61') + O(0, -135, 10, '#FFD23F') + O(0, -109, 10, '#7BC67E')],
  dumbbell: ['floor', 'small', () => R(-30, -18, 60, 8, 4, '#7A7A86') + R(-40, -30, 14, 30, 6, '#3A3A46') + R(26, -30, 14, 30, 6, '#3A3A46')],
  kettlebell: ['floor', 'small', () => L('M-12 -34 q0 -20 12 -20 q12 0 12 20', '#3A3A46', 7) + P('M-24 0 q-6 -36 24 -36 q30 0 24 36z', '#3A3A46') + E(-8, -22, 5, 8, '#5C5F66')],
  hoop: ['floor', 'mid', () => E(0, -60, 40, 60, 'none', 'stroke="#FF6F91" stroke-width="10"') + E(0, -60, 40, 60, 'none', 'stroke="#FFD23F" stroke-width="10" stroke-dasharray="14 18"')],
  matroll: ['floor', 'small', () => R(-38, -26, 76, 26, 13, '#80CBC4') + E(38, -13, 9, 13, '#5FB0A7') + E(38, -13, 4, 6, '#80CBC4')],
  waterbottle: ['floor', 'small', () => R(-11, -52, 22, 52, 8, '#6FA8DC') + R(-7, -62, 14, 12, 3, '#FFFFFF') + R(-11, -36, 22, 10, 3, '#FFFFFF')],
  ball: ['floor', 'mid', () => O(0, -44, 44, '#8EC5FF') + L('M-32 -76 q32 30 64 0', '#B5D8FF', 5) + E(-16, -64, 8, 12, '#FFFFFF', 'opacity=".4"')],
  trophy: ['floor', 'mid', () => R(-28, -14, 56, 14, 4, '#B5814D') + R(-8, -42, 16, 30, 4, '#F2C14E') + L('M-34 -92 q-24 0 -20 20 q4 10 20 8 M34 -92 q24 0 20 20 q-4 10 -20 8', '#F2C14E', 6) + P('M-36 -104 h72 q0 52 -36 62 q-36 -10 -36 -62z', '#F2C14E') + E(-14, -88, 6, 12, '#FFF1A8', 'opacity=".6"')],
  drum: ['floor', 'mid', () => R(-48, -82, 96, 82, 14, '#E85D5D') + L('M-46 -62 L-30 -20 L-10 -62 L10 -20 L30 -62 L46 -20', '#FFE066', 4) + E(0, -82, 48, 13, '#FFF6E8') + L('M-22 -112 L-6 -86 M28 -116 L10 -88', '#C68C52', 5)],
  pompoms: ['floor', 'small', () => { let s = ''; for (const [x, c] of [[-20, '#FF6F91'], [22, '#FFD23F']]) for (let a = 0; a < 360; a += 40) s += O(x + Math.cos(a * Math.PI / 180) * 12, -22 + Math.sin(a * Math.PI / 180) * 12, 10, c); return s + O(-20, -22, 12, '#FF6F91') + O(22, -22, 12, '#FFD23F'); }],
  megaphone: ['floor', 'small', () => P('M-24 -34 l44 -22 v56 l-44 -22z', '#FF6F61') + R(-36, -42, 14, 20, 5, '#FFFFFF') + E(20, -28, 6, 28, '#E85D5D')],
  bunting: ['wide', 'big', () => { let s = L('M-10 60 Q200 110 400 60 T810 60', '#9AA5B1', 3); const C = ['#FF6F91', '#FFD23F', '#8EC5FF', '#7BC67E', '#B39DDB']; for (let i = 0; i < 16; i++) { const x = 20 + i * 51, t = (x % 400) / 400, y = 60 + Math.sin(t * Math.PI) * 25; s += P(`M${x - 17} ${y} L${x + 17} ${y} L${x} ${y + 34}Z`, C[i % 5]); } return s; }],
  fence: ['wide', 'big', () => { let s = R(0, FLOOR - 64, 800, 12, 4, '#F4F1EA') + R(0, FLOOR - 30, 800, 12, 4, '#F4F1EA'); for (let x = 6; x < 800; x += 46) s += P(`M${x} ${FLOOR} v-76 l15 -15 l15 15 v76z`, '#FFFFFF'); return s; }],
  balloons: ['floor', 'mid', () => balloon(-26, -132, '#FF6F91') + balloon(4, -160, '#8EC5FF') + balloon(32, -126, '#FFD23F') + R(-10, -8, 20, 8, 4, '#9AA5B1')],
  cake: ['floor', 'mid', () => R(-54, -52, 108, 52, 12, '#FFB3C7') + R(-54, -52, 108, 13, 6, '#FFFFFF') + R(-36, -90, 72, 40, 10, '#FFD6E0') + R(-36, -90, 72, 11, 5, '#FFFFFF') + R(-15, -112, 6, 22, 2, '#6FA8DC') + R(5, -112, 6, 22, 2, '#FFD23F') + E(-12, -119, 4, 7, '#FFB547') + E(8, -119, 4, 7, '#FFB547') + O(-30, -30, 5, '#FF6F91') + O(0, -26, 5, '#7BC67E') + O(30, -30, 5, '#8EC5FF')],
  gift: ['floor', 'small', () => R(-30, -52, 60, 52, 8, '#6FA8DC') + R(-6, -52, 12, 52, 0, '#FFD23F') + R(-34, -60, 68, 14, 6, '#5C93C9') + E(-11, -66, 11, 7, '#FFD23F', rot(-22, -11, -66)) + E(11, -66, 11, 7, '#FFD23F', rot(22, 11, -66))],
  bouquet: ['floor', 'small', () => O(-14, -58, 11, '#FF6F91') + O(8, -64, 12, '#FFD23F') + O(-2, -74, 10, '#B39DDB') + O(18, -50, 9, '#FF8A65') + E(-26, -46, 9, 5, '#5DBB63', rot(-30, -26, -46)) + P('M-16 0 L-30 -50 h58 L16 0z', '#F4E6CF') + R(-8, -22, 16, 8, 4, '#FF6F91')],
  partyhat: ['floor', 'small', () => P('M-22 0 L0 -62 L22 0z', '#7E57C2') + L('M-14 -22 L14 -22 M-8 -40 L8 -40', '#FFD23F', 4) + O(0, -64, 8, '#FFD23F')],
  frame: ['wall', 'big', (ctx, r) => { const C = ['#FF6F91', '#FFD23F', '#6FA8DC', '#7BC67E', '#FF8A65', '#B39DDB']; let s = R(-64, -52, 128, 104, 8, '#D9A86C') + R(-52, -40, 104, 80, 4, pick(r, ['#F4EAD8', '#E3EEF6', '#2E3A4F'])); s += O(-20 + r() * 20, -10 + r() * 16, 14 + r() * 10, pick(r, C), 'opacity=".9"') + R(4 + r() * 10, -24 + r() * 10, 26, 30 + r() * 14, 6, pick(r, C), 'opacity=".9"') + L(`M-44 ${24 + r() * 8} q30 ${-20 - r() * 10} 88 0`, pick(r, C), 6); return s; }],
  pedestal: ['floor', 'mid', () => R(-36, -92, 72, 92, 6, '#F4F1EA') + R(-46, -100, 92, 13, 5, '#FFFFFF') + R(-46, -12, 92, 12, 4, '#E6E1D6')],
  rope: ['floor', 'mid', () => L('M-60 -66 Q0 -30 60 -66', '#C0392B', 7) + R(-65, -78, 10, 78, 4, '#D9A86C') + R(55, -78, 10, 78, 4, '#D9A86C') + O(-60, -80, 8, '#E3B57A') + O(60, -80, 8, '#E3B57A') + E(-60, -2, 16, 5, '#D9A86C') + E(60, -2, 16, 5, '#D9A86C')],
  column: ['floor', 'big', () => R(-32, -204, 64, 192, 4, '#F4F1EA') + L('M-16 -192 V-20 M0 -192 V-20 M16 -192 V-20', '#E2DCCF', 4) + R(-46, -218, 92, 20, 6, '#FFFFFF') + R(-46, -16, 92, 16, 5, '#FFFFFF')],
  meltclock: ['floor', 'mid', () => L('M-60 0 L-60 -98', '#8A5A3B', 9) + L('M-60 -90 L56 -112', '#8A5A3B', 7) + P('M-14 -106 q34 -12 46 4 q10 22 4 54 q-4 22 -16 10 q-6 -22 -18 -32 q-22 -8 -16 -36z', '#F2C14E') + P('M-6 -100 q24 -8 32 4 q6 18 2 40 q-8 -14 -16 -22 q-16 -6 -18 -22z', '#FFF6DE') + L('M6 -84 L14 -96 M6 -84 L20 -78', '#2B2B2B', 3)],
  pearl: ['floor', 'small', () => R(-32, -18, 64, 18, 9, '#C0392B') + O(0, -36, 21, '#FBF6EE') + O(-7, -42, 6, '#FFFFFF')],
  grapes: ['floor', 'small', () => { let s = L('M0 -64 q4 -10 10 -14', '#8A5A3B', 4) + E(14, -74, 14, 8, '#7BC67E', rot(-20, 14, -74)); for (const [x, y] of [[-14, -54], [0, -56], [14, -54], [-7, -40], [7, -40], [0, -26], [-14, -42], [14, -42], [0, -12]]) s += O(x, y, 9, '#8E5BB5'); return s + O(-4, -58, 3, '#C9A6E6'); }],
  vase: ['floor', 'small', () => R(-10, -78, 20, 12, 4, '#6FA8DC') + E(0, -38, 28, 38, '#6FA8DC') + L('M-24 -40 q12 -10 24 0 t24 0', '#FFFFFF', 4, 'opacity=".7"')],
  box: ['floor', 'mid', () => R(-46, -66, 92, 66, 6, '#D9A56B') + R(-46, -66, 92, 15, 4, '#C9935A') + R(-8, -66, 16, 32, 2, '#F4E3B5')],
  boxstack: ['floor', 'big', () => R(-56, -72, 112, 72, 6, '#D9A56B') + R(-8, -72, 16, 30, 2, '#F4E3B5') + R(-48, -136, 88, 64, 6, '#E3B57A') + R(-12, -136, 16, 26, 2, '#F4E3B5') + R(-30, -186, 66, 50, 6, '#D9A56B') + R(-2, -186, 12, 20, 2, '#F4E3B5')],
  ladder: ['floor', 'big', () => { let s = L('M-36 0 L-16 -210 M36 0 L16 -210', '#C99B6D', 10); for (let y = -30; y > -200; y -= 34) { const w = 34 - (-y / 210) * 20; s += L(`M${-w} ${y} L${w} ${y}`, '#C99B6D', 8); } return s; }],
  dolly: ['floor', 'mid', () => R(-14, -76, 58, 66, 6, '#D9A56B') + R(4, -76, 14, 26, 2, '#F4E3B5') + L('M-22 -4 L-22 -116 L-6 -132 M-22 -6 L46 -6', '#9AA5B1', 7) + O(-18, -4, 11, '#3A3A46')],
  rack: ['floor', 'big', () => { let s = L('M-82 0 L-82 -176 L82 -176 L82 0', '#9AA5B1', 6) + E(-82, 0, 14, 4, '#9AA5B1') + E(82, 0, 14, 4, '#9AA5B1'); const C = ['#FF8FB1', '#8EC5FF', '#FFD166', '#7BC67E']; [-54, -18, 18, 54].forEach((x, i) => { s += L(`M${x} -176 v8`, '#7A848E', 3) + P(`M${x - 22} -160 q22 -12 44 0 l6 14 h-8 v${i % 2 ? 60 : 80} h-40 v-${i % 2 ? 60 : 80} h-8z`, C[i]); }); return s; }],
  socks: ['floor', 'small', () => P('M-28 -54 h16 v34 q0 8 10 8 h8 v12 h-26 q-8 0 -8 -8z', '#FF8FB1') + R(-28, -54, 16, 8, 3, '#FFFFFF') + P('M4 -48 h16 v30 q0 8 10 8 h8 v10 h-26 q-8 0 -8 -8z', '#8EC5FF') + R(4, -48, 16, 8, 3, '#FFFFFF')],
  sweater: ['floor', 'small', () => R(-32, -28, 64, 28, 8, '#9575CD') + R(-32, -28, 64, 9, 4, '#7E57C2') + L('M-10 -18 q5 6 0 12 M10 -18 q-5 6 0 12', '#B39DDB', 3)],
  pants: ['floor', 'small', () => R(-28, -24, 56, 24, 6, '#5C7FB8') + R(-28, -24, 56, 7, 3, '#4A6DA6') + L('M0 -16 V-2', '#4A6DA6', 3)],
  stool: ['floor', 'small', () => L('M-18 -40 L-24 0 M18 -40 L24 0 M-20 -18 H20', '#B5814D', 6) + R(-28, -48, 56, 12, 6, '#C99B6D')],
  skateboard: ['floor', 'small', () => R(-42, -20, 84, 10, 5, '#FF6F61') + L('M-30 -12 v6 M30 -12 v6', '#9AA5B1', 4) + O(-28, -5, 6, '#3A3A46') + O(28, -5, 6, '#3A3A46')],
  guitar: ['floor', 'mid', () => G('rotate(12)', R(-4, -146, 8, 84, 3, '#8A5A3B') + R(-9, -160, 18, 18, 4, '#6B3F1D') + E(0, -36, 30, 28, '#E08A3C') + E(0, -64, 23, 19, '#E08A3C') + O(0, -48, 8, '#6B3F1D') + R(-10, -24, 20, 5, 2, '#6B3F1D'))],
  mic: ['floor', 'mid', () => E(0, -3, 24, 7, '#3A3A46') + L('M0 -6 L0 -122', '#7A7A86', 5) + R(-8, -152, 16, 32, 8, '#3A3A46') + O(0, -152, 11, '#9AA5B1')],
  plane: ['wall', 'small', () => L('M-120 30 q40 -40 80 -10 t60 -20', '#FFFFFF', 3, 'stroke-dasharray="6 10" opacity=".8"') + P('M-40 0 L42 -18 L-10 14 Z', '#FFFFFF') + P('M-10 14 L42 -18 L0 4Z', '#E6E1D6')],
  wand: ['floor', 'small', () => L('M0 0 L-6 -62', '#FF8FB1', 5) + O(-7, -73, 12, 'none', 'stroke="#FF8FB1" stroke-width="4"')],
  umbrella: ['floor', 'big', () => L('M0 0 L0 -172', '#E6E1D6', 6) + P('M-112 -150 Q0 -238 112 -150 Z', '#FF6F91') + P('M-68 -150 Q-44 -200 -22 -208 L-24 -150Z', '#FFFFFF') + P('M24 -150 L22 -208 Q44 -200 68 -150Z', '#FFFFFF') + O(0, -214, 6, '#FFD23F')],
  sandcastle: ['floor', 'mid', () => R(-46, -42, 92, 42, 6, '#E9C98C') + R(-30, -78, 60, 40, 6, '#E9C98C') + R(-46, -52, 14, 12, 2, '#E9C98C') + R(32, -52, 14, 12, 2, '#E9C98C') + R(-30, -88, 12, 12, 2, '#E9C98C') + R(18, -88, 12, 12, 2, '#E9C98C') + R(-8, -24, 16, 24, 8, '#C9A56A') + L('M0 -88 V-118', '#8A5A3B', 3) + P('M0 -118 l18 6 l-18 6z', '#FF6F61')],
  shell: ['floor', 'small', () => P('M-26 0 Q-30 -36 0 -40 Q30 -36 26 0 Z', '#FFB3A7') + L('M0 -2 L0 -36 M0 -2 L-14 -32 M0 -2 L14 -32 M0 -2 L-22 -18 M0 -2 L22 -18', '#F28C8C', 3) + E(0, 0, 10, 4, '#F28C8C')],
  gardenbed: ['floor', 'big', () => { let s = R(-124, -32, 248, 32, 10, '#B5814D') + R(-114, -40, 228, 14, 7, '#6B4A2F'); for (let x = -94; x <= 94; x += 31) s += L(`M${x} -38 L${x} -60`, '#5DAA55', 4) + E(x - 8, -62, 9, 5, '#6CC47A', rot(-30, x - 8, -62)) + E(x + 8, -64, 9, 5, '#6CC47A', rot(30, x + 8, -64)); return s; }],
  wateringcan: ['floor', 'small', () => L('M16 -30 L42 -54', '#7BC67E', 7) + E(44, -56, 8, 5, '#5DAA55', rot(-40, 44, -56)) + L('M-24 -36 q-18 4 -8 26', '#7BC67E', 6) + R(-24, -44, 42, 44, 9, '#7BC67E')],
  shovel: ['floor', 'small', () => L('M0 -28 L0 -100', '#C68C52', 7) + R(-12, -110, 24, 9, 4, '#C68C52') + P('M-15 0 q0 -26 15 -30 q15 4 15 30z', '#9AA5B1')],
  cone: ['floor', 'small', () => R(-34, -7, 68, 9, 4, '#FF7A3D') + P('M-28 -2 L-10 -66 h20 L28 -2z', '#FF7A3D') + P('M-21 -26 h42 l-4 -15 h-34z', '#FFFFFF')],
  rocks: ['floor', 'small', () => E(-18, -15, 27, 17, '#A8A29A') + E(16, -13, 21, 14, '#9A948C') + E(0, -28, 17, 12, '#B8B2AA') + E(-6, -32, 5, 3, '#CFC9C1')],
  wrench: ['floor', 'small', () => L('M-30 -4 L18 -44', '#9AA5B1', 10) + O(26, -52, 15, '#9AA5B1') + R(22, -66, 10, 16, 3, '#7A848E', rot(40, 27, -58)) + O(-30, -4, 8, '#9AA5B1')],
  bolt: ['floor', 'small', () => R(-7, -74, 14, 44, 3, '#BFCBD3') + R(-16, -82, 32, 12, 4, '#AEB9C2') + P('M-24 -12 L-24 -32 L0 -44 L24 -32 L24 -12 L0 0Z', '#BFCBD3') + O(0, -22, 9, '#8C97A1')],
  tape: ['floor', 'small', () => R(18, -12, 54, 10, 2, '#FFF6C8') + L('M28 -12 v4 M38 -12 v6 M48 -12 v4 M58 -12 v6', '#B08A3A', 2) + O(0, -24, 24, '#FFD23F') + O(0, -24, 9, '#3A3A46')],
  barrier: ['floor', 'mid', () => L('M-58 -70 L-66 0 M-58 -70 L-48 0 M58 -70 L48 0 M58 -70 L66 0', '#9AA5B1', 5) + R(-74, -78, 148, 24, 5, '#FFFFFF') + P('M-60 -78 h18 l-18 24 h-14z M-24 -78 h18 l-18 24 h-18z M12 -78 h18 l-18 24 h-18z M48 -78 h18 l-18 24 h-18z', '#FF7A3D')],
  hardhat: ['floor', 'small', () => R(-40, -8, 80, 9, 4, '#F2C14E') + P('M-32 -2 q0 -38 32 -38 q32 0 32 38z', '#FFD23F') + R(-4, -40, 8, 34, 3, '#F2C14E')],
  pipe: ['floor', 'mid', () => L('M-62 -4 L-62 -64 L22 -64 L22 -108', '#9AA5B1', 18) + R(-74, -12, 24, 12, 4, '#BFCBD3') + R(10, -118, 24, 12, 4, '#BFCBD3') + R(-74, -76, 24, 24, 6, '#BFCBD3')],
  phone: ['floor', 'small', (ctx) => G('rotate(-8)', R(-22, -74, 44, 74, 9, '#3A3A46') + R(-17, -67, 34, 58, 5, ctx.night ? '#9EE7FF' : '#CFE9F2') + R(-11, -58, 10, 10, 3, '#FF8FB1') + R(3, -58, 10, 10, 3, '#FFD23F') + R(-11, -42, 10, 10, 3, '#7BC67E') + R(3, -42, 10, 10, 3, '#8EC5FF'))],
  tree: ['floor', 'big', () => R(-13, -116, 26, 116, 9, '#8A5A3B') + O(-42, -132, 42, '#4FA957') + O(44, -134, 42, '#4FA957') + O(0, -160, 64, '#5DBB63') + O(12, -198, 38, '#6CC47A') + E(-20, -176, 14, 18, '#7BCF85', 'opacity=".6"')],
  bush: ['floor', 'mid', () => O(-32, -28, 30, '#4FA957') + O(10, -40, 38, '#5DBB63') + O(42, -24, 26, '#4FA957') + R(-62, -22, 124, 22, 11, '#4FA957')],
  lantern: ['floor', 'small', () => L('M0 -84 V-70', '#3A3A46', 4) + O(0, -88, 6, 'none', 'stroke="#3A3A46" stroke-width="3"') + R(-18, -70, 36, 8, 4, '#3A3A46') + R(-16, -64, 32, 50, 9, '#FFB547') + R(-18, -16, 36, 10, 4, '#3A3A46') + R(-6, -54, 12, 26, 6, '#FFE8A3')],
  mushroom: ['floor', 'small', () => R(-9, -32, 18, 32, 7, '#F4EAD8') + P('M-32 -28 q0 -32 32 -32 q32 0 32 32z', '#E85D5D') + O(-13, -44, 5, '#FFFFFF') + O(11, -50, 4, '#FFFFFF') + O(18, -36, 3, '#FFFFFF')],
  campfire: ['floor', 'mid', () => L('M-40 -4 L36 -22 M-36 -22 L40 -4', '#8A5A3B', 11) + P('M-24 -16 q-4 -40 18 -66 q-2 26 14 36 q4 -16 12 -22 q8 30 -8 52z', '#FF7A3D') + P('M-10 -18 q0 -24 10 -36 q4 18 12 22 q2 10 -4 14z', '#FFD23F') + E(-30, -2, 10, 6, '#9A948C') + E(30, -2, 10, 6, '#9A948C')],
  tent: ['floor', 'big', () => P('M-116 0 L0 -156 L116 0Z', '#FF8A65') + P('M-116 0 L0 -156 L-40 0Z', '#F27A55') + P('M-32 0 L0 -104 L32 0Z', '#7A3E2B') + L('M0 -156 L0 -176', '#8A5A3B', 5) + P('M0 -176 l18 5 l-18 6z', '#FFD23F')],
  kite: ['wall', 'mid', () => L('M0 52 q22 40 -10 82 q-22 30 10 62', '#FFFFFF', 2) + P('M-4 92 l-10 -8 v16z M-6 136 l10 -8 v16z', '#FFD23F') + P('M0 -42 L30 0 L0 52 L-30 0Z', '#FF6F91') + L('M0 -42 L0 52 M-30 0 L30 0', '#FFFFFF', 3)],
  /* effects */
  bubbles: ['fx', 'near'], steam: ['fx', 'near'], confetti: ['fx', 'all'], snow: ['fx', 'all'], leaves: ['fx', 'all'],
  stars: ['glowfx'], fireflies: ['glowfx'], spotlight: ['glowfx'],
};

const HALF = { bed: 178, sofa: 150, tub: 132, car: 114, desk: 124, umbrella: 114, tent: 118, gardenbed: 126, rack: 90, rug: 170 };
const GLOWS = { lamp: [0, -172, 70, '#FFE8A3'], lantern: [0, -40, 60, '#FFB547'], campfire: [0, -36, 90, '#FFB547'], moon: [0, 0, 80, '#FFF1A8'], bulb: [0, 0, 80, '#FFE066'], tv: [0, -78, 80, '#9EE7FF'], phone: [0, -38, 46, '#9EE7FF'], cake: [-2, -120, 30, '#FFB547'], desk: [-24, -122, 50, '#9EE7FF'], window: [0, 0, 70, '#FFF1A8'] };

/* ---------------- scene assembly ---------------- */
export function parseScene(str) { const [bd, mood, title, props] = str.split('|'); return { bd, mood, title, props: props.split(',') }; }

export function renderScene(sc, seed, { uid = 's' } = {}) {
  const r = rng(seed * 7919 + 13);
  const M = MOODS[sc.mood] || MOODS.day;
  const ctx = { night: sc.mood === 'night', skyMid: M.sky[1] };
  const flip = r() < .5 ? -1 : 1;
  const sx = 400 + pick(r, [0, -60, 60, -30, 30]), sy = 432;
  const BD = BACKDROPS[sc.bd] || BACKDROPS.living;

  const slots = {
    big: [[-215, 384], [220, 386], [-330, 356], [334, 358]],
    mid: [[-150, 414], [156, 416], [-268, 432], [272, 434], [-330, 470], [334, 472]],
    small: [[-82, 462], [86, 466], [-168, 476], [174, 478], [-250, 470], [256, 474]],
  };
  const wallSlots = [[150, 118], [650, 108], [300, 70], [530, 160], [420, 84]];
  const used = { big: 0, mid: 0, small: 0 }; let wi = 0;
  const order = ['big', 'mid', 'small'];
  const takeSlot = size => { for (let k = order.indexOf(size); k < 3; k++) { const z = order[k]; if (used[z] < slots[z].length) return slots[z][used[z]++]; } for (let k = order.indexOf(size) - 1; k >= 0; k--) { const z = order[k]; if (used[z] < slots[z].length) return slots[z][used[z]++]; } return [r() * 600 - 300, 470]; };

  let flat = '', wall = '', wide = '', floor = [], fx = '', glowfx = '', glows = [];
  for (const name of sc.props) {
    const def = PROPS[name]; if (!def) continue;
    const [kind, size, draw] = def;
    if (kind === 'flat') { flat += G(`translate(${sx} ${sy + 8}) scale(1)`, draw(ctx, r)); continue; }
    if (kind === 'wide') { wide += draw(ctx, r); continue; }
    if (kind === 'wall') {
      const [x, y] = wallSlots[wi++ % wallSlots.length]; const X = flip < 0 ? 800 - x : x;
      const s = size === 'big' ? 1 : size === 'small' ? .9 : 1;
      wall += G(`translate(${X} ${y}) scale(${s})`, draw(ctx, r));
      if (GLOWS[name]) glows.push([X + GLOWS[name][0], y + GLOWS[name][1], GLOWS[name][2], GLOWS[name][3]]);
      continue;
    }
    if (kind === 'fx') { fx += effect(name, sx, sy, r); continue; }
    if (kind === 'glowfx') { glowfx += effect(name, sx, sy, r); continue; }
    const [dx, y] = takeSlot(size);
    const s = .82 + (y - FLOOR) / 150 * .55;
    const half = (HALF[name] || (size === 'big' ? 80 : size === 'mid' ? 55 : 40)) * s + 8;
    const x = Math.max(half, Math.min(800 - half, sx + dx * flip));
    const mirror = (dx * flip > 0 && ['tub', 'sofa', 'bed', 'car', 'dolly', 'wateringcan', 'duck', 'cat', 'megaphone', 'tape', 'wrench'].includes(name)) ? -1 : 1;
    floor.push({ y, svg: G(`translate(${x} ${y}) scale(${s * mirror} ${s})`, draw(ctx, r)), shadow: E(x, y + 2, (size === 'big' ? 120 : size === 'mid' ? 54 : 32) * s, (size === 'big' ? 14 : 8) * s, '#2B1E10', 'opacity=".22"') });
    if (GLOWS[name]) glows.push([x + GLOWS[name][0] * s * mirror, y + GLOWS[name][1] * s, GLOWS[name][2] * s, GLOWS[name][3]]);
  }
  floor.sort((a, b) => a.y - b.y);

  // the spot: a little clay pad where the Smiski stands
  const pad = E(sx, sy + 8, 66, 17, '#2B1E10', 'opacity=".2"') + E(sx, sy + 2, 56, 16, '#E9E2D4') + E(sx, sy - 2, 56, 15, '#FBF8F2');
  const front = floor.filter(f => f.y > sy + 6), back = floor.filter(f => f.y <= sy + 6);
  const gl = M.glow;

  const defs = `<defs>
    <linearGradient id="${uid}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${M.sky[0]}"/><stop offset="1" stop-color="${M.sky[1]}"/></linearGradient>
    <radialGradient id="${uid}g"><stop offset="0" stop-color="#C6FF9E" stop-opacity=".95"/><stop offset=".45" stop-color="#9BFF6A" stop-opacity=".35"/><stop offset="1" stop-color="#9BFF6A" stop-opacity="0"/></radialGradient>
    <filter id="${uid}clay" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="${seed % 97}" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="lump"/>
      <feGaussianBlur in="lump" stdDeviation="4.5" result="soft"/>
      <feSpecularLighting in="soft" surfaceScale="6" specularConstant=".7" specularExponent="18" lighting-color="#FFF7EA" result="spec"><feDistantLight azimuth="235" elevation="50"/></feSpecularLighting>
      <feComposite in="spec" in2="lump" operator="in" result="specIn"/>
      <feOffset in="soft" dx="-5" dy="-6" result="off"/><feComposite in="lump" in2="off" operator="out" result="rimA"/>
      <feColorMatrix in="rimA" type="matrix" values="0 0 0 0 .12  0 0 0 0 .07  0 0 0 0 .03  0 0 0 .32 0" result="rim"/>
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 .1  0 0 0 0 .06  0 0 0 0 .02  0 0 0 -.55 .32" result="grainA"/>
      <feComposite in="grainA" in2="lump" operator="in" result="grainIn"/>
      <feMerge><feMergeNode in="lump"/><feMergeNode in="rim"/><feMergeNode in="grainIn"/><feMergeNode in="specIn"/></feMerge>
    </filter>
    <filter id="${uid}soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${uid}bd" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="2" seed="${(seed % 50) + 3}" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="4" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="11" result="gr"/><feColorMatrix in="gr" type="matrix" values="0 0 0 0 .1  0 0 0 0 .06  0 0 0 0 .02  0 0 0 -.35 .19" result="ga"/><feComposite in="ga" in2="d" operator="in" result="gi"/><feMerge><feMergeNode in="d"/><feMergeNode in="gi"/></feMerge></filter>
  </defs>`;
  const overlay = M.overlay ? R(0, 0, 800, 500, 0, M.overlay[0], `opacity="${M.overlay[1]}"`) : '';
  const glowSvg = gl ? glows.map(([x, y, rr, c]) => E(x, y, rr, rr, c, `opacity="${.45 * gl}" filter="url(#${uid}soft)"`)).join('') : '';
  const smGlow = E(sx, sy - 34, 110 * (.6 + gl * .5), 90 * (.6 + gl * .5), `url(#${uid}g)`, `opacity="${.35 + gl * .6}"`);
  const ring = E(sx, sy - 2, 56, 15, 'none', `stroke="#8EF05B" stroke-width="3" stroke-dasharray="7 7" opacity="${.55 + gl * .4}"`);

  return `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(sc.title)}, a clay scene">${defs}
    <g filter="url(#${uid}bd)">${BD.d(ctx)}</g>
    <g filter="url(#${uid}clay)">${wide}${wall}</g>
    <g filter="url(#${uid}clay)">${flat}</g>
    <g filter="url(#${uid}soft)">${back.map(f => f.shadow).join('')}</g>
    <g filter="url(#${uid}clay)">${back.map(f => f.svg).join('')}</g>
    <g filter="url(#${uid}clay)">${pad}</g>
    <g filter="url(#${uid}soft)">${front.map(f => f.shadow).join('')}</g>
    <g filter="url(#${uid}clay)">${front.map(f => f.svg).join('')}</g>
    ${fx}${overlay}${glowSvg}${glowfx.replaceAll('SOFT', `url(#${uid}soft)`).replaceAll('GL', String(Math.max(.5, gl)))}${smGlow}${ring}
  </svg>`.replaceAll('url(#sky)', `url(#${uid}sky)`);
}

function effect(name, sx, sy, r) {
  let s = '';
  if (name === 'bubbles') for (let i = 0; i < 11; i++) { const x = sx + (r() - .5) * 230, y = sy - 40 - r() * 170, rr = 6 + r() * 14; s += O(x, y, rr, '#FFFFFF', 'opacity=".42" stroke="#FFFFFF" stroke-width="2"') + O(x - rr * .35, y - rr * .35, rr * .25, '#FFFFFF', 'opacity=".85"'); }
  if (name === 'steam') for (let i = 0; i < 4; i++) { const x = sx - 70 + i * 46 + r() * 12; s += L(`M${x} ${sy - 70} q-14 -22 0 -44 t0 -44 t0 -40`, '#FFFFFF', 9, 'opacity=".4"'); }
  if (name === 'confetti') { const C = ['#FF6F91', '#FFD23F', '#8EC5FF', '#7BC67E', '#B39DDB', '#FF8A65']; for (let i = 0; i < 46; i++) { const x = r() * 800, y = r() * 420; s += R(x, y, 7, 13, 2, pick(r, C), rot(Math.floor(r() * 180), x, y)); } }
  if (name === 'snow') for (let i = 0; i < 55; i++) s += O(r() * 800, r() * 480, 2.5 + r() * 4, '#FFFFFF', 'opacity=".9"');
  if (name === 'leaves') { const C = ['#F2994A', '#E85D5D', '#F2C14E', '#7BC67E']; for (let i = 0; i < 16; i++) { const x = r() * 800, y = 40 + r() * 380; s += E(x, y, 9, 4.5, pick(r, C), rot(Math.floor(r() * 180), x, y)); } }
  if (name === 'stars') for (let i = 0; i < 18; i++) { const x = 20 + r() * 760, y = 14 + r() * 220, k = 4 + r() * 7; s += P(`M${x} ${y - k} Q${x} ${y} ${x + k} ${y} Q${x} ${y} ${x} ${y + k} Q${x} ${y} ${x - k} ${y} Q${x} ${y} ${x} ${y - k}Z`, '#FFF3B0') + O(x, y, k * 1.6, '#FFF3B0', 'opacity=".25" filter="SOFT"'); }
  if (name === 'fireflies') for (let i = 0; i < 18; i++) { const x = 40 + r() * 720, y = 120 + r() * 300; s += O(x, y, 9, '#D9FF7A', 'opacity=".45" filter="SOFT"') + O(x, y, 2.8, '#F4FFB8'); }
  if (name === 'spotlight') s += P(`M${sx - 34} 0 L${sx + 34} 0 L${sx + 120} ${sy + 12} L${sx - 120} ${sy + 12} Z`, '#FFF6C8', 'opacity=".26" filter="SOFT"') + E(sx, sy + 2, 118, 26, '#FFF6C8', 'opacity=".25" filter="SOFT"');
  return s;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
