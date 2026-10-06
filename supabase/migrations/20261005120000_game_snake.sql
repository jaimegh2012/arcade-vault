-- SPEC 09: el placeholder `serpentina` pasa a ser el juego real `snake`.
-- La FK scores.game_id no tiene ON UPDATE CASCADE: se borran antes las
-- filas de prueba del placeholder.
delete from public.scores where game_id = 'serpentina';

update public.games set
  id    = 'snake',
  title = 'SNAKE',
  long  = 'Guía a la serpiente por un tablero de 17×15, come las frutas y crece sin chocar con las paredes ni con tu propio cuerpo. Cada fruta suma 10 puntos y la serpiente avanza a ritmo constante. Si llenas todo el tablero, ganas.'
where id = 'serpentina';
