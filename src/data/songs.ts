// French song lyrics as flashcards (Learn → French songs). One card per lyric line.
// To add a song, append to SONGS. To add a line, append to a song's cards:
// fr on the front; on the back the English meaning, what it means in the song, an optional note and the word-by-word breakdown.

export interface SongWord {
  fr: string
  en: string
}

export interface SongCard {
  fr: string
  en: string
  context?: string
  note?: string
  words: SongWord[]
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
      {
        fr: "J'aimerais parler au moi d'avant",
        en: 'I’d like to talk to the me from before (my past self).',
        context: 'The singer misses who they used to be, or wants to give their younger self some advice. 💭',
        words: [
          { fr: "J'aimerais", en: 'I would like. It’s aimer (to like / love) in the conditional, a polite “I’d like”. Same as je voudrais.' },
          { fr: 'parler à', en: 'to talk to' },
          { fr: 'au', en: 'à + le. French always merges these two: je vais au cinéma.' },
          { fr: 'le moi', en: '“the me”. Here moi is used like a noun, meaning “myself” or “my self”.' },
          { fr: "d'avant", en: 'from before. Avant means before, and d’avant works like an adjective: le monde d’avant = the world from before.' },
        ],
      },
      {
        fr: "Le prévenir de ce qui l'attend",
        en: 'To warn him about what’s waiting for him.',
        context: 'It continues the last line: I’d like to talk to my past self… to warn him about what’s coming. 💭',
        note: 'It’s almost surely ce qui, not ce qu’il. They sound the same when sung!',
        words: [
          { fr: 'prévenir', en: 'to warn' },
          { fr: 'le prévenir', en: 'to warn him (le = the past self)' },
          { fr: 'de', en: 'about' },
          { fr: 'ce qui', en: 'what (the thing that)' },
          { fr: "l'attend", en: 'awaits him. From attendre, “to wait” but also “to await”: ce qui t’attend = what’s waiting for you.' },
        ],
      },
      {
        fr: "Ils vont pas rester les potos d'avant",
        en: 'They won’t stay the buddies from before.',
        context: 'Friends change and drift apart: the people around you won’t stay the same. 💭',
        note: 'Why just pas? The full written form is ne + verb + pas, but in everyday spoken French people almost always drop the ne.\n'
          + 'Written: Je ne sais pas → spoken: Je sais pas (J’sais pas, Chais pas).\n'
          + 'Written: Ils ne vont pas rester → spoken: Ils vont pas rester.\n'
          + 'The pas stays because it carries the “not”; the ne is short and unstressed, so it gets swallowed in fast speech. Songs, and rap especially, sound like real talk.\n'
          + 'Tip: understand both, but always keep the ne in writing and exams.',
        words: [
          { fr: 'Ils vont', en: 'they are going to. Aller + infinitive = the near future.' },
          { fr: 'pas', en: 'not (the ne is dropped in speech)' },
          { fr: 'rester', en: 'to stay / remain. Not “to rest”!' },
          { fr: 'les potos', en: 'buddies / homies, slang for les amis. One friend = un poto.' },
          { fr: "d'avant", en: 'from before, as in le moi d’avant.' },
        ],
      },
      {
        fr: 'Tu vas te détruire en bédavant',
        en: 'You’re going to destroy yourself smoking.',
        context: 'A warning to his past self: smoking weed will wreck him. 💭',
        note: 'En + -ant is the gérondif: it means “while” or “by” doing something. En mangeant = while eating.',
        words: [
          { fr: 'Tu vas', en: 'you are going to. Aller + infinitive = the near future.' },
          { fr: 'te détruire', en: 'to destroy yourself. Détruire = to destroy, te = yourself (reflexive).' },
          { fr: 'en bédavant', en: 'while / by smoking (the gérondif of bédaver).' },
          { fr: 'bédaver', en: 'slang for to smoke, usually weed. It comes from Romani and is common in French rap.' },
        ],
      },
      {
        fr: "J'veux une piscine de billets",
        en: 'I want a pool of bills.',
        context: 'A swimming pool full of cash: dreaming of being rich. 💸',
        note: 'J’veux = Je veux. The e of je gets swallowed in speech, like j’sais and j’suis.',
        words: [
          { fr: "J'veux", en: 'I want (je veux)' },
          { fr: 'une piscine', en: 'a swimming pool' },
          { fr: 'de', en: 'of / full of' },
          { fr: 'des billets', en: 'banknotes, bills. Un billet is also a ticket: un billet de train.' },
        ],
      },
    ],
  },
]
