// Narration v3: approved script, OpenAI gpt-4o-mini-tts voice "ash", one
// continuous take per clip, professional delivery. "Uniquem" is sent to the
// TTS as "Uni-kem" so it is pronounced "UniKem" (YOO-nee-kem); captions keep
// the real spelling. Caption times come from faster-whisper word timestamps
// on the final audio (which starts with 0.5 s of silence).
export type Caption = { start: number; end: number; text: string };
export type SceneId = "problem" | "sandweb" | "result";
export type NarratedScene = { id: SceneId; title: string; audio: string; duration: number; captions: readonly Caption[] };
export type NarratedClip = Omit<NarratedScene, "id"> & { id: "close" };

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
        "end": 9.78,
        "text": "As fluid flows toward the wellbore, it pulls sand and fines along with it."
      },
      {
        "start": 10.3,
        "end": 13.96,
        "text": "Those grains naturally repel each other, so they break loose,"
      },
      {
        "start": 14.36,
        "end": 19.26,
        "text": "plug the formation, and travel to surface, wearing down pumps and chokes,"
      },
      {
        "start": 19.7,
        "end": 23.02,
        "text": "forcing cleanouts, and quietly cutting into production."
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
    "audio": "/audio/sandweb/scene-result-v3.mp3",
    "duration": 24.38,
    "captions": [
      {
        "start": 0.5,
        "end": 3.02,
        "text": "Now the well produces the way it should."
      },
      {
        "start": 3.74,
        "end": 6.7,
        "text": "Oil flows freely and at higher rates through a stable,"
      },
      {
        "start": 6.7,
        "end": 10.2,
        "text": "connected sand pack, and the sand stays downhole."
      },
      {
        "start": 10.2,
        "end": 16.3,
        "text": "In Western Canada, operators have seen up to ninety percent less sand flowback."
      },
      {
        "start": 16.92,
        "end": 20.08,
        "text": "That means less wear on equipment, fewer cleanouts,"
      },
      {
        "start": 20.52,
        "end": 23.24,
        "text": "and more production from the wells you already have."
      }
    ]
  }
];

export const closingClip: NarratedClip = {
  "id": "close",
  "title": "",
  "audio": "/audio/sandweb/scene-close-v3.mp3",
  "duration": 7.18,
  "captions": [
    {
      "start": 0.5,
      "end": 3.84,
      "text": "Want to know what SandWeb could do for your wells?"
    },
    {
      "start": 4.76,
      "end": 6.36,
      "text": "Answer a few quick questions."
    }
  ]
};
