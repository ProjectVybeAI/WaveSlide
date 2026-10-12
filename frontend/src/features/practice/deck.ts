// The practice deck: ten slides and the rules for moving between them. Pure, so the same rules serve
// the keyboard, the engine's command events and the tests.
import type { GlyphPose } from "@/components/hand/glyph";

export type Slide = {
  /** One word under the thumbnail in the deck strip. */
  strip: string;
  title: string;
  body: string;
  pose: GlyphPose;
};

export const SLIDES: Slide[] = [
  {
    strip: "Start",
    title: "Welcome to the practice deck",
    body: "Hold a thumbs up for one second to go live. Then swipe right to reach the next slide. Nothing here touches your real presentation.",
    pose: "THUMBS_UP",
  },
  {
    strip: "Swipe",
    title: "Swipe right for the next slide",
    body: "Sweep your open hand sideways, about two hand lengths, in half a second. A slow drift while you talk does nothing.",
    pose: "SWIPE_RIGHT",
  },
  {
    strip: "Jump",
    title: "Jump here from anywhere",
    body: "Hold up three fingers and keep still. The dial fills for one second, then this slide appears. Let go before it fills and nothing happens.",
    pose: "COUNT_3",
  },
  {
    strip: "Swipe back",
    title: "Swipe left to go back",
    body: "The same sweep the other way returns to the slide before. A second swipe within 0.8 s is ignored, so one wave is one slide.",
    pose: "SWIPE_LEFT",
  },
  {
    strip: "Blank",
    title: "Blank the screen",
    body: "Hold an open palm with the fingers together for 0.8 s. The screen goes black; the same gesture brings it back.",
    pose: "OPEN_PALM",
  },
  {
    strip: "Fingers",
    title: "Count with your fingers",
    body: "One to five fingers jump straight to slides 1 to 5. Hold still until the dial is full; change your hand to cancel.",
    pose: "COUNT_4",
  },
  {
    strip: "Pause",
    title: "Pause to talk freely",
    body: "A thumbs up held for one second pauses WaveSlide, so your hands are free. Hold it again to go live.",
    pose: "THUMBS_UP",
  },
  {
    strip: "Two hands",
    title: "Two hands reach slides 6 to 10",
    body: "With two-hand counting on in Settings, one hand shows five and the other adds one to five. It is off by default because it is easier to misread.",
    pose: "COUNT_5",
  },
  {
    strip: "Exit",
    title: "Exit the slideshow",
    body: "Thumbs down held for one second sends the exit key to your presentation app. Here, it only reminds you.",
    pose: "THUMBS_DOWN",
  },
  {
    strip: "Done",
    title: "That is every gesture",
    body: "A fist starts the slideshow in your presentation app. Switch the app profile in Settings and try it for real.",
    pose: "FIST",
  },
];

export const SLIDE_COUNT = SLIDES.length;

export type Deck = {
  /** 1 to 10. */
  slide: number;
  /** The slide a jump left, shown as "Jumped from" until the next move. */
  from: number | null;
  blank: boolean;
};

export type DeckMove =
  | { type: "next" }
  | { type: "previous" }
  | { type: "jump"; slide: number }
  | { type: "blank" }
  | { type: "reset" };

export const START: Deck = { slide: 1, from: null, blank: false };

export function deckReducer(deck: Deck, move: DeckMove): Deck {
  switch (move.type) {
    case "next":
      // Moving the slide brings the screen back, as it does in PowerPoint.
      return { slide: Math.min(SLIDE_COUNT, deck.slide + 1), from: null, blank: false };
    case "previous":
      return { slide: Math.max(1, deck.slide - 1), from: null, blank: false };
    case "jump":
      if (!Number.isInteger(move.slide) || move.slide < 1 || move.slide > SLIDE_COUNT) return deck;
      return { slide: move.slide, from: move.slide === deck.slide ? null : deck.slide, blank: false };
    case "blank":
      return { ...deck, blank: !deck.blank };
    case "reset":
      return START;
  }
}
