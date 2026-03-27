import gameSpace from "@/assets/game-space.jpg";
import gamePlatform from "@/assets/game-platform.jpg";
import gameRacing from "@/assets/game-racing.jpg";
import gameFighter from "@/assets/game-fighter.jpg";
import gamePuzzle from "@/assets/game-puzzle.jpg";
import gameAdventure from "@/assets/game-adventure.jpg";

export const games = [
  { id: 1, title: "Galactic Blaster", image: gameSpace, rating: 5, category: "Arcade" },
  { id: 2, title: "Pixel Runner", image: gamePlatform, rating: 4, category: "Platformer" },
  { id: 3, title: "Neon Racer", image: gameRacing, rating: 4, category: "Racing" },
  { id: 4, title: "Street Brawler", image: gameFighter, rating: 5, category: "Fighting" },
  { id: 5, title: "Block Smash", image: gamePuzzle, rating: 3, category: "Puzzle" },
  { id: 6, title: "Dungeon Quest", image: gameAdventure, rating: 4, category: "RPG" },
];

export const leaderboard = [
  { rank: 1, name: "NeonBlade", score: 98750, game: "Galactic Blaster" },
  { rank: 2, name: "PixelQueen", score: 87300, game: "Pixel Runner" },
  { rank: 3, name: "RetroKing", score: 76890, game: "Street Brawler" },
  { rank: 4, name: "ArcadePro", score: 65420, game: "Block Smash" },
  { rank: 5, name: "GameMaster", score: 54100, game: "Neon Racer" },
];
