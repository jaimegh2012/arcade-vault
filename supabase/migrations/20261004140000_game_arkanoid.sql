-- SPEC 08: el placeholder bloque-buster pasa a ser el juego real arkanoid.
-- scores.game_id no tiene ON UPDATE CASCADE: se borran antes las pruebas del placeholder.
delete from public.scores where game_id = 'bloque-buster';

update public.games set
  id    = 'arkanoid',
  title = 'ARKANOID',
  long  = 'Mueve la paleta, rebota la pelota y derriba los muros de neón. Tienes 3 vidas para superar 5 niveles con patrones distintos: parrilla, pirámide, tablero, huecos y marco con cruz. Cada bloque suma 10 puntos y la pelota se acelera un 10 % en cada nivel.'
where id = 'bloque-buster';
