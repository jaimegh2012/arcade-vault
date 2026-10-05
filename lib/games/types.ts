// Contrato común de los canvas de juego: cada motor usa solo los callbacks que le aplican.
export type GameCanvasProps = {
  paused: boolean;
  // Al cambiar su valor se reinicia la partida
  restartKey: number;
  onScore: (score: number) => void;
  onLives?: (lives: number) => void;
  onLines?: (lines: number) => void;
  onLevel?: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  // El juego pide alternar la pausa del reproductor (tecla P)
  onTogglePause?: () => void;
  // El motor se pausó solo (pestaña oculta); la página debe reflejarlo
  onAutoPause?: () => void;
  // Estilo de dibujo de bloques (juegos con `blockStyles` en el registro)
  blockStyle?: string;
};
