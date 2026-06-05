/* ============================================================
   MundialBet Club 2026 — Plantillas (jugadores por selección)
   Jugadores reales de convocatorias recientes (2024-2026).
   Posiciones: POR (portero) · DEF · MED · DEL. Actualizable.
   Clave = nombre del equipo exactamente como en GROUP_STANDINGS.
   ============================================================ */
(function () {
  const P = (n, name, pos) => ({ n, name, pos });

  const PLAYERS = {
    'Brasil': [
      P(1,'Alisson','POR'), P(23,'Ederson','POR'),
      P(2,'Danilo','DEF'), P(3,'Marquinhos','DEF'), P(4,'Gabriel Magalhães','DEF'), P(6,'Wendell','DEF'), P(14,'Éder Militão','DEF'),
      P(5,'Casemiro','MED'), P(8,'Bruno Guimarães','MED'), P(15,'André','MED'), P(10,'Rodrygo','MED'),
      P(7,'Vinícius Jr.','DEL'), P(9,'Endrick','DEL'), P(11,'Raphinha','DEL'), P(19,'Savinho','DEL'),
    ],
    'Argentina': [
      P(23,'Emiliano Martínez','POR'), P(12,'Gerónimo Rulli','POR'),
      P(4,'Gonzalo Montiel','DEF'), P(13,'Cristian Romero','DEF'), P(6,'Germán Pezzella','DEF'), P(3,'Nicolás Tagliafico','DEF'), P(25,'Lisandro Martínez','DEF'),
      P(7,'Rodrigo De Paul','MED'), P(5,'Leandro Paredes','MED'), P(20,'Alexis Mac Allister','MED'), P(24,'Enzo Fernández','MED'),
      P(10,'Lionel Messi','DEL'), P(22,'Lautaro Martínez','DEL'), P(9,'Julián Álvarez','DEL'), P(11,'Ángel Di María','DEL'),
    ],
    'Uruguay': [
      P(1,'Sergio Rochet','POR'),
      P(2,'José María Giménez','DEF'), P(3,'Ronald Araújo','DEF'), P(22,'Mathías Olivera','DEF'), P(4,'Guillermo Varela','DEF'),
      P(6,'Rodrigo Bentancur','MED'), P(5,'Manuel Ugarte','MED'), P(15,'Federico Valverde','MED'), P(10,'Giorgian de Arrascaeta','MED'),
      P(9,'Darwin Núñez','DEL'), P(21,'Maxi Araújo','DEL'), P(11,'Facundo Pellistri','DEL'), P(7,'Nicolás de la Cruz','MED'),
    ],
    'Panamá': [
      P(1,'Orlando Mosquera','POR'),
      P(3,'Harold Cummings','DEF'), P(5,'Andrés Andrade','DEF'), P(13,'Eric Davis','DEF'), P(15,'Édgar Bárcenas','DEF'),
      P(20,'Aníbal Godoy','MED'), P(6,'Cristian Martínez','MED'), P(8,'Carlos Harvey','MED'), P(17,'Adalberto Carrasquilla','MED'),
      P(9,'José Fajardo','DEL'), P(7,'Ismael Díaz','DEL'), P(19,'Cecilio Waterman','DEL'), P(11,'Eric "Puma" Rodríguez','DEL'),
    ],
    'Francia': [
      P(1,'Mike Maignan','POR'), P(16,'Brice Samba','POR'),
      P(2,'Jules Koundé','DEF'), P(4,'Dayot Upamecano','DEF'), P(5,'William Saliba','DEF'), P(22,'Theo Hernández','DEF'), P(3,'Lucas Digne','DEF'),
      P(8,'Aurélien Tchouaméni','MED'), P(13,'Eduardo Camavinga','MED'), P(14,'Adrien Rabiot','MED'),
      P(10,'Kylian Mbappé','DEL'), P(11,'Ousmane Dembélé','DEL'), P(9,'Marcus Thuram','DEL'), P(7,'Bradley Barcola','DEL'),
    ],
    'España': [
      P(23,'Unai Simón','POR'), P(1,'David Raya','POR'),
      P(2,'Pedro Porro','DEF'), P(4,'Robin Le Normand','DEF'), P(14,'Aymeric Laporte','DEF'), P(3,'Marc Cucurella','DEF'), P(5,'Dani Vivian','DEF'),
      P(16,'Rodri','MED'), P(8,'Fabián Ruiz','MED'), P(6,'Mikel Merino','MED'), P(26,'Pedri','MED'),
      P(9,'Álvaro Morata','DEL'), P(19,'Lamine Yamal','DEL'), P(11,'Nico Williams','DEL'), P(7,'Dani Olmo','DEL'),
    ],
    'Alemania': [
      P(1,'Manuel Neuer','POR'), P(12,'Marc-André ter Stegen','POR'),
      P(2,'Antonio Rüdiger','DEF'), P(4,'Jonathan Tah','DEF'), P(3,'David Raum','DEF'), P(6,'Joshua Kimmich','DEF'), P(23,'Nico Schlotterbeck','DEF'),
      P(8,'Toni Kroos','MED'), P(17,'Florian Wirtz','MED'), P(10,'Jamal Musiala','MED'), P(21,'İlkay Gündoğan','MED'),
      P(9,'Niclas Füllkrug','DEL'), P(7,'Kai Havertz','DEL'), P(13,'Leroy Sané','DEL'), P(19,'Serge Gnabry','DEL'),
    ],
    'Japón': [
      P(1,'Zion Suzuki','POR'),
      P(2,'Yukinari Sugawara','DEF'), P(3,'Shogo Taniguchi','DEF'), P(22,'Maya Yoshida','DEF'), P(16,'Hiroki Ito','DEF'), P(5,'Takehiro Tomiyasu','DEF'),
      P(7,'Wataru Endo','MED'), P(8,'Takefusa Kubo','MED'), P(6,'Hidemasa Morita','MED'), P(10,'Takumi Minamino','MED'),
      P(9,'Daizen Maeda','DEL'), P(11,'Kaoru Mitoma','DEL'), P(14,'Junya Ito','DEL'), P(15,'Ayase Ueda','DEL'),
    ],
    'México': [
      P(1,'Guillermo Ochoa','POR'), P(13,'Luis Malagón','POR'),
      P(2,'Israel Reyes','DEF'), P(3,'César Montes','DEF'), P(15,'Johan Vásquez','DEF'), P(23,'Jesús Gallardo','DEF'),
      P(4,'Edson Álvarez','MED'), P(8,'Carlos Rodríguez','MED'), P(16,'Luis Romo','MED'), P(11,'Orbelín Pineda','MED'),
      P(9,'Raúl Jiménez','DEL'), P(22,'Hirving Lozano','DEL'), P(10,'Alexis Vega','DEL'), P(19,'Santiago Giménez','DEL'),
    ],
    'EE.UU.': [
      P(1,'Matt Turner','POR'),
      P(2,'Sergiño Dest','DEF'), P(3,'Chris Richards','DEF'), P(4,'Tyler Adams','DEF'), P(5,'Antonee Robinson','DEF'), P(13,'Tim Ream','DEF'),
      P(8,'Weston McKennie','MED'), P(6,'Yunus Musah','MED'), P(10,'Christian Pulisic','MED'),
      P(11,'Brenden Aaronson','DEL'), P(9,'Folarin Balogun','DEL'), P(7,'Giovanni Reyna','MED'), P(20,'Ricardo Pepi','DEL'),
    ],
    'Canadá': [
      P(1,'Maxime Crépeau','POR'), P(18,'Dayne St. Clair','POR'),
      P(2,'Alistair Johnston','DEF'), P(4,'Kamal Miller','DEF'), P(5,'Steven Vitória','DEF'), P(3,'Sam Adekugbe','DEF'),
      P(13,'Stephen Eustáquio','MED'), P(7,'Liam Millar','DEL'), P(6,'Ismaël Koné','MED'),
      P(10,'Jonathan David','DEL'), P(11,'Tajon Buchanan','DEL'), P(19,'Alphonso Davies','DEF'), P(9,'Cyle Larin','DEL'),
    ],
    'Islandia': [
      P(1,'Elías Rafn Ólafsson','POR'), P(12,'Hákon Rafn Valdimarsson','POR'),
      P(2,'Birkir Már Sævarsson','DEF'), P(5,'Sverrir Ingi Ingason','DEF'), P(14,'Kári Árnason','DEF'), P(18,'Hjörtur Hermannsson','DEF'),
      P(8,'Mikael Anderson','MED'), P(10,'Gylfi Sigurðsson','MED'), P(7,'Jóhann Berg Guðmundsson','MED'), P(17,'Arnór Sigurðsson','MED'),
      P(9,'Albert Guðmundsson','DEL'), P(11,'Andri Guðjohnsen','DEL'), P(21,'Sveinn Aron Guðjohnsen','DEL'),
    ],
    'Inglaterra': [
      P(1,'Jordan Pickford','POR'),
      P(2,'Kyle Walker','DEF'), P(5,'John Stones','DEF'), P(6,'Marc Guéhi','DEF'), P(3,'Levi Colwill','DEF'), P(12,'Kieran Trippier','DEF'),
      P(4,'Declan Rice','MED'), P(8,'Jude Bellingham','MED'), P(22,'Cole Palmer','MED'),
      P(9,'Harry Kane','DEL'), P(7,'Bukayo Saka','DEL'), P(11,'Phil Foden','DEL'), P(10,'Jack Grealish','DEL'),
    ],
    'Países Bajos': [
      P(1,'Bart Verbruggen','POR'),
      P(2,'Denzel Dumfries','DEF'), P(4,'Virgil van Dijk','DEF'), P(3,'Matthijs de Ligt','DEF'), P(5,'Nathan Aké','DEF'), P(22,'Lutsharel Geertruida','DEF'),
      P(8,'Tijjani Reijnders','MED'), P(6,'Jerdy Schouten','MED'), P(14,'Teun Koopmeiners','MED'), P(21,'Frenkie de Jong','MED'),
      P(10,'Memphis Depay','DEL'), P(7,'Xavi Simons','MED'), P(18,'Donyell Malen','DEL'), P(9,'Cody Gakpo','DEL'),
    ],
    'Bélgica': [
      P(1,'Koen Casteels','POR'), P(12,'Matz Sels','POR'),
      P(2,'Timothy Castagne','DEF'), P(4,'Wout Faes','DEF'), P(5,'Jan Vertonghen','DEF'), P(15,'Zeno Debast','DEF'), P(3,'Arthur Theate','DEF'),
      P(8,'Youri Tielemans','MED'), P(6,'Amadou Onana','MED'), P(7,'Kevin De Bruyne','MED'),
      P(10,'Leandro Trossard','DEL'), P(11,'Jérémy Doku','DEL'), P(9,'Romelu Lukaku','DEL'), P(22,'Charles De Ketelaere','DEL'),
    ],
    'Suecia': [
      P(1,'Robin Olsen','POR'),
      P(2,'Emil Krafth','DEF'), P(3,'Victor Lindelöf','DEF'), P(4,'Isak Hien','DEF'), P(5,'Ludwig Augustinsson','DEF'),
      P(8,'Albin Ekdal','MED'), P(6,'Hjalmar Ekdal','DEF'), P(10,'Emil Forsberg','MED'), P(16,'Mattias Svanberg','MED'),
      P(9,'Alexander Isak','DEL'), P(11,'Dejan Kulusevski','DEL'), P(7,'Anthony Elanga','DEL'), P(20,'Viktor Gyökeres','DEL'),
    ],
    'Portugal': [
      P(1,'Diogo Costa','POR'),
      P(2,'Diogo Dalot','DEF'), P(3,'Pepe','DEF'), P(4,'Rúben Dias','DEF'), P(5,'Nuno Mendes','DEF'), P(19,'Nélson Semedo','DEF'),
      P(8,'Bruno Fernandes','MED'), P(6,'João Palhinha','MED'), P(16,'Vitinha','MED'), P(10,'Bernardo Silva','MED'),
      P(7,'Cristiano Ronaldo','DEL'), P(11,'João Félix','DEL'), P(17,'Rafael Leão','DEL'), P(21,'Diogo Jota','DEL'),
    ],
    'Italia': [
      P(1,'Gianluigi Donnarumma','POR'),
      P(2,'Giovanni Di Lorenzo','DEF'), P(3,'Alessandro Bastoni','DEF'), P(23,'Riccardo Calafiori','DEF'), P(13,'Federico Dimarco','DEF'),
      P(18,'Nicolò Barella','MED'), P(8,'Jorginho','MED'), P(16,'Bryan Cristante','MED'), P(10,'Lorenzo Pellegrini','MED'),
      P(9,'Gianluca Scamacca','DEL'), P(14,'Federico Chiesa','DEL'), P(11,'Giacomo Raspadori','DEL'), P(20,'Mateo Retegui','DEL'),
    ],
    'Suiza': [
      P(1,'Yann Sommer','POR'),
      P(2,'Silvan Widmer','DEF'), P(5,'Manuel Akanji','DEF'), P(22,'Fabian Schär','DEF'), P(13,'Ricardo Rodríguez','DEF'),
      P(10,'Granit Xhaka','MED'), P(8,'Remo Freuler','MED'), P(15,'Djibril Sow','MED'), P(23,'Xherdan Shaqiri','MED'),
      P(9,'Breel Embolo','DEL'), P(7,'Ruben Vargas','DEL'), P(11,'Renato Steffen','DEL'), P(18,'Zeki Amdouni','DEL'),
    ],
    'Arabia Saudita': [
      P(21,'Nawaf Al-Aqidi','POR'),
      P(3,'Abdulelah Al-Amri','DEF'), P(5,'Ali Al-Bulayhi','DEF'), P(13,'Hassan Tambakti','DEF'), P(2,'Saud Abdulhamid','DEF'), P(4,'Ali Lajami','DEF'),
      P(7,'Salem Al-Dawsari','MED'), P(8,'Abdullah Al-Khaibari','MED'), P(14,'Mohammed Kanno','MED'), P(23,'Nasser Al-Dawsari','MED'),
      P(9,'Firas Al-Buraikan','DEL'), P(11,'Saleh Al-Shehri','DEL'), P(10,'Khalid Al-Ghannam','DEL'), P(18,'Abdullah Al-Hamdan','DEL'),
    ],
    'Australia': [
      P(1,'Mathew Ryan','POR'),
      P(19,'Harry Souttar','DEF'), P(20,'Kye Rowles','DEF'), P(16,'Aziz Behich','DEF'), P(2,'Milos Degenek','DEF'),
      P(13,'Aiden O’Neill','MED'), P(23,'Connor Metcalfe','MED'), P(7,'Mathew Leckie','MED'), P(10,'Ajdin Hrustic','MED'),
      P(11,'Craig Goodwin','DEL'), P(9,'Mitchell Duke','DEL'), P(22,'Jackson Irvine','MED'), P(8,'Riley McGree','MED'),
    ],
    'Perú': [
      P(1,'Pedro Gallese','POR'),
      P(2,'Luis Advíncula','DEF'), P(5,'Carlos Zambrano','DEF'), P(15,'Alexander Callens','DEF'), P(3,'Miguel Trauco','DEF'),
      P(13,'Renato Tapia','MED'), P(8,'Sergio Peña','MED'), P(23,'Pedro Aquino','MED'), P(18,'André Carrillo','MED'),
      P(9,'Gianluca Lapadula','DEL'), P(20,'Edison Flores','DEL'), P(7,'Paolo Guerrero','DEL'), P(11,'Bryan Reyna','DEL'),
    ],
    'Corea del Sur': [
      P(1,'Kim Seung-gyu','POR'),
      P(2,'Kim Moon-hwan','DEF'), P(4,'Kim Min-jae','DEF'), P(20,'Kwon Kyung-won','DEF'), P(3,'Kim Jin-su','DEF'),
      P(6,'Hwang In-beom','MED'), P(15,'Jung Woo-young','MED'), P(13,'Lee Jae-sung','MED'), P(10,'Lee Kang-in','MED'),
      P(7,'Son Heung-min','DEL'), P(11,'Hwang Hee-chan','DEL'), P(9,'Cho Gue-sung','DEL'), P(18,'Oh Hyeon-gyu','DEL'),
    ],
    'Marruecos': [
      P(1,'Yassine Bounou','POR'), P(12,'Munir Mohamedi','POR'),
      P(2,'Achraf Hakimi','DEF'), P(5,'Nayef Aguerd','DEF'), P(6,'Romain Saïss','DEF'), P(3,'Noussair Mazraoui','DEF'),
      P(4,'Sofyan Amrabat','MED'), P(8,'Azzedine Ounahi','MED'), P(15,'Selim Amallah','MED'),
      P(7,'Hakim Ziyech','DEL'), P(11,'Abdelhamid Sabiri','MED'), P(19,'Youssef En-Nesyri','DEL'), P(17,'Sofiane Boufal','DEL'),
    ],
  };

  if (window.MB) window.MB.PLAYERS = PLAYERS;
})();
