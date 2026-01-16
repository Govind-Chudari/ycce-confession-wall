const ANIMALS = [
    'Panther', 'Tiger', 'Eagle', 'Wolf', 'Falcon', 'Bear', 'Lion',
    'Hawk', 'Phoenix', 'Dragon', 'Raven', 'Fox', 'Leopard', 'Jaguar',
    'Owl', 'Cobra', 'Shark', 'Dolphin', 'Rhino', 'Elephant'
  ]
  
  const ADJECTIVES = [
    'Mysterious', 'Silent', 'Bold', 'Curious', 'Wise', 'Brave',
    'Swift', 'Clever', 'Wild', 'Free', 'Gentle', 'Fierce', 'Noble'
  ]
  
  const ANIMAL_EMOJIS: Record<string, string> = {
    'Panther': '🐆', 'Tiger': '🐯', 'Eagle': '🦅', 'Wolf': '🐺',
    'Falcon': '🦅', 'Bear': '🐻', 'Lion': '🦁', 'Hawk': '🦅',
    'Phoenix': '🔥', 'Dragon': '🐉', 'Raven': '🦅', 'Fox': '🦊',
    'Leopard': '🐆', 'Jaguar': '🐆', 'Owl': '🦉', 'Cobra': '🐍',
    'Shark': '🦈', 'Dolphin': '🐬', 'Rhino': '🦏', 'Elephant': '🐘'
  }
  
  export function generateAnonymousUsername(): string {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    const emoji = ANIMAL_EMOJIS[animal]
    const number = Math.floor(Math.random() * 9999)
    
    return `${adjective} ${animal} ${emoji} #${number}`
  }
  
  export function generateAnonymousAvatar(seed: string): string {
    return `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${seed}`
  }