export function generateAnonymousUsername() {
  const adjectives = [
    'Silent', 'Hidden', 'Misty', 'Shadow', 'Secret', 'Quiet', 'Unknown', 'Mysterious', 
    'Cosmic', 'Nebula', 'Echo', 'Ghost', 'Phantom', 'Ethereal', 'Wandering'
  ];
  const nouns = [
    'Writer', 'Student', 'Observer', 'Voice', 'Echo', 'Traveler', 'Dreamer', 'Thinker',
    'Specter', 'Soul', 'Mind', 'Watcher', 'Whisper', 'Shadow', 'Phoenix'
  ];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 10000);
  
  return `${adj}${noun}${num}`;
}