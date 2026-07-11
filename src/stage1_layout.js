const FLOWER_WAVES = [
  { id: "intro-chain-01", pattern: "chain", startX: 520 },
  { id: "intro-short-01", pattern: "short", startX: 1090 },
  { id: "intro-chain-02", pattern: "chain", startX: 1660 },
  { id: "intro-judge-01", pattern: "judge", startX: 2230 },
  { id: "intro-sustain-01", pattern: "sustain", startX: 2800 },

  { id: "forest-mix-01", pattern: "mixed", startX: 3370 },
  { id: "forest-chain-01", pattern: "chain", startX: 3940 },
  { id: "forest-judge-01", pattern: "judge", startX: 4510 },
  { id: "forest-short-01", pattern: "short", startX: 5080 },
  { id: "forest-mix-02", pattern: "mixed", startX: 5650 },
  { id: "forest-judge-02", pattern: "judge", startX: 6220 },
  { id: "forest-sustain-01", pattern: "sustain", startX: 6790 },
  { id: "forest-judge-03", pattern: "judge", startX: 7360 },

  { id: "rainbow-short-01", pattern: "short", startX: 7930 },
  { id: "rainbow-mix-01", pattern: "mixed", startX: 8500 },
  { id: "rainbow-judge-01", pattern: "judge", startX: 9070 },
  { id: "rainbow-mix-02", pattern: "mixed", startX: 9640 },
  { id: "rainbow-judge-02", pattern: "judge", startX: 10210 },
  { id: "rainbow-mix-03", pattern: "mixed", startX: 10780 },
  { id: "rainbow-mix-04", pattern: "mixed", startX: 11350 },
];

const PATTERNS = {
  chain: [
    ["small", 0, 520],
    ["small", 112, 510],
    ["small", 232, 526],
    ["small", 366, 516],
    ["medium", 548, 500],
  ],
  short: [
    ["small", 0, 524],
    ["small", 164, 506],
    ["small", 326, 530],
    ["small", 506, 512],
    ["medium", 720, 500],
  ],
  sustain: [
    ["small", 0, 528],
    ["medium", 150, 496],
    ["medium", 294, 502],
    ["small", 456, 520],
    ["large", 674, 482],
  ],
  judge: [
    ["small", 0, 526],
    ["small", 116, 514],
    ["medium", 258, 498],
    ["large", 432, 484],
    ["small", 660, 530],
  ],
  mixed: [
    ["small", 0, 524],
    ["medium", 138, 498],
    ["large", 306, 482],
    ["small", 502, 532],
    ["medium", 702, 494],
  ],
};

const PATTERN_LABELS = {
  chain: "連続開花区間",
  short: "短押し区間",
  sustain: "継続水やり区間",
  judge: "高得点判断区間",
  mixed: "混合区間",
};

export const stage1Layout = {
  length: 12500,
  areas: [
    { id: "meadow", startX: 0, endX: 3000 },
    { id: "forest", startX: 3000, endX: 7500 },
    { id: "rainbow-hill", startX: 7500, endX: 12100 },
  ],
  waves: FLOWER_WAVES.map((wave) => ({
    ...wave,
    label: PATTERN_LABELS[wave.pattern],
  })),
  flowers: buildFlowers(),
  frogs: [
    { id: "frog-001", x: 4200, y: 560 },
    { id: "frog-002", x: 6200, y: 560 },
    { id: "frog-003", x: 8350, y: 560 },
    { id: "frog-004", x: 9700, y: 560 },
    { id: "frog-005", x: 10950, y: 560 },
  ],
  birds: [
    { id: "bird-001", triggerX: 8050, direction: "left", y: 310 },
    { id: "bird-002", triggerX: 9300, direction: "right", y: 330 },
    { id: "bird-003", triggerX: 10450, direction: "left", y: 285 },
  ],
  goal: {
    x: 12100,
    y: 470,
  },
};

function buildFlowers() {
  let serial = 1;
  return FLOWER_WAVES.flatMap((wave) =>
    PATTERNS[wave.pattern].map(([type, offsetX, y]) => ({
      id: `flower-${String(serial++).padStart(3, "0")}`,
      type,
      x: wave.startX + offsetX,
      y,
      group: wave.id,
      pattern: wave.pattern,
    })),
  );
}
