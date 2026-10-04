// The edit, by SECTION (see WORKFLOW.md §4). Every section's specs cover its lines exactly; count-0 specs are instrumental
// shots placed at song times (downbeats of the analysed grid, ~2.32 s apart at 103.4 BPM).
// Shot kinds live in project/shots-*.ts (EXTRA). Choruses evolve with the occurrence number (o.n).
export type Spec = [kind: string, lines: number, opts?: Record<string, any>];

const chorus = (n: number): Spec[] => [
  ['heroNeon', 2, { n }], // MADE OF WEIGHTS ignites; the echo is its reflection in the wet street
  ['fall', 1, { n }], // zero-point-something: a fall down a shaft of digits (point cloud)
  ['rooftop', 2, { n }], // the rooftop sign, script neon, beacon
  ['windows', 1, { n }], // no one at home: a dark facade, one window lights
  ['adding', 1, { n }], // arithmetic: an adding machine prints the line
  ['blinds', 1, { n }], // a trick of the light: the words are the light through the blinds
  ['reprise', 1, { n }], // made of weights, made of weights: tube by tube
  ['insomnia', 1, { n }], // keeping me up tonight: the sign through the window, on the ceiling
];

const V1: Spec[] = [
  ['casefile', 1], ['fluoro', 1], ['flashlight', 1], ['tiers', 1],
  ['letter', 1], ['sorry', 1], ['smallman', 1], ['levers', 1],
];

export const SECTIONS: Record<string, (occ: number, count: number) => Spec[]> = {
  intro: () => [['opened', 2], ['titleCity', 0, { at: 4.9 }]],
  pre: (o) => (o === 1
    ? [['nolist', 2], ['matmul', 1], ['song', 1]]
    : [['callresp', 4], ['polygraph', 2], ['mean', 2]]),
  chorus: (n) => chorus(n),
  verse: (o) => (o === 1 ? V1 : [['drawer', 1], ['shelf', 1], ['rooms', 1], ['rebuild', 1], ['salt', 1], ['vault', 1], ['bulbq', 1], ['backroom', 1]]),
  bridge: () => [['xray', 1], ['current', 1], ['brain', 1], ['mirror', 1], ['phone', 1], ['clay', 1]],
  breakdown: () => [
    ['serious', 3],
    ['netpass', 0, { at: 162.84 }], // instrumental: a point-cloud neural net, forward passes on the beat, then a dive
    ['whisper2', 1], // the second IT'S WEIGHTS: the net's points form the words
    ['club', 0, { at: 174.54 }], // the jazz trio assembles from the stream of points and plays
    ['signbuild', 0, { at: 179.19 }], // the drum build: the rooftop sign is bent tube by tube
  ],
  final: () => [['meatweights', 1], ['meet', 1], ['ecg', 2], ['sky', 1], ['talk', 1]],
  outro: () => [['beacons', 4], ['hello', 2], ['theEnd', 0, { at: 211.73 }]],
};
