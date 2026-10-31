/* A made-up 180-hole Buggy vs N8 match for testing The 180. Same seed = same match every time.
   Momentum is nudged per 9 holes (FORM) and the seed is picked so the lead swings back and forth a lot. */
(function (root) {
  const SEED = 2776, K = .8;   // picked for lots of swings: 13 lead changes, decided by one stroke
  function sampleMatch() {
    let seed = SEED;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const COURSES = [
      ['Pine Hollow (sample)', '2026-04-11'], ['Osprey Point (sample)', '2026-04-25'], ['Kettle Brook (sample)', '2026-05-09'],
      ['Saltmarsh Links (sample)', '2026-05-30'], ['Granite Ridge (sample)', '2026-06-13'], ['Pine Hollow (sample)', '2026-06-27'],
      ['Mill Pond (sample)', '2026-07-18'], ['Osprey Point (sample)', '2026-08-08'], ['Harbor Lights (sample)', '2026-09-05'],
      ['Kettle Brook (sample)', '2026-10-03'],
    ];
    const PARS = [
      [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5],
      [4, 5, 4, 3, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4],
      [5, 4, 3, 4, 4, 5, 4, 3, 4, 4, 3, 5, 4, 4, 3, 4, 4, 5],
    ];
    // [buggy, n8] form for each 9-hole stretch: negative = playing well
    const FORM = [
      [.10, -.12], [.05, -.05],   // R1: N8 comes out hot
      [-.18, .10], [-.05, .05],   // R2: Buggy answers right back
      [.12, -.15], [.15, -.10],   // R3: N8 goes on a run
      [.08, -.10], [.00, .00],    // R4: N8 builds the big lead
      [-.18, .12], [-.15, .10],   // R5: Buggy storms back
      [-.12, .08], [.00, .00],    // R6: Buggy takes the lead
      [.12, -.12], [.10, -.10],   // R7: N8 swings it back
      [-.06, .04], [.05, -.04],   // R8: trading punches
      [-.12, .08], [-.04, .02],   // R9: Buggy pulls ahead
      [.10, -.10], [-.02, .00],   // R10: N8 makes a charge, back nine is a coin flip
    ];
    const roll = (par, form) => {
      if (rnd() < (par === 5 ? .012 : .004)) return par - 2;   // eagles stay rare
      const x = rnd() + form * K;
      const d = x < .13 ? -1 : x < .5 ? 0 : x < .8 ? 1 : x < .94 ? 2 : x < .985 ? 3 : 4;
      return Math.max(1, par + d);
    };
    const extras = (par, s) => {
      const d = s - par;
      let putts = d <= -1 ? (rnd() < .6 ? 1 : 2) : rnd() < .13 ? 3 : rnd() < .12 ? 1 : 2;
      if (s - putts < 1) putts = s - 1;
      return { putts, lost: d >= 2 && rnd() < .35 ? 1 + (rnd() < .2) : 0, sand: rnd() < (d >= 1 ? .22 : .07) ? 1 : 0 };
    };
    const holes = [];
    for (let i = 0; i < 180; i++) {
      const r = Math.floor(i / 18), par = PARS[r % 3][i % 18], f = FORM[Math.floor(i / 9)];
      const b = roll(par, f[0]), n = roll(par, f[1]);
      const eb = extras(par, b), en = extras(par, n);
      const h = { par, buggy: b, n8: n, putts: { buggy: eb.putts, n8: en.putts }, lost: { buggy: eb.lost, n8: en.lost }, sand: { buggy: eb.sand, n8: en.sand } };
      if (i % 18 === 0) { h.course = COURSES[r][0]; h.date = COURSES[r][1]; }
      holes.push(h);
    }
    return holes;
  }
  root.sampleMatch = sampleMatch;
  if (typeof module !== 'undefined') module.exports = sampleMatch;
})(typeof window !== 'undefined' ? window : globalThis);
