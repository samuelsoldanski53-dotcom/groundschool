// Presentation metadata for each subject/topic in the question bank.
// Purely organizational (icon, short blurb, accent colour) — never touches
// question text, options, or answers. Falls back gracefully for any
// subject code not listed here (e.g. new subjects added later).
const SubjectsMeta = (() => {
  const META = {
    AGK: {
      icon: '⚙',
      accent: 'amber',
      blurb: 'Airframes, engines, systems, instruments and electrics — how the aircraft itself works.',
    },
    ALW: {
      icon: '⚖',
      accent: 'cyan',
      blurb: 'Regulatory framework, licensing, airworthiness and the rules that govern how you fly.',
    },
    COM: {
      icon: '📡',
      accent: 'sky',
      blurb: 'Standard phraseology and communication procedures for controlled and uncontrolled airspace.',
    },
    FPP: {
      icon: '📐',
      accent: 'violet',
      blurb: 'Mass & balance, performance calculations and flight planning across the aircraft envelope.',
    },
    HPL: {
      icon: '🧠',
      accent: 'success',
      blurb: 'Physiology, perception, stress, fatigue and decision-making — the pilot as a system.',
    },
    MET: {
      icon: '⛅',
      accent: 'cyan',
      blurb: 'Atmosphere, weather systems, hazards and how to read and apply meteorological information.',
    },
    NAV: {
      icon: '🧭',
      accent: 'amber',
      blurb: 'Dead reckoning, radio navigation, charts and the maths of getting from A to B.',
    },
    OPC: {
      icon: '📋',
      accent: 'violet',
      blurb: 'Standard operating procedures, emergencies and operational rules in day-to-day flying.',
    },
    POF: {
      icon: '✈',
      accent: 'sky',
      blurb: 'Aerodynamics and the forces, stability and control behind how an aircraft actually flies.',
    },
    RT: {
      icon: '🎙',
      accent: 'success',
      blurb: 'Radiotelephony procedures and terminology for the Kenyan RTF licence.',
    },
  };

  const FALLBACK = { icon: '📘', accent: 'amber', blurb: 'Study material for this subject.' };

  function get(code) {
    return META[code] || FALLBACK;
  }

  return { get };
})();
