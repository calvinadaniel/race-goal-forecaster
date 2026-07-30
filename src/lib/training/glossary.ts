export type GlossaryTerm = {
  id: string;
  label: string;
  aliases?: string[];
  short: string;
  feel?: string;
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "strides",
    label: "Strides",
    aliases: ["strides"],
    short:
      "Short, fast accelerations (usually 15–30 seconds) with easy jogging between. They wake up your legs without a hard workout.",
    feel: "Quick and smooth — not an all-out sprint.",
  },
  {
    id: "quality",
    label: "Quality",
    aliases: ["quality"],
    short:
      "A harder session (tempo or intervals) meant to improve fitness. Keep easy days easy so quality days stay sharp.",
  },
  {
    id: "easy",
    label: "Easy",
    aliases: ["easy"],
    short:
      "Comfortable pace where you could talk in full sentences. Most weekly miles should feel easy.",
  },
  {
    id: "tempo",
    label: "Tempo",
    aliases: ["easy tempo", "steady tempo", "tempo"],
    short:
      "Sustained running at a comfortably hard effort — harder than easy, controlled enough to hold for a stretch.",
    feel: "Comfortably hard; you can speak a few words, not chat.",
  },
  {
    id: "intervals",
    label: "Intervals",
    aliases: [
      "cruise intervals",
      "goal-pace intervals",
      "intervals",
    ],
    short:
      "Repeated faster segments with recovery jogs or rests between. Builds speed and race-pace familiarity.",
  },
  {
    id: "long-run",
    label: "Long run",
    aliases: ["long run"],
    short:
      "Your longest run of the week. Build endurance gradually; keep most of it easy unless the plan says otherwise.",
  },
  {
    id: "recovery",
    label: "Recovery",
    aliases: ["jog recoveries", "full recoveries", "recovery"],
    short:
      "Easy jogging or standing rest between harder efforts so the next rep stays quality.",
  },
  {
    id: "goal-pace",
    label: "Goal pace",
    aliases: ["goal pace", "near goal pace", "@ ~"],
    short:
      "The pace that matches your goal finish time for the race distance. Plans use it as a target for some quality work.",
  },
  {
    id: "race-pace",
    label: "Race pace",
    aliases: ["race-pace sharpeners", "race-pace", "race pace"],
    short:
      "Running at (or very near) the pace you aim to hold on race day — usually in short doses during peak/taper.",
  },
  {
    id: "optional",
    label: "Optional",
    aliases: ["optional easy", "optional"],
    short:
      "A flexible day. Do it if you feel good; skip or shorten if you're tired — consistency matters more than forcing it.",
  },
  {
    id: "rest",
    label: "Rest",
    aliases: ["rest"],
    short:
      "No run. Sleep, light walking, or easy mobility so the next quality or long run lands better.",
  },
  {
    id: "base",
    label: "Base",
    aliases: ["Base"],
    short:
      "Early phase: build consistent easy miles and habits before heavier quality work.",
  },
  {
    id: "build",
    label: "Build",
    aliases: ["Build"],
    short:
      "Middle phase: volume and quality increase toward your peak weeks.",
  },
  {
    id: "peak",
    label: "Peak",
    aliases: ["Peak"],
    short:
      "Highest training load before taper — fitness is high; recovery still matters.",
  },
  {
    id: "taper",
    label: "Taper",
    aliases: ["Taper", "taper"],
    short:
      "Cut volume before race day so you arrive fresh while keeping a bit of sharpness.",
  },
  {
    id: "deload",
    label: "Deload",
    aliases: ["deload"],
    short:
      "A lighter week every few weeks so fatigue resets and you can absorb training.",
  },
  {
    id: "long",
    label: "Long",
    aliases: [],
    short:
      "Focus badge for the long-run day — usually your biggest endurance session of the week.",
  },
];

/** Map plan day focus → glossary id for badge ⓘ */
export const FOCUS_TERM_IDS: Record<string, string> = {
  easy: "easy",
  quality: "quality",
  long: "long",
  rest: "rest",
  optional: "optional",
  race: "race-pace",
};

export function getTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.id === id);
}
