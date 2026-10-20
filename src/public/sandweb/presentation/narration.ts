// Narration v2: conversational script, OpenAI gpt-4o-mini-tts voice "ash",
// one continuous take per scene. "Uniquem" is sent to the TTS as "You-nee-kem"
// so it is pronounced "UniChem"; captions keep the real spelling. Caption
// times come from local speech-to-text word timestamps (faster-whisper) on
// the final audio (which has 0.5 s of lead-in silence).
export type Caption = { start: number; end: number; text: string };
export type NarratedScene = { id: "problem" | "sandweb" | "result"; title: string; audio: string; duration: number; captions: readonly Caption[] };

export const narratedScenes: readonly NarratedScene[] = [
  {
    "id": "problem",
    "title": "The problem: sand on the move",
    "audio": "/audio/sandweb/scene-problem.mp3",
    "duration": 23.28,
    "captions": [
      {
        "start": 0.5,
        "end": 2.86,
        "text": "So here's what's going on down there."
      },
      {
        "start": 3.48,
        "end": 7.4,
        "text": "When you frac a well, you pump sand in to hold those cracks open."
      },
      {
        "start": 8.24,
        "end": 11.46,
        "text": "Problem is, a lot of that sand doesn't stay put."
      },
      {
        "start": 12.3,
        "end": 17.64,
        "text": "Once the well starts flowing, it gets dragged back up and chews through your pumps and chokes."
      },
      {
        "start": 18.22,
        "end": 19.42,
        "text": "And that's where the money goes."
      },
      {
        "start": 20.16,
        "end": 22.54,
        "text": "Downtime, cleanouts, lost production."
      }
    ]
  },
  {
    "id": "sandweb",
    "title": "SandWeb: sand consolidation chemistry",
    "audio": "/audio/sandweb/scene-sandweb.mp3",
    "duration": 26.06,
    "captions": [
      {
        "start": 0.5,
        "end": 2.66,
        "text": "That's what SandWeb is for."
      },
      {
        "start": 3.28,
        "end": 8.74,
        "text": "It's a liquid you pump down, either with the frac, or later on a well that's already producing."
      },
      {
        "start": 9.48,
        "end": 14.5,
        "text": "It gets in there and bonds the grains together, so the sand turns into a kind of web."
      },
      {
        "start": 15.34,
        "end": 18.9,
        "text": "Oil and gas still get through. The sand just doesn't move."
      },
      {
        "start": 19.62,
        "end": 21.9,
        "text": "Honestly, there's nothing else like it out there."
      },
      {
        "start": 22.16,
        "end": 25.04,
        "text": "And it costs less than going with resin-coated sand."
      }
    ]
  },
  {
    "id": "result",
    "title": "The result: sand locked, oil flowing",
    "audio": "/audio/sandweb/scene-result.mp3",
    "duration": 24.31,
    "captions": [
      {
        "start": 0.5,
        "end": 7.8,
        "text": "So now the well just produces. Oil and gas come through clean, and the sand stays where you put it."
      },
      {
        "start": 8.22,
        "end": 10.22,
        "text": "We've proven this in a lot of field trials."
      },
      {
        "start": 10.94,
        "end": 16.8,
        "text": "Clients have saved real money on production, equipment and sand control, and they've seen production go up."
      },
      {
        "start": 17.34,
        "end": 23.54,
        "text": "That's SandWeb, from Uniquem. We ship it all over the world, so give us a call and we'll put a quote together."
      }
    ]
  }
];
