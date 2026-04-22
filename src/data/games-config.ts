export interface GameConfig {
  id: string;
  title: string;
  rom: string;
  core: string;
  description: string;
  bios?: string;
  inputMethod?: 'controller' | 'keyboard';
}

export const GAMES: GameConfig[] = [
  {
    id: 'space-cadet',
    title: 'Space Cadet 3D Pinball',
    rom: 'SpaceCadet/3DPinballSpaceCadet.htm',
    core: 'custom',
    description: 'The Windows classic pinball game',
    inputMethod: 'keyboard',
  },
  {
    id: 'inthunt',
    title: 'In the Hunt',
    rom: 'emulator/mame/inthunt.zip',
    core: 'mame2003_plus',
    description: 'In the Hunt - Classic underwater shooter game',
    inputMethod: 'controller',
  },
  {
    id: 'opwolf',
    title: 'Operation Wolf',
    rom: 'emulator/mame/opwolf.zip',
    core: 'mame2003_plus',
    description: 'Operation Wolf - Classic light gun shooter game',
    inputMethod: 'controller',
  },
  {
    id: 'outrun',
    title: 'Outrun',
    rom: 'emulator/mame/outrun.zip',
    core: 'mame2003_plus',
    description: 'Outrun - Classic racing game',
    inputMethod: 'controller',
  },
  {
    id: 'rtype',
    title: 'R-Type',
    rom: 'emulator/mame/rtype.zip',
    core: 'mame2003_plus',
    description: 'R-Type - Classic shooter game',
    inputMethod: 'controller',
  },
  {
    id: 'mspacman',
    title: 'Ms Pacman',
    rom: 'emulator/mame/mspacman.zip',
    core: 'mame2003_plus',
    description: 'Ms Pacman - Classic maze game',
    inputMethod: 'controller',
  },
  {
    id: 'metal-slug',
    title: 'Metal Slug',
    rom: 'emulator/mame/mslug.zip',
    core: 'mame2003_plus',
    bios: 'emulator/mame/neogeo.zip',
    description: 'Super Vehicle-001 - Classic run and gun arcade',
    inputMethod: 'controller',
  },
  {
    id: 'contra',
    title: 'Contra',
    rom: 'emulator/mame/contra.zip',
    core: 'mame2003_plus',
    description: 'Classic 2d shooter game',
    inputMethod: 'controller',
  },
  {
    id: 'dkong',
    title: 'Donkey Kong',
    rom: 'emulator/mame/dkong.zip',
    core: 'mame2003_plus',
    description: 'Classic platformer',
    inputMethod: 'controller',
  },
  {
    id: 'tetris',
    title: 'Tetris',
    rom: 'tetris.nes',
    core: 'fceumm',
    description: 'Stacking puzzle classic',
    inputMethod: 'controller',
  },
  {
    id: 'ultimate-mk-3',
    title: 'Ultimate Mortal Kombat 3',
    rom: 'emulator/sega-mega-drive/ultimate-mk-3.smd',
    core: 'segaMD',
    bios: 'bios/sega.zip',
    description: 'Classic Sega Mega Drive fighting game',
    inputMethod: 'controller',
  },
];

export const getGameConfig = (slug: string) => GAMES.find((g) => g.id === slug);
