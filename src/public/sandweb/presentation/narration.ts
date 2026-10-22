// Narration v5: OpenAI gpt-4o-mini-tts voice "ash", one continuous take per
// scene, professional delivery (same instructions as v3/v4), 0.5 s lead-in and
// 0.3 s tail. There is no spoken ending: after scene 3 the presentation goes
// straight to the "How would you like to hear from us?" contact section.
// "Uniquem" is sent to the TTS as "Uni-kem" so it is pronounced "UniKem";
// captions keep the real spelling. Caption times are aligned to
// faster-whisper word timestamps (first words of each caption chunk).
export type Caption = { start: number; end: number; text: string };
export type SceneId = "problem" | "sandweb" | "result";
export type NarratedScene = { id: SceneId; title: string; audio: string; duration: number; captions: readonly Caption[] };

export const narratedScenes: readonly NarratedScene[] = [
  {
    "id": "problem",
    "title": "The hidden cost of sand",
    "audio": "/audio/sandweb/scene-problem-v5.mp3",
    "duration": 23.98,
    "captions": [
      {
        "start": 0.5,
        "end": 3.62,
        "text": "Every producing well carries a hidden cost."
      },
      {
        "start": 4.2,
        "end": 6.04,
        "text": "As fluid flows toward the wellbore,"
      },
      {
        "start": 6.52,
        "end": 9.12,
        "text": "it pulls sand and fines along with it."
      },
      {
        "start": 9.64,
        "end": 11.78,
        "text": "Those particles disperse in the fluid"
      },
      {
        "start": 11.78,
        "end": 14.72,
        "text": "and either plug the pore throats in the formation,"
      },
      {
        "start": 14.72,
        "end": 19.06,
        "text": "or travel to surface, wearing down pumps and chokes,"
      },
      {
        "start": 19.42,
        "end": 22.84,
        "text": "forcing cleanouts, and quietly cutting into production."
      }
    ]
  },
  {
    "id": "sandweb",
    "title": "SandWeb changes the charge",
    "audio": "/audio/sandweb/scene-sandweb-v5.mp3",
    "duration": 28.73,
    "captions": [
      {
        "start": 0.5,
        "end": 3.94,
        "text": "SandWeb, by Uniquem, provides a solution."
      },
      {
        "start": 4.7,
        "end": 7.96,
        "text": "Pumped into an existing well as part of a stimulation package,"
      },
      {
        "start": 8.38,
        "end": 9.62,
        "text": "or with the frac fluid,"
      },
      {
        "start": 10.12,
        "end": 14.58,
        "text": "it surrounds each grain to increase the friction between the sand particles."
      },
      {
        "start": 15.42,
        "end": 16.64,
        "text": "Instead of dispersing,"
      },
      {
        "start": 17.12,
        "end": 19.58,
        "text": "the particles are consolidated into a web"
      },
      {
        "start": 19.58,
        "end": 23.52,
        "text": "while minimizing the chemical impact on reservoir permeability—"
      },
      {
        "start": 24.1,
        "end": 27.94,
        "text": "helping operators maintain production without compromising flow."
      }
    ]
  },
  {
    "id": "result",
    "title": "Sand stays down. Oil flows.",
    "audio": "/audio/sandweb/scene-result-v5.mp3",
    "duration": 21.48,
    "captions": [
      {
        "start": 0.5,
        "end": 4.04,
        "text": "Now the well can produce at its maximum potential."
      },
      {
        "start": 4.98,
        "end": 8.58,
        "text": "Oil flows freely and at higher rates through a stable,"
      },
      {
        "start": 8.64,
        "end": 9.9,
        "text": "connected sand pack."
      },
      {
        "start": 10.86,
        "end": 14.44,
        "text": "Operators have seen up to ninety percent less sand flowback,"
      },
      {
        "start": 14.76,
        "end": 18.22,
        "text": "leading to less wear on equipment, fewer cleanouts,"
      },
      {
        "start": 18.22,
        "end": 20.66,
        "text": "and more production from their wells."
      }
    ]
  }
];
