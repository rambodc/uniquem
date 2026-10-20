// Narration v4: OpenAI gpt-4o-mini-tts voice "ash", one continuous take per
// clip. Scenes use a professional delivery; the ending uses a warm, upbeat
// delivery (best of 8 takes, long pauses tightened to 0.42 s, +4% tempo).
// "Uniquem" is sent to the TTS as "Uni-kem" so it is pronounced "UniKem";
// captions keep the real spelling. Caption times are aligned to
// faster-whisper word timestamps (first words of each caption chunk).
export type Caption = { start: number; end: number; text: string };
export type SceneId = "problem" | "sandweb" | "result";
export type NarratedScene = { id: SceneId; title: string; audio: string; duration: number; captions: readonly Caption[] };
export type NarratedClip = Omit<NarratedScene, "id"> & { id: "ending" };

export const narratedScenes: readonly NarratedScene[] = [
  {
    "id": "problem",
    "title": "The hidden cost of sand",
    "audio": "/audio/sandweb/scene-problem-v3.mp3",
    "duration": 23.78,
    "captions": [
      {
        "start": 0.5,
        "end": 3.64,
        "text": "Every producing well carries a hidden cost."
      },
      {
        "start": 4.32,
        "end": 6.2,
        "text": "As fluid flows toward the wellbore,"
      },
      {
        "start": 6.7,
        "end": 9.78,
        "text": "it pulls sand and fines along with it."
      },
      {
        "start": 10.3,
        "end": 13.96,
        "text": "Those grains naturally repel each other, so they break loose,"
      },
      {
        "start": 14.36,
        "end": 17.02,
        "text": "plug the formation, and travel to surface,"
      },
      {
        "start": 17.56,
        "end": 20.62,
        "text": "wearing down pumps and chokes, forcing cleanouts,"
      },
      {
        "start": 21.24,
        "end": 23.02,
        "text": "and quietly cutting into production."
      }
    ]
  },
  {
    "id": "sandweb",
    "title": "SandWeb changes the charge",
    "audio": "/audio/sandweb/scene-sandweb-v3.mp3",
    "duration": 21.91,
    "captions": [
      {
        "start": 0.5,
        "end": 3.74,
        "text": "SandWeb, by Uniquem, changes that."
      },
      {
        "start": 4.28,
        "end": 6.94,
        "text": "Pumped into an existing well, or with the frac,"
      },
      {
        "start": 7.36,
        "end": 11.28,
        "text": "it surrounds each grain and reverses the charge that drives them apart."
      },
      {
        "start": 12.04,
        "end": 15.18,
        "text": "Instead of repelling, the grains draw together and hold."
      },
      {
        "start": 15.82,
        "end": 19.02,
        "text": "There's no resin coating and nothing to damage the formation."
      },
      {
        "start": 19.68,
        "end": 21.22,
        "text": "The pore spaces stay open."
      }
    ]
  },
  {
    "id": "result",
    "title": "Sand stays down. Oil flows.",
    "audio": "/audio/sandweb/scene-result-v4.mp3",
    "duration": 22.42,
    "captions": [
      {
        "start": 0.5,
        "end": 3.0,
        "text": "Now the well produces the way it should."
      },
      {
        "start": 3.7,
        "end": 7.08,
        "text": "Oil flows freely and at higher rates through a stable,"
      },
      {
        "start": 7.16,
        "end": 10.56,
        "text": "connected sand pack, and the sand stays downhole."
      },
      {
        "start": 11.34,
        "end": 14.8,
        "text": "Operators have seen up to ninety percent less sand flowback."
      },
      {
        "start": 15.32,
        "end": 18.52,
        "text": "That means less wear on equipment, fewer cleanouts,"
      },
      {
        "start": 18.96,
        "end": 21.62,
        "text": "and more production from the wells you already have."
      }
    ]
  }
];

export const endingClip: NarratedClip = {
  "id": "ending",
  "title": "",
  "audio": "/audio/sandweb/scene-ending-v4.mp3",
  "duration": 12.79,
  "captions": [
    {
      "start": 0.5,
      "end": 2.6,
      "text": "Imagine your wells producing more,"
    },
    {
      "start": 2.87,
      "end": 6.25,
      "text": "with less sand, less downtime, and lower costs."
    },
    {
      "start": 6.81,
      "end": 8.75,
      "text": "That's what SandWeb was built to do."
    },
    {
      "start": 9.05,
      "end": 10.47,
      "text": "So let's talk about your wells."
    },
    {
      "start": 11.1,
      "end": 12.25,
      "text": "How would you like to hear from us?"
    }
  ]
};
