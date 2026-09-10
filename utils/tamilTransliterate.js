/**
 * Tamil -> English transliteration for admin-entered location text.
 *
 * Location strings must always be stored/displayed in English (consent
 * letters, admin reports). This module converts any Tamil Unicode text to
 * romanized English characters — it transliterates characters (phonetic
 * sound), it does not translate meaning.
 *
 * Two layers:
 *  1. A small curated lookup of known place names, for exact, natural
 *     English spellings (place names have conventional spellings that a
 *     generic phonetic algorithm cannot reliably reproduce).
 *  2. A rule-based Tamil syllable transliterator as a fallback for any
 *     Tamil text not in the lookup, so Tamil script is NEVER stored even
 *     for places we don't have a curated spelling for.
 */

const TAMIL_CHAR_REGEX = /[஀-௿]/;
const TAMIL_RUN_REGEX = /[஀-௿]+/g;

function hasTamilChars(text) {
  return TAMIL_CHAR_REGEX.test(String(text || ''));
}

/**
 * Official city names. When a Tamil run matches one of these, the Tamil
 * word IS that whole city — so the entire location string collapses to
 * just the official English city name (any "- English suffix" alongside
 * it, e.g. "கோயம்புத்தூர் - Koyambuthur", is a redundant re-spelling of
 * the same city and is dropped, not preserved).
 */
const OFFICIAL_CITY_NAMES = {
  'கோயம்புத்தூர்': 'Coimbatore',
  'சென்னை': 'Chennai',
  'மதுரை': 'Madurai',
  'வேலூர்': 'Vellore',
  'திருச்சி': 'Trichy',
  'திருச்சிராப்பள்ளி': 'Tiruchirappalli',
  'காஞ்சிபுரம்': 'Kanchipuram',
};

/**
 * Known sub-locality / area names, keyed by the exact Tamil text (trimmed).
 * Unlike OFFICIAL_CITY_NAMES, these are areas *within* a city, so the
 * existing "Area - City" format is preserved — only the Tamil area name is
 * replaced with its English spelling.
 */
const KNOWN_PLACE_NAMES = {
  'விருதம்பட்டு': 'Virudhambattu',
  'கோசப்பட்டடை': 'Kosapettai',
  'கோசப்பேட்டை': 'Kosapettai',
  'காட்பாடி': 'Katpadi',
};

// Tamil vowel signs (matras) attached to a consonant.
const VOWEL_SIGNS = {
  'ா': 'aa', // ா
  'ி': 'i', // ி
  'ீ': 'ii', // ீ
  'ு': 'u', // ு
  'ூ': 'uu', // ூ
  'ெ': 'e', // ெ
  'ே': 'ee', // ே
  'ை': 'ai', // ை
  'ொ': 'o', // ொ
  'ோ': 'oo', // ோ
  'ௌ': 'au', // ௌ
};

const PULLI = '்'; // ், virama — marks a "dead"/bare consonant.

// Independent (standalone) vowels.
const INDEPENDENT_VOWELS = {
  'அ': 'a',
  'ஆ': 'aa',
  'இ': 'i',
  'ஈ': 'ii',
  'உ': 'u',
  'ஊ': 'uu',
  'எ': 'e',
  'ஏ': 'ee',
  'ஐ': 'ai',
  'ஒ': 'o',
  'ஓ': 'oo',
  'ஔ': 'au',
};

// Unaspirated stop consonants that voice depending on position
// (word-initial/geminate = voiceless, intervocalic/post-nasal = voiced).
const VOICING_CONSONANTS = {
  'க': { voiceless: 'k', voiced: 'g' }, // க
  'ச': { voiceless: 'ch', voiced: 's' }, // ச (voices to the Tamil "s" sound, not "j")
  'ட': { voiceless: 't', voiced: 'd' }, // ட
  'த': { voiceless: 'th', voiced: 'dh' }, // த
  'ப': { voiceless: 'p', voiced: 'b' }, // ப
};

// Other consonants with a single, fixed Roman value (inherent 'a' consonant base).
const FIXED_CONSONANTS = {
  'ங': 'ng', // ங
  'ஜ': 'j', // ஜ
  'ஞ': 'ny', // ஞ
  'ண': 'n', // ண
  'ந': 'n', // ந
  'ன': 'n', // ன
  'ம': 'm', // ம
  'ய': 'y', // ய
  'ர': 'r', // ர
  'ற': 'r', // ற
  'ல': 'l', // ல
  'ள': 'l', // ள
  'ழ': 'zh', // ழ
  'வ': 'v', // வ
  'ஶ': 'sh', // ஶ
  'ஷ': 'sh', // ஷ
  'ஸ': 's', // ஸ
  'ஹ': 'h', // ஹ
};

const NASAL_CONSONANTS = new Set([
  'ங', // ங
  'ஞ', // ஞ
  'ண', // ண
  'ந', // ந
  'ன', // ன
  'ம', // ம
]);

function capitalize(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Phonetic fallback transliterator for one Tamil run (no spaces/punctuation). */
function transliterateTamilRun(run) {
  const chars = Array.from(run);
  let out = '';
  let prevEndedInVowel = false;
  let prevWasNasal = false;

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];

    if (INDEPENDENT_VOWELS[ch]) {
      out += INDEPENDENT_VOWELS[ch];
      prevEndedInVowel = true;
      prevWasNasal = false;
      continue;
    }

    const isVoicing = Object.prototype.hasOwnProperty.call(VOICING_CONSONANTS, ch);
    const isFixed = Object.prototype.hasOwnProperty.call(FIXED_CONSONANTS, ch);

    if (isVoicing || isFixed) {
      const next = chars[i + 1];

      if (next === PULLI) {
        // Bare/dead consonant — either a geminate opener or a true coda.
        const following = chars[i + 2];
        if (following === ch) {
          // Geminate (consonant repeated): keep voiceless. Single-letter
          // codes double (matches convention: "pattu", "Chennai", "Kollam");
          // digraph codes (ch, th) stay single ("pachai", not "pachchai").
          const letter = isVoicing ? VOICING_CONSONANTS[ch].voiceless : FIXED_CONSONANTS[ch];
          out += letter.length === 1 ? letter + letter : letter;
          i += 2; // skip pulli + repeated consonant
          const afterVowel = chars[i + 1];
          if (VOWEL_SIGNS[afterVowel]) {
            out += VOWEL_SIGNS[afterVowel];
            i += 1;
            prevEndedInVowel = true;
          } else {
            out += 'a';
            prevEndedInVowel = true;
          }
          prevWasNasal = false;
          continue;
        }
        // True bare consonant (word/syllable-final), no inherent vowel.
        if (isVoicing) {
          out += prevEndedInVowel || prevWasNasal
            ? VOICING_CONSONANTS[ch].voiced
            : VOICING_CONSONANTS[ch].voiceless;
        } else {
          out += FIXED_CONSONANTS[ch];
        }
        i += 1; // consume pulli
        prevEndedInVowel = false;
        prevWasNasal = NASAL_CONSONANTS.has(ch);
        continue;
      }

      // Consonant carries a vowel sign, or has the inherent 'a'.
      const base = isVoicing
        ? (prevEndedInVowel || prevWasNasal
            ? VOICING_CONSONANTS[ch].voiced
            : VOICING_CONSONANTS[ch].voiceless)
        : FIXED_CONSONANTS[ch];

      if (VOWEL_SIGNS[next]) {
        out += base + VOWEL_SIGNS[next];
        i += 1;
      } else {
        out += base + 'a';
      }
      prevEndedInVowel = true;
      prevWasNasal = false;
      continue;
    }

    // Unknown/unsupported codepoint in the Tamil block — drop silently
    // rather than emit garbage; keeps output readable.
    prevEndedInVowel = false;
    prevWasNasal = false;
  }

  return out;
}

/**
 * Converts a full string (which may mix Tamil and English/numbers/
 * punctuation) into an English-only string. Non-Tamil segments (English
 * words, digits, "-", spaces) are preserved exactly as-is.
 */
function transliterateTamilToEnglish(text) {
  const input = String(text || '');
  if (!hasTamilChars(input)) return input;

  return input.replace(TAMIL_RUN_REGEX, (run) => {
    const known = KNOWN_PLACE_NAMES[run.trim()];
    if (known) return known;
    return capitalize(transliterateTamilRun(run));
  });
}

/**
 * Smart location normalization. Priority:
 *   1. If any Tamil run in the text is a recognized official city name,
 *      the whole location IS that city — return just the official English
 *      city name (an "- English" suffix alongside it is a redundant
 *      re-spelling of the same place and is dropped).
 *   2. Otherwise fall back to area-level transliteration, which preserves
 *      the existing "Area - City" format and only swaps the Tamil area
 *      name for its known/phonetic English spelling.
 *   3. Already-English text (no Tamil characters) is returned unchanged.
 */
function normalizeLocation(text) {
  const input = String(text || '');
  if (!hasTamilChars(input)) return input;

  const runs = input.match(TAMIL_RUN_REGEX) || [];
  for (const run of runs) {
    const officialCity = OFFICIAL_CITY_NAMES[run.trim()];
    if (officialCity) return officialCity;
  }

  return transliterateTamilToEnglish(input);
}

module.exports = {
  hasTamilChars,
  transliterateTamilToEnglish,
  normalizeLocation,
};
