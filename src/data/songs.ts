// French song lyrics as flashcards (Learn → French songs).
// To add a song, append to SONGS. To add cards, append to a song's cards: fr on the front, en (and an optional note) on the back.

export interface SongCard {
  fr: string
  en: string
  note?: string
}

export interface Song {
  id: string
  title: string
  artist: string
  cards: SongCard[]
}

export const SONGS: Song[] = [
  {
    id: 'khallini',
    title: 'Khallini',
    artist: "Willy L'ancien",
    cards: [
      { fr: "J'aimerais parler au moi d'avant", en: 'I’d like to talk to the me from before (my past self).', note: 'The singer misses who they used to be, or wants to give their younger self some advice.' },
      { fr: "J'aimerais", en: 'I would like', note: 'Aimer (to like / love) in the conditional: a polite “I’d like”. Same as je voudrais.' },
      { fr: 'parler à', en: 'to talk to' },
      { fr: 'au', en: 'to the (à + le)', note: 'French always merges à + le into au. Je vais au cinéma.' },
      { fr: 'le moi', en: 'the me · myself', note: 'Moi used as a noun: “my self”.' },
      { fr: "d'avant", en: 'from before', note: 'Works like an adjective. Le monde d’avant = the world from before.' },
    ],
  },
]
