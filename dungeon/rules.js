// Shared by the table server and the player's field journal.
export const STEP = 20;
export const MAX_MOVE_DISTANCE = 100;
export const TURN_DURATION_MS = 60_000;
export const CLASS_STATS = {
  Warrior: {hp:46, bonus:4, range:110, weapon:'sword', attack:'Sword strike'},
  Mage: {hp:32, bonus:4, range:260, weapon:'staff', attack:'Arcane bolt'},
  Rogue: {hp:36, bonus:3, range:230, weapon:'bow', attack:'Bow shot'},
  Healer: {hp:38, bonus:3, range:240, weapon:'staff', attack:'Staff bolt'},
};
