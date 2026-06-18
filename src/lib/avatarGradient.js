const GRADIENTS = [
  { from: '#7C5CFF', to: '#22D3EE' }, // iris → cyan
  { from: '#FF6B81', to: '#FFC857' }, // coral → sun
  { from: '#5EEAD4', to: '#7C5CFF' }, // mint → iris
  { from: '#22D3EE', to: '#5EEAD4' }, // cyan → mint
  { from: '#FFC857', to: '#FF6B81' }, // sun → coral
  { from: '#5B3FE4', to: '#FF6B81' }, // iris-deep → coral
  { from: '#22D3EE', to: '#7C5CFF' }, // cyan → iris
  { from: '#5EEAD4', to: '#FFC857' }, // mint → sun
];

export function getAvatarGradient(username) {
  if (!username) return GRADIENTS[0];
  const hash = username.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}
