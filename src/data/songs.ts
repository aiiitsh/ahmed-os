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
      {
        fr: "Dedans faut pas que j'aie pied",
        en: 'Inside it, I mustn’t be able to touch the bottom.',
        context: 'Continues the pool of cash: it has to be so deep he can’t even stand. 💸',
        note: 'It’s spelled j’aie (subjunctive), not j’ai. They sound exactly the same.',
        words: [
          { fr: 'Dedans', en: 'inside (the pool)' },
          { fr: 'faut pas', en: 'mustn’t. Il ne faut pas, with il and ne dropped in speech.' },
          { fr: "que j'aie", en: 'that I have. Subjunctive of avoir, always used after il faut que.' },
          { fr: 'avoir pied', en: 'to touch the bottom in water. J’ai pas pied = I can’t touch the bottom / I’m out of my depth.' },
        ],
      },
      {
        fr: 'Le produit est colombien',
        en: 'The product is Colombian.',
        context: 'In rap, le produit is code for drugs, and Colombian hints at cocaine.',
        note: 'Nationality adjectives take no capital in French (un film français), but nouns for people do (un Colombien).',
        words: [
          { fr: 'le produit', en: 'the product. Rap slang for drugs.' },
          { fr: 'est', en: 'is (from être)' },
          { fr: 'colombien', en: 'Colombian' },
        ],
      },
      {
        fr: 'Mais le plug est antillais',
        en: 'But the plug is from the Antilles.',
        context: 'Pairs with the last line: the product comes from Colombia, but the dealer is from the French Caribbean.',
        note: 'Antillais is an adjective, so no capital, just like colombien.',
        words: [
          { fr: 'Mais', en: 'but' },
          { fr: 'le plug', en: 'the supplier / dealer. Borrowed from English rap slang: “the plug” = your connect.' },
          { fr: 'antillais', en: 'from the Antilles, the French Caribbean islands like Guadeloupe and Martinique.' },
        ],
      },
      {
        fr: "J'parle à ma [?]",
        en: 'I talk to my [?]',
        context: 'The last word can’t be made out (Genius doesn’t have it either), so we don’t know who he’s talking to. 🤷',
        note: 'Ma is feminine, so it’s a woman or a feminine noun: ma mère, ma meuf…',
        words: [
          { fr: "J'parle", en: 'I talk (je parle). The e gets swallowed again, like in j’veux.' },
          { fr: 'à ma…', en: 'to my…' },
        ],
      },
      {
        fr: 'Ça me voit comme un animal',
        en: 'They see me as an animal.',
        context: 'People look at him like he’s a beast, something wild and dangerous. 🐺',
        note: 'Ça normally means it / that, but in slang it can mean “they” or “those people”, said in a cold, dismissive way.',
        words: [
          { fr: 'ça', en: 'it / that. In slang: “they”, “those people”.' },
          { fr: 'me voit', en: 'sees me (from voir)' },
          { fr: 'comme', en: 'like, as' },
          { fr: 'un animal', en: 'an animal' },
        ],
      },
      {
        fr: "La plata est radicale, c'est que du business, y'a rien d'amical",
        en: 'Money is ruthless. It’s only business, there’s nothing friendly about it.',
        context: 'Where cash is involved, friendship disappears. 💸',
        note: 'Full proper form: Ce n’est que du business. Il n’y a rien d’amical.',
        words: [
          { fr: 'la plata', en: 'money. Spanish slang borrowed by French rap, like le plug.' },
          { fr: 'radicale', en: 'radical, here harsh or ruthless. Ends in -e because plata is feminine.' },
          { fr: "c'est que du business", en: 'it’s only business (ce n’est que…). Ne… que = only, and the ne is dropped again.' },
          { fr: "y'a", en: 'there is (il y a). In speech, il gets dropped.' },
          { fr: "rien d'amical", en: 'nothing friendly. Rien de + adjective: rien de nouveau = nothing new.' },
        ],
      },
      {
        fr: "L'humain j'l'ai laissé, il m'emboucane",
        en: 'Humans, I left them behind, they get on my nerves.',
        context: 'He’s turned away from people: they annoy him, so he leaves them behind.',
        note: 'L’humain is put first for emphasis, then repeated with l’ and il. Same pattern: Mon frère, je l’aime.',
        words: [
          { fr: "L'humain", en: 'people / humanity' },
          { fr: "j'l'ai laissé", en: 'I left it / them (je l’ai laissé). Laisser in the passé composé.' },
          { fr: "il m'emboucane", en: 'it annoys me. Rare slang; the everyday words are il m’énerve or il me saoule.' },
        ],
      },
      {
        fr: "Ils t'aiment bien une fois qu'tu cannes",
        en: 'They like you once you’re dead.',
        context: 'The bitter idea: people only show love after you die.',
        note: 'Aimer bien is softer than aimer: to like, not to love.',
        words: [
          { fr: "Ils t'aiment bien", en: 'they like you' },
          { fr: 'une fois que', en: 'once, as soon as' },
          { fr: "qu'tu", en: 'que tu, with the e swallowed' },
          { fr: 'canner', en: 'slang for “to die”. Standard: mourir. Other slang: crever.' },
        ],
      },
      {
        fr: "Ils m'ont enfermé pour quelques grammes",
        en: 'They locked me up for a few grams.',
        context: 'He went to prison over a small amount of drugs.',
        note: 'The lyric site writes Il, but it’s Ils (plural, “they”). They sound the same.',
        words: [
          { fr: "Ils m'ont", en: 'they have… me (plural, so Ils)' },
          { fr: 'enfermé', en: 'locked up. Enfermer in the passé composé: avoir + past participle.' },
          { fr: 'pour', en: 'for (giving the reason)' },
          { fr: 'quelques', en: 'a few' },
          { fr: 'des grammes', en: 'grams. In rap this almost always means drugs.' },
        ],
      },
      {
        fr: "C'est quand le procès d'Yahou-Netan",
        en: 'When’s the trial of Yahu-Netan?',
        context: 'Netanyahu’s name flipped around: when will Netanyahu be put on trial? A contrast with him being locked up for a few grams.',
        note: 'Flipping syllables is a rap wordplay trick, close to verlan (l’envers → verlan).',
        words: [
          { fr: "C'est quand…?", en: 'When is…? Casual; formal: Quand est-ce que…?' },
          { fr: 'le procès', en: 'the trial' },
          { fr: "d'Yahou-Netan", en: 'of Netanyahu, with the syllables flipped' },
        ],
      },
    ],
  },
  {
    id: 'coco-acai',
    title: 'Coco Açaï',
    artist: "Willy L'ancien",
    cards: [
      {
        fr: 'Sous popo, le flash, c’est coco açaï',
        en: 'High on “popo”, the rush tastes like coconut-açaí.',
        context: 'The high feels sweet and fruity, and coco may also hint at cocaine. 🥥',
        words: [
          { fr: 'sous', en: 'under. Before a substance it means “high on”: il est sous alcool.' },
          { fr: 'popo', en: 'I can’t confirm this one. It’s probably a nickname for whatever he’s on.' },
          { fr: 'le flash', en: 'the rush from a drug. It also means a camera flash.' },
          { fr: 'coco', en: 'coconut, and slang for cocaine.' },
          { fr: 'açaï', en: 'say “a-sa-ee”. The ç sounds like s.' },
        ],
      },
      {
        fr: 'J’ai du Piatella, j’en veux pas d’ta caille',
        en: 'I’ve got Piatella, I don’t want your “caille”.',
        context: 'He has top-quality hash, so he doesn’t need yours. 🍃',
        words: [
          { fr: 'Piatella', en: 'a premium type of hash.' },
          { fr: 'j’en veux pas', en: 'I don’t want any. The ne is dropped.' },
          { fr: 'd’ta', en: 'de ta (of your). After a negative, “some” becomes de.' },
          { fr: 'caille', en: 'literally a quail. Here it probably means “your stuff”, but that’s a guess.' },
        ],
      },
      {
        fr: 'Ils aiment l’odeur du fric, ont le nez plein de bails de (Mmh)',
        en: 'They love the smell of money, their noses are full of… stuff.',
        context: 'The hum hides the word, and a nose full of something hints at cocaine. 👃',
        words: [
          { fr: 'le fric', en: 'slang for money.' },
          { fr: 'une odeur', en: 'a smell.' },
          { fr: 'des bails', en: 'stuff, shady deals. C’est quoi ce bail ? = What’s going on?' },
          { fr: 'ont', en: '(they) have. The second ils is dropped to keep the rhythm.' },
        ],
      },
      {
        fr: 'J’ai la dégaine à Keyser Söze',
        en: 'I’ve got the look of Keyser Söze.',
        context: 'Keyser Söze is the hidden boss in The Usual Suspects who fools everyone by acting harmless. 🎬',
        words: [
          { fr: 'la dégaine', en: 'your look, the way you walk.' },
          { fr: 'à Keyser', en: 'de Keyser (Keyser’s). Using à for “belonging to” is very common in speech.' },
        ],
      },
      {
        fr: 'Pas cramé, ils m’ont mis sur l’côté',
        en: 'They didn’t catch me, but they pushed me aside.',
        context: 'Nobody saw through him, but he still got sidelined.',
        words: [
          { fr: 'cramé', en: 'literally burnt. Slang for caught or exposed.' },
          { fr: 'ils m’ont mis', en: 'they put me (mettre in the passé composé).' },
          { fr: 'sur l’côté', en: 'to the side.' },
        ],
      },
      {
        fr: 'Maintenant, rien que ça m’propose des lovés',
        en: 'Now they keep offering me cash.',
        context: 'Since he made it, everyone shows up with money. 💸',
        words: [
          { fr: 'rien que', en: 'nothing but, only.' },
          { fr: 'ça', en: '“they / those people”, said in a cold way.' },
          { fr: 'm’propose', en: 'me propose (offer me). The e gets swallowed.' },
          { fr: 'des lovés', en: 'money. The word comes from Romani.' },
        ],
      },
      {
        fr: 'Niquez-vous, c’est tout seul que j’me suis sauvé',
        en: 'Screw you all, I saved myself on my own.',
        context: 'Nobody helped him back then. 😤',
        words: [
          { fr: 'Niquez-vous', en: 'very vulgar. Understand it, don’t use it.' },
          { fr: 'c’est… que', en: 'puts one part in the spotlight: “it’s on my own that…”' },
          { fr: 'tout seul', en: 'all alone.' },
          { fr: 'se sauver', en: 'to save yourself, and also to run away.' },
        ],
      },
      {
        fr: 'Je garde tout à l’intérieur, quelques humains m’ont déçu',
        en: 'I keep everything inside, a few people let me down.',
        context: 'He’s been hurt, so he hides his feelings. 💭',
        words: [
          { fr: 'garder', en: 'to keep.' },
          { fr: 'à l’intérieur', en: 'inside.' },
          { fr: 'quelques', en: 'a few.' },
          { fr: 'déçu', en: 'disappointed, from décevoir. It does NOT mean “to deceive”.' },
        ],
      },
      {
        fr: 'Je trace mon chemin, peu importe ce qui se trouve dessus',
        en: 'I make my own way, whatever’s on it.',
        context: 'He keeps going no matter what.',
        words: [
          { fr: 'tracer son chemin', en: 'to make your own way.' },
          { fr: 'peu importe', en: 'no matter, whatever.' },
          { fr: 'ce qui', en: 'what (as the subject of the next verb).' },
          { fr: 'dessus', en: 'on it. Its opposite is dessous (under it).' },
        ],
      },
      {
        fr: 'Pour toi, j’suis prêt à tout',
        en: 'For you, I’m ready to do anything.',
        context: 'This is the chorus, sung 4 times. ❤️',
        words: [
          { fr: 'j’suis', en: 'je suis. It often sounds like “shwee”.' },
          { fr: 'prêt à tout', en: 'ready to do anything.' },
        ],
      },
      {
        fr: 'C’est Willy la moulaga',
        en: 'It’s Willy “la moulaga”.',
        context: 'He introduces himself with a nickname.',
        words: [
          { fr: 'moulaga', en: 'I can’t confirm this. It probably comes from la moula (money).' },
        ],
      },
      {
        fr: 'Les gitans passent, les chiens aboient',
        en: 'The Gypsies pass by, the dogs bark.',
        context: 'This twists the proverb les chiens aboient, la caravane passe, which means “ignore the haters”. 🐕',
        words: [
          { fr: 'les gitans', en: 'Romani people. Lovés and bédaver come from their language.' },
          { fr: 'aboyer', en: 'to bark.' },
        ],
      },
      {
        fr: 'On est prêt, ramène nous tes gars',
        en: 'We’re ready, bring us your guys.',
        context: 'A challenge: send your crew.',
        words: [
          { fr: 'on', en: 'we, in speech.' },
          { fr: 'ramène-nous', en: 'bring us (a command).' },
          { fr: 'un gars', en: 'a guy. The s is silent.' },
        ],
      },
      {
        fr: 'Échec, échec',
        en: 'Check, check.',
        context: 'Like in chess: he has you trapped. ♟️',
        words: [
          { fr: 'échec', en: 'check, and also failure. Échec et mat = checkmate.' },
        ],
      },
      {
        fr: 'J’ai sali les Botega',
        en: 'I got my Bottegas dirty.',
        context: 'Bottega Veneta is a luxury brand, and he does rough things in expensive gear. 👟',
        words: [
          { fr: 'salir', en: 'to make dirty. Sale = dirty.' },
        ],
      },
      {
        fr: 'Je compte plus les kills, comme Gotaga',
        en: 'I don’t count the kills anymore, like Gotaga.',
        context: 'Gotaga is a famous French Call of Duty gamer. 🎮',
        words: [
          { fr: 'je compte plus', en: 'je ne compte plus. Ne… plus means “not anymore”.' },
          { fr: 'comme', en: 'like.' },
        ],
      },
      {
        fr: 'Toujours mon 9, et un bout d’taga',
        en: 'Always my 9, and a piece of “taga”.',
        context: 'Mon 9 is a 9 mm pistol.',
        words: [
          { fr: 'toujours', en: 'always, still.' },
          { fr: 'un bout de', en: 'a piece of.' },
          { fr: 'taga', en: 'I can’t confirm this. It’s probably hash, since hash comes in a bout.' },
        ],
      },
    ],
  },
]
