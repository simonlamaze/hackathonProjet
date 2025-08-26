Ce  projet m'est venu à l'idée en pensant à quelques fonctionnalités que j'aimerais bien avoir à ma disposition lorsque je travaille les échecs . Ensuite lors d'une discussion avec le Sélectionneur de l'Equipe de france Jeunes, 
il m'a dit qu'il y avait plusieurs lacunes sur le site actuel qu'ils utilisaient, notamment que le partage de fichiers était impossible, et qu'il fonctionaient via des captures d'écrans . 
Je voyais ces deux aspects comme une manière intéressante pour moi d'approcher les notions abordées cette année, où j'apprendrais à utiliser à la fois du front et un peu de backend .
Sur le site Web dont l'URl est la suivante: https://hackathonprojet.web.app, , j'ai pour l'instant mis en place plusieurs choses qui marchent bien : il pest possible de charger un PGN et de naviguer à travers celui-ci, ainsi que de le réviser ( mode révision).
les fichiers sont enregistrés dans le Storage de la Console Firebase.
J'ai utilisé Firebase pour le backend, cet outil m'a été conseillé par Mathis Liens, qui m'a dit qu'ils l'avaient utilisé pour l'App du Cartel, et que c'était un outil adapté aux projets de taille raisonnable ( gartuité des services dans une limite de taille).
Le second aspect auquel je me suis attqué était de permettre le partage de fichiers, mais il n'est pas encore opérationnel ( bouton demander un élève dans la page profil). 

 Pour ce qui est des librairies utilisées, voici l'extrait du package.json  concernant les dépendances  :
 "dependencies": {
    "@google-cloud/storage": "^7.16.0",
    "better-sqlite3": "^12.2.0",
    "chess.js": "^1.4.0",
    "chessground": "^9.2.1",
    "dotenv": "^17.2.1",
    "express": "^5.1.0",
    "firebase": "^12.1.0",
    "firebase-admin": "^13.4.0",
    "firestore": "^1.1.6",
    "jquery": "^3.7.1",
    "multer": "^2.0.2"
Pour l'utiliser il vous suffira de vous créer un compte ( aucune vérification d'e-mail pur l'instant) , et de charger les fichiers PGN que j'aurai joint .
Le hash du dernier commit est le suivant : commit 876aaec412eb2f816e8c89eef6ae000cdccffc74 (HEAD -> main)
Le site est bien sûr très loin de l'aspect que j'aimerais lui donner, même s'il était seulement à mon usage, et je compte continuer à travailler dessus lors de mon S3, mais j'ai largement travaillé une semaine dessus. 
Est-ce que le résultat est intéressant , peut-être pas, mais ce projet a eu le mérite de m'apprendre à manipuler HTML/CSS/JS. J'ai commenté mon code au fur et à mesure, j'espère que cela sera lisible, j'avoue ne pas savoir exactement ce qui est lisible ou non.

Pour gérer les pages multiples, j'ai utilisé  une Single Page Application, car c'est le choix qui s'accordait le mieux avec l'utilisation d'un bundler ( Vite) , tous mes codes HTML se trouvent donc dans les fichiers Javascript associés, et exportés dans le JS principal sous forme de fonctions. 

Ce que j'aimerais bien ajouter désormais : terminer de travailler sur le partage de fichiers, c'est assez bien avancé, mais j'ai je crois des soucis de sécurité côté Firebase qui bloquent pour le moment , permettre l'édition de fichiers PGN en plus de leur lecture , ainsi que développer un petit outil pour gérer les transpositions .
