// Metres, seconds, +Z forward. Separate depth/height lanes keep the window open.
export const species = [
  {
    id: "remora",
    name: "コバンザメ",
    scientific: "Echeneis naucrates",
    size: 0.68,
    kind: "fish",
    count: 4,
    low: 4,
    note: "細い黒帯と頭の吸着盤。ジンベエザメのそばを泳ぎます。",
  },
  {
    id: "golden_trevally",
    name: "コガネシマアジ",
    scientific: "Gnathanodon speciosus",
    size: 0.42,
    kind: "fish",
    count: 22,
    low: 14,
    note: "黄色と黒い縦帯は若い個体の色。まとまって回遊します。",
  },
  {
    id: "yellowback_fusilier",
    name: "ウメイロモドキ",
    scientific: "Caesio teres",
    size: 0.32,
    kind: "fish",
    count: 64,
    low: 36,
    note: "青い体に黄色い背と尾。水槽の下層に広がる群れです。",
  },
  {
    id: "indian_mackerel",
    name: "グルクマ",
    scientific: "Rastrelliger kanagurta",
    size: 0.36,
    kind: "fish",
    count: 48,
    low: 28,
    note: "銀色の紡錘形。尾の付け根に小さな鰭が並びます。",
  },
  {
    id: "reef_manta",
    name: "ナンヨウマンタ",
    scientific: "Mobula alfredi",
    size: 3.4,
    kind: "ray",
    count: 2,
    low: 2,
    note: "背中にV字に開く白い模様。大きくゆっくり羽ばたきます。",
  },
  {
    id: "giant_manta",
    name: "オニイトマキエイ",
    scientific: "Mobula birostris",
    size: 4.8,
    kind: "ray",
    count: 1,
    low: 1,
    note: "ジャイアントマンタ。幅広い翼と暗い口元が目印です。",
  },
  {
    id: "bentfin_devil_ray",
    name: "ヒメイトマキエイ",
    scientific: "Mobula thurstoni",
    size: 1.7,
    kind: "ray",
    count: 3,
    low: 3,
    note: "小柄で青紫色の背中。口はマンタより腹側にあります。",
  },
];

const TAU = Math.PI * 2;
const fract = (x) => x - Math.floor(x);
const random = (i, salt) =>
  fract(Math.sin(i * 127.1 + salt * 311.7) * 43758.5453);
const schools = {
  golden_trevally: {
    height: 6.7,
    rx: 9.8,
    rz: 5,
    depth: -12,
    speed: 0.065,
    phase: 0.8,
  },
  yellowback_fusilier: {
    height: 2.65,
    rx: 10.6,
    rz: 5.2,
    depth: -11.8,
    speed: -0.06,
    phase: -0.1,
  },
  indian_mackerel: {
    height: 5.3,
    rx: 12.4,
    rz: 4.3,
    depth: -18,
    speed: 0.072,
    phase: 3.7,
  },
};
const rayLanes = {
  reef_manta: [
    { height: 2.75, rx: 9.5, rz: 3.2, depth: -12.5, speed: -0.041, phase: 0.8 },
    { height: 6.8, rx: 10, rz: 2.2, depth: -21.5, speed: -0.037, phase: 3.8 },
  ],
  giant_manta: [
    {
      height: 7.35,
      rx: 8.9,
      rz: 3.8,
      depth: -12.8,
      speed: 0.027,
      phase: -0.65,
    },
  ],
  bentfin_devil_ray: [
    { height: 3.9, rx: 12.1, rz: 4.4, depth: -18, speed: 0.05, phase: 4.1 },
  ],
};

// Deterministic, separated positions in an ellipsoid, avoiding visible rows.
const schoolOffsets = new Map();
for (const animal of species.filter((animal) => schools[animal.id])) {
  const offsets = [],
    length = animal.id === "golden_trevally" ? 3.8 : 5.8;
  for (
    let attempt = 0;
    offsets.length < animal.count && attempt < 20000;
    attempt++
  ) {
    const a = random(attempt, 31) * 2 - 1,
      r = random(attempt, 32) * 2 - 1,
      h = random(attempt, 33) * 2 - 1;
    if (a * a + r * r + h * h > 1) continue;
    const candidate = [a * length * 0.5, r * 0.8, h * 0.66];
    if (
      offsets.some(
        (old) =>
          Math.hypot(...old.map((v, axis) => v - candidate[axis])) <
          animal.size * 1.13,
      )
    )
      continue;
    offsets.push(candidate);
  }
  if (offsets.length !== animal.count)
    throw new Error(`School spacing failed: ${animal.id}`);
  schoolOffsets.set(animal.id, offsets);
}

function orbit(lane, angle, offset, height, scale, out) {
  const rx = lane.rx + offset,
    rz = lane.rz + offset * 0.5;
  out.x = Math.sin(angle) * rx;
  out.y = lane.height + height;
  out.z = lane.depth + Math.cos(angle) * rz;
  out.yaw = Math.atan2(
    Math.cos(angle) * rx * lane.speed,
    -Math.sin(angle) * rz * lane.speed,
  );
  out.roll = -Math.sign(lane.speed) * 0.065;
  out.pitch = 0;
  out.scale = scale;
  return out;
}

// Optional output object avoids allocations in the animation loop and permits
// deterministic full-circuit tests without a WebGL context.
export function communityPose(id, index, time, out = {}) {
  if (id === "remora") {
    const angle = time * 0.033 - 0.12;
    const heading = Math.atan2(-Math.cos(angle) * 8.4, -Math.sin(angle) * 5.3);
    // Escort positions below the belly and beside the rear flank, beyond the
    // maximum lateral tail swing. The same circuit and heading as the host.
    const offsets = [
      [-0.85, -1.1, -0.9],
      [0.85, -1.08, -0.1],
      [-1.05, -0.95, -2.1],
      [0.55, -1.15, -2.9],
    ];
    const [x, y, z] = offsets[index];
    out.x =
      -Math.sin(angle) * 8.4 + Math.cos(heading) * x + Math.sin(heading) * z;
    out.y =
      4.85 +
      Math.sin(angle * 2) * 0.42 +
      y +
      Math.sin(time * 1.1 + index) * 0.035;
    out.z =
      -12 +
      Math.cos(angle) * 5.3 -
      Math.sin(heading) * x +
      Math.cos(heading) * z;
    out.yaw = heading;
    out.roll = 0;
    out.pitch = 0;
    out.scale = 0.92 + index * 0.035;
    return out;
  }
  const school = schools[id];
  if (school) {
    const [along, radial, height] = schoolOffsets.get(id)[index];
    const angle = time * school.speed + school.phase + along / school.rx;
    return orbit(
      school,
      angle,
      radial,
      height + Math.sin(time * 0.5 + along * 0.6) * 0.06,
      0.86 + random(index, 8) * 0.28,
      out,
    );
  }
  const lane = rayLanes[id][Math.min(index, rayLanes[id].length - 1)];
  const angle =
    time * lane.speed +
    lane.phase +
    (id === "bentfin_devil_ray" ? index * 0.48 : 0);
  orbit(
    lane,
    angle,
    0,
    Math.sin(angle * 2) * 0.22 +
      (id === "bentfin_devil_ray" ? index * 0.45 : 0),
    1,
    out,
  );
  out.roll = -0.13 * Math.sign(lane.speed) + Math.sin(angle) * 0.035;
  out.pitch = Math.cos(angle * 2) * 0.025;
  return out;
}

export function swimPhase(index) {
  return random(index, 19) * TAU;
}
