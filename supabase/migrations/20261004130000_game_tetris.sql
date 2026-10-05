-- SPEC 07: el placeholder `caida` pasa a ser `tetris`
-- La FK scores.game_id no tiene ON UPDATE CASCADE: se borran antes las pruebas del placeholder.

delete from public.scores where game_id = 'caida';

update public.games set
  id    = 'tetris',
  title = 'TETRIS',
  long  = 'Siete piezas geométricas caen sobre un tablero de 10×20. Muévelas, rótalas (la pared te ayuda con un pequeño desplazamiento) y suéltalas al instante guiándote por la pieza fantasma. Completa líneas para subir de nivel cada 10: la caída se acelera sin piedad.'
where id = 'caida';
