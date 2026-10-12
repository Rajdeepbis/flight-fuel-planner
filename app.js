// Flight Sim Fuel Planner
// Simplified fuel and time estimates for flight simulator use only.
// Not for real-world flight planning.

const AIRCRAFT = {
  AT76: { name: "ATR 72-600",         tas: 275, burn: 750,  oew: 13500,  mzfw: 21000,  mtow: 23000,  mlw: 22350,  fuelCap: 5000,   refPayload: 6000,  climbExtra: 100,  taxi: 60,  paxDefault: 68 },
  A20N: { name: "Airbus A320neo",     tas: 450, burn: 2300, oew: 44300,  mzfw: 64300,  mtow: 79000,  mlw: 67400,  fuelCap: 18700,  refPayload: 15000, climbExtra: 600,  taxi: 200, paxDefault: 180 },
  A21N: { name: "Airbus A321neo",     tas: 450, burn: 2600, oew: 50100,  mzfw: 75600,  mtow: 97000,  mlw: 79200,  fuelCap: 18400,  refPayload: 18000, climbExtra: 700,  taxi: 220, paxDefault: 220 },
  B738: { name: "Boeing 737-800",     tas: 453, burn: 2500, oew: 41400,  mzfw: 62700,  mtow: 79000,  mlw: 66300,  fuelCap: 20800,  refPayload: 15000, climbExtra: 700,  taxi: 200, paxDefault: 189 },
  A333: { name: "Airbus A330-300",    tas: 470, burn: 5600, oew: 129400, mzfw: 175000, mtow: 242000, mlw: 187000, fuelCap: 109000, refPayload: 30000, climbExtra: 1800, taxi: 400, paxDefault: 290 },
  B789: { name: "Boeing 787-9",       tas: 488, burn: 5800, oew: 128800, mzfw: 181400, mtow: 254000, mlw: 192800, fuelCap: 101300, refPayload: 30000, climbExtra: 1800, taxi: 400, paxDefault: 290 },
  A359: { name: "Airbus A350-900",    tas: 488, burn: 5800, oew: 142400, mzfw: 195700, mtow: 283000, mlw: 207000, fuelCap: 110500, refPayload: 30000, climbExtra: 1800, taxi: 400, paxDefault: 315 },
  B77W: { name: "Boeing 777-300ER",   tas: 490, burn: 7500, oew: 167800, mzfw: 237700, mtow: 351500, mlw: 251300, fuelCap: 145500, refPayload: 40000, climbExtra: 2500, taxi: 500, paxDefault: 380 },
};

const AIRPORTS = [
  ["VECC", "Kolkata", 22.6547, 88.4467],
  ["VIDP", "Delhi", 28.5665, 77.1031],
  ["VABB", "Mumbai", 19.0887, 72.8679],
  ["VOBL", "Bengaluru", 13.1979, 77.7063],
  ["VOMM", "Chennai", 12.9941, 80.1709],
  ["VOHS", "Hyderabad", 17.2403, 78.4294],
  ["VAAH", "Ahmedabad", 23.0772, 72.6347],
  ["VOCI", "Kochi", 10.1520, 76.4019],
  ["VOGO", "Goa (Dabolim)", 15.3808, 73.8314],
  ["VEBD", "Bagdogra", 26.6812, 88.3286],
  ["VEGT", "Guwahati", 26.1061, 91.5859],
  ["VERC", "Ranchi", 23.3143, 85.3217],
  ["VNKT", "Kathmandu", 27.6966, 85.3591],
  ["VGHS", "Dhaka", 23.8433, 90.3978],
  ["VCBI", "Colombo", 7.1808, 79.8841],
  ["OMDB", "Dubai", 25.2532, 55.3657],
  ["OTHH", "Doha", 25.2731, 51.6081],
  ["OERK", "Riyadh", 24.9576, 46.6988],
  ["WSSS", "Singapore", 1.3644, 103.9915],
  ["WMKK", "Kuala Lumpur", 2.7456, 101.7099],
  ["VTBS", "Bangkok", 13.6900, 100.7501],
  ["VHHH", "Hong Kong", 22.3080, 113.9185],
  ["RJTT", "Tokyo Haneda", 35.5494, 139.7798],
  ["YSSY", "Sydney", -33.9399, 151.1753],
  ["LTFM", "Istanbul", 41.2753, 28.7519],
  ["EGLL", "London Heathrow", 51.4700, -0.4543],
  ["LFPG", "Paris CDG", 49.0097, 2.5479],
  ["EDDF", "Frankfurt", 50.0379, 8.5622],
  ["EHAM", "Amsterdam", 52.3105, 4.7683],
  ["KJFK", "New York JFK", 40.6413, -73.7781],
  ["KORD", "Chicago O'Hare", 41.9742, -87.9073],
  ["KATL", "Atlanta", 33.6407, -84.4277],
  ["KLAX", "Los Angeles", 33.9416, -118.4085],
  ["KSFO", "San Francisco", 37.6213, -122.3790],
  ["CYYZ", "Toronto", 43.6777, -79.6248],
].map(([icao, name, lat, lon]) => ({ icao, name, lat, lon }));

const KG_TO_LB = 2.20462;
const PAX_MASS_KG = 100; // passenger + bags

// Great-circle distance in nautical miles (haversine)
function gcDistanceNM(a, b) {
  const R = 3440.065;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Core fuel model. Burn rate scales with aircraft mass.
function planFlight({ ac, distance, headwind, payload, altDistance, contPct, extra }) {
  const refMass = ac.oew + ac.refPayload + 0.3 * ac.fuelCap;
  const gs = ac.tas - headwind;
  if (gs < 100) throw new Error("Headwind is too strong for this aircraft.");

  const airTime = distance / gs + 0.25; // hours, incl. departure/arrival procedures
  const zfw = ac.oew + payload;

  let trip = ac.burn * airTime;
  let cont = 0, alt = 0, finalRes = 0;

  for (let i = 0; i < 8; i++) {
    // Final reserve: 30 min holding at landing weight
    const holdRate = 0.75 * ac.burn * ((zfw + finalRes) / refMass);
    finalRes = 0.5 * holdRate;

    // Alternate: fly to alternate from destination
    const altTime = altDistance > 0 ? altDistance / ac.tas + 0.2 : 0;
    const altRate = ac.burn * ((zfw + finalRes + alt / 2) / refMass);
    alt = altDistance > 0 ? altRate * altTime + ac.climbExtra * 0.5 : 0;

    cont = (contPct / 100) * trip;

    // Trip fuel at average cruise mass
    const midMass = zfw + finalRes + alt + cont + extra + trip / 2;
    const rate = ac.burn * (midMass / refMass);
    trip = rate * airTime + ac.climbExtra;
  }
  cont = (contPct / 100) * trip;

  const takeoffFuel = trip + cont + alt + finalRes + extra;
  const block = takeoffFuel + ac.taxi;
  const tow = zfw + takeoffFuel;
  const lw = tow - trip;

  const warnings = [];
  if (payload > ac.mzfw - ac.oew) warnings.push(`Payload is above the maximum of ${fmt(ac.mzfw - ac.oew)} kg (MZFW exceeded).`);
  if (block > ac.fuelCap) warnings.push(`Block fuel is more than the tank capacity of ${fmt(ac.fuelCap)} kg. This route is out of range with this load.`);
  if (tow > ac.mtow) warnings.push(`Takeoff weight is above MTOW (${fmt(ac.mtow)} kg). Reduce payload or fuel.`);
  if (lw > ac.mlw) warnings.push(`Landing weight is above MLW (${fmt(ac.mlw)} kg).`);

  return { gs, airTime, zfw, trip, cont, alt, finalRes, extra, taxi: ac.taxi, block, tow, lw, warnings };
}

function fmt(n) {
  return Math.round(n).toLocaleString("en-IN");
}

function hhmm(hours) {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

// ---------- UI ----------
if (typeof document !== "undefined") {
  const $ = (id) => document.getElementById(id);
  let unit = "kg";

  const acSel = $("aircraft");
  for (const [code, ac] of Object.entries(AIRCRAFT)) {
    acSel.add(new Option(`${ac.name} (${code})`, code));
  }
  acSel.value = "A20N";

  const list = $("airport-list");
  for (const ap of AIRPORTS) {
    list.append(new Option(`${ap.icao} – ${ap.name}`, ap.icao));
  }

  const findAirport = (code) => AIRPORTS.find((a) => a.icao === code.trim().toUpperCase());

  function onAircraftChange() {
    const ac = AIRCRAFT[acSel.value];
    $("pax").value = Math.round(ac.paxDefault * 0.85);
    $("ac-info").textContent =
      `Cruise ${ac.tas} kt · ~${fmt(ac.burn)} kg/h · Max fuel ${fmt(ac.fuelCap)} kg · MTOW ${fmt(ac.mtow)} kg`;
    calculate();
  }

  function routeDistance() {
    const manual = parseFloat($("manual-dist").value);
    if (manual > 0) return { dist: manual, label: "manual distance" };
    const dep = findAirport($("dep").value);
    const arr = findAirport($("arr").value);
    if (!dep || !arr) return null;
    // add 5% for airways not being a straight line
    return { dist: gcDistanceNM(dep, arr) * 1.05, label: `${dep.icao} → ${arr.icao}` };
  }

  function show(kg) {
    return unit === "kg" ? `${fmt(kg)} kg` : `${fmt(kg * KG_TO_LB)} lb`;
  }

  function calculate() {
    const ac = AIRCRAFT[acSel.value];
    const route = routeDistance();
    const out = $("results");
    if (!route) {
      out.innerHTML = `<p class="hint">Pick a departure and arrival airport (or type a distance) to see your fuel plan.</p>`;
      return;
    }
    const payload =
      (parseFloat($("pax").value) || 0) * PAX_MASS_KG + (parseFloat($("cargo").value) || 0);

    let r;
    try {
      r = planFlight({
        ac,
        distance: route.dist,
        headwind: parseFloat($("wind").value) || 0,
        payload,
        altDistance: parseFloat($("alt-dist").value) || 0,
        contPct: parseFloat($("cont").value) || 0,
        extra: parseFloat($("extra").value) || 0,
      });
    } catch (e) {
      out.innerHTML = `<div class="warn">${e.message}</div>`;
      return;
    }

    const parts = [
      ["Trip", r.trip, "trip"],
      ["Contingency", r.cont, "cont"],
      ["Alternate", r.alt, "alt"],
      ["Final reserve", r.finalRes, "final"],
      ["Extra", r.extra, "extra"],
      ["Taxi", r.taxi, "taxi"],
    ];
    const bar = parts
      .filter(([, v]) => v > 0)
      .map(([n, v, c]) => `<span class="seg ${c}" style="flex:${v}" title="${n}: ${show(v)}"></span>`)
      .join("");

    out.innerHTML = `
      <div class="headline">
        <div><span class="label">Block fuel</span><span class="big">${show(r.block)}</span></div>
        <div><span class="label">Flight time</span><span class="big">${hhmm(r.airTime)}</span></div>
        <div><span class="label">Distance</span><span class="big">${fmt(route.dist)} NM</span></div>
      </div>
      <p class="route">${route.label} · ground speed ${fmt(r.gs)} kt</p>
      <div class="bar">${bar}</div>
      <table>
        ${parts.map(([n, v, c]) => `<tr><td><i class="dot ${c}"></i>${n}</td><td>${show(v)}</td></tr>`).join("")}
        <tr class="total"><td>Block fuel</td><td>${show(r.block)}</td></tr>
      </table>
      <h3>Weights</h3>
      <table>
        <tr><td>Payload</td><td>${show(payload)}</td></tr>
        <tr><td>Zero fuel weight</td><td>${show(r.zfw)} <small>/ ${show(ac.mzfw)}</small></td></tr>
        <tr><td>Takeoff weight</td><td>${show(r.tow)} <small>/ ${show(ac.mtow)}</small></td></tr>
        <tr><td>Landing weight</td><td>${show(r.lw)} <small>/ ${show(ac.mlw)}</small></td></tr>
      </table>
      ${r.warnings.map((w) => `<div class="warn">⚠ ${w}</div>`).join("")}
      ${r.warnings.length === 0 ? `<div class="ok">✓ Within all limits</div>` : ""}
    `;
  }

  document.querySelectorAll("input").forEach((el) => el.addEventListener("input", calculate));
  acSel.addEventListener("change", onAircraftChange);
  $("swap").addEventListener("click", () => {
    [$("dep").value, $("arr").value] = [$("arr").value, $("dep").value];
    calculate();
  });
  document.querySelectorAll("[data-unit]").forEach((btn) =>
    btn.addEventListener("click", () => {
      unit = btn.dataset.unit;
      document.querySelectorAll("[data-unit]").forEach((b) => b.classList.toggle("active", b === btn));
      calculate();
    })
  );

  onAircraftChange();
}

if (typeof module !== "undefined") {
  module.exports = { AIRCRAFT, AIRPORTS, gcDistanceNM, planFlight };
}
