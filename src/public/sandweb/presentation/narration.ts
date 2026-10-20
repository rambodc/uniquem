// Generated from the narration script (OpenAI TTS, voice "onyx").
// Caption times are measured from the per-sentence audio clips that were
// joined into each scene MP3 (public/audio/sandweb/).
export type Caption = { start: number; end: number; text: string };
export type NarratedScene = { id: "problem" | "sandweb" | "result"; title: string; audio: string; duration: number; captions: readonly Caption[] };

export const narratedScenes: readonly NarratedScene[] = [
  {
    "id": "problem",
    "title": "The problem: sand on the move",
    "audio": "/audio/sandweb/scene-problem.mp3",
    "duration": 20.52,
    "captions": [
      {
        "start": 0.4,
        "end": 5.15,
        "text": "Deep in a fractured well, sand is supposed to hold the fractures open."
      },
      {
        "start": 5.5,
        "end": 7.95,
        "text": "But loose grains don't stay put."
      },
      {
        "start": 8.3,
        "end": 14.61,
        "text": "Production drags them toward the wellbore, where they grind through pumps, chokes and flowlines."
      },
      {
        "start": 14.96,
        "end": 20.12,
        "text": "The result is downtime, costly cleanouts and lost production."
      }
    ]
  },
  {
    "id": "sandweb",
    "title": "SandWeb: sand consolidation chemistry",
    "audio": "/audio/sandweb/scene-sandweb.mp3",
    "duration": 25.34,
    "captions": [
      {
        "start": 0.4,
        "end": 7.31,
        "text": "This is SandWeb, sand consolidation chemistry from Uniquem. There is nothing else like it on the market."
      },
      {
        "start": 7.66,
        "end": 14.17,
        "text": "Pumped with the frac, or as a stimulation or remedial treatment on producing wells,"
      },
      {
        "start": 14.52,
        "end": 20.04,
        "text": "it threads bonds from grain to grain, locking the sand into a strong, permeable web."
      },
      {
        "start": 20.39,
        "end": 24.95,
        "text": "A cost-effective alternative to resin-coated sand."
      }
    ]
  },
  {
    "id": "result",
    "title": "The result: sand locked, oil flowing",
    "audio": "/audio/sandweb/scene-result.mp3",
    "duration": 20.33,
    "captions": [
      {
        "start": 0.4,
        "end": 5.51,
        "text": "Now oil and gas flow freely, while the sand stays where it belongs."
      },
      {
        "start": 5.86,
        "end": 15.32,
        "text": "Proven across many field trials, SandWeb has saved clients money on production, equipment and sand control, and increased production."
      },
      {
        "start": 15.67,
        "end": 19.92,
        "text": "SandWeb by Uniquem. Available worldwide."
      }
    ]
  }
];
