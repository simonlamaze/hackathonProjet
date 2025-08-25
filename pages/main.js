import {auth} from '../firebase.js'
import {db} from '../firebase.js'
import {storage} from '../firebase.js'
import { Chess } from 'chess.js'
import { onAuthStateChanged } from "firebase/auth";
import { signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getMetadata } from "firebase/storage";
import {  deleteObject } from "firebase/storage";
import {  arrayRemove } from "firebase/firestore";
import { Chessground } from 'chessground'
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import '../styles/chessground.base.override.css'
// Fin des imports //

export function Main(){
  return `
  <header>
  <h1>La Super App ! </h1>
  
  <div id="username-container">
  <span id="username-display">NomUtilisateur</span>
  <div id="user-menu" class="hidden">
    <a href="#" onclick="navigate('profil')">Mon profil</a>
    <button id="logout-btn">Se déconnecter</button>
  </div>
</div>
</header>

<main>
  <div class="boardcontainer">
    <!-- informations, tags -->
    <div class = "players" style="height: 20px">
      <p id="whitePlayer">Joueur Blanc</p> <p id="blackPlayer" >Joueur Noir</p> 
    </div>
    <div id="board"></div>
    <!-- Boutons sous l'échiquier -->
    <div id="arrows">
      <button class= "arrow" id="flip-board">⟳</button>
      <button class="arrow" id="startarrow"> &lt;&lt; </button>      
      <button class="arrow" id="leftarrow">  &lt; </button>
      <button class="arrow" id="rightarrow"> &gt; </button>
      <button class="arrow" id="endarrow"> &gt;&gt;</button>
      
    </div>
    <div id="comments_box" >

    </div>
    <!-- Affichage des variantes ou des commentaires -->
     <div id="variant-modal" class="modal hidden">
  <div class="modal-content" id="variant-list">
    
    <ul id="variants"></ul>
  </div>
  </div>
    
    
    <input type="file" id="loadbtn" accept=".pgn" placeholder="Charger un fichier" class="commands"/>
    

    
</div>
    
  </div>
<!-- Zone où il est possible de coller un PGn, et où les PGN sont visualisés -->
  <textarea id="text-zone" placeholder ="Coller un PGN ici" ></textarea>
    
  </textarea>
  <div id="files">
    <div id = "files-container"> Mes Fichiers PGN</div>
    
  
  <br>
  <!-- Différentes commandes , charger fichiers, mode révision -->
    <div id="file-commands">
      <button id="reset-btn" class="commands" disabled >Enlever le fichier</button>
      <button id="review-mode-btn" class="commands" disabled>
       Mode révision
        </button>
      <button id="quit-review-mode-btn" class="commands" disabled>Quitter mode Révision</button>
    </div>
    <div id="review-modal" class="modal hidden">
  <div class="modal-content">
    <h2>Choisis ta couleur</h2>
    <button class="color-btn" data-color="white">white</button>
    <button class="color-btn" data-color="black">black</button>
    <button id="close-modal">Annuler</button>
  </div>
  </div>
</main>
  
  `}

  export function initMain(){
      let user = null;
      const chess = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      
      const ground = Chessground(document.getElementById('board'), {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        orientation: 'white',
        coordinates: true,
        movable: {
          free: true,
          color: "both",
          events: {
            
            before: (orig, dest) => {
              console.log("Coup avant", orig, dest);
            
            return true; // J'ai uniquement fonctionné dans after, le before ne marchait pas , je n'ai pas compris pourquoi
          },
          after: (orig, dest) => {
          
          try {
          const move = chess.move({ from: orig, to: dest, promotion: 'q' });
          if (!move) {
            console.log("Coup illégal");
            ground.set({ fen: chess.fen() }); // revient à la position avant
          } else {
            ground.set({ fen: chess.fen() });
            currentNode = move;  // c'ets pas exactement le format, à développer
            history.push(currentNode); 
          }
          
        } catch (e) {
          console.log("Erreur coup illégal détectée, annulation");
          
          ground.set({ fen: chess.fen() ,
            turnColor: chess.turn() === 'w' ? 'white' : 'black'
          });
        }
      }
          
          
        }
        
      },
      
      });
      
      
      document.getElementById('loadbtn').addEventListener('change', lireFichierPGN); 
      document.getElementById('reset-btn').addEventListener('click',unloadPGN );
      document.getElementById('rightarrow').addEventListener('click', avancer); 
      document.getElementById('leftarrow').addEventListener('click', reculer); 
      document.getElementById('startarrow').addEventListener('click', gobeginning);
      document.getElementById('endarrow').addEventListener('click', goEnd);
      document.getElementById('flip-board').addEventListener('click', turnboard); // Bouton pour retourner l'échiquier});
      let moderévision = false; 
      let fichierchargé= false;
      let choixVarianteEnCours = false;
      let feninitial ;
      let gamemoves = []; // tableau pour stocker les coups du PGN      
      let currentNode = null ;     // coup courant 
      let history = []; 
      let color ='white ' ; // Couleur de révision, blanc par défaut
      
      // Ecoute les changements d'états de auth
      onAuthStateChanged(auth, (utilisateur) => {
        if (utilisateur) {
          console.log("connecté");
          user = utilisateur;
          afficherFichiersFirestore(utilisateur.uid);
          const username = utilisateur.displayName || "Utilisateur";
          document.getElementById("username-display").textContent = username;
        } else {
          
          
          utilisateur = null;
          document.getElementById("username-display").textContent = "Non connecté";
          document.getElementById("files-container").innerHTML = "<p>Veuillez vous connecter.</p>";
        }
      });
      //--------------//Fin Firebase pour le front
      
      
      
      
      //-----------// Fonction d'upload avec firebase storage et Firestore
      async function uploadPGN(pgn, userId, pgnname) {
        if (!pgn) throw new Error("Aucun fichier sélectionné");
        if (!userId) throw new Error("userId invalide");
        const safeName = pgnname.replace(/[^\w.-]/g, "_");
        const file = new File([pgn], safeName, { type: "text/plain" });
        const fileRef = ref(storage, `uploads/${userId}/${file.name}`);
        
        try {
          await getMetadata(fileRef);
          console.log(db);
          throw new Error ("Le fichier existe déjà");
         
        } catch (error) {
          if (error.code !== "storage/object-not-found") {
            throw error; // autre erreur que "non trouvé"
          }
        }
        
        await uploadBytes(fileRef, file);
        
        const url = await getDownloadURL(fileRef);
       console.log(db);
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
        files: arrayUnion({
          name: file.name,
          url: url,
          uploadedAt: new Date().toISOString(),
          ownedBy : user.displayName,
          sharedWith :[],
        })
      }, { merge: true });
        
        console.log("storage successful");
        await afficherFichiersFirestore(userId);
        return url;
      }
      
      //Fonction qui supprime les fichiers du storage et de Firestore
      async function deletePGN(userId, fileName) {
        if (!userId) throw new Error("userId invalide");
        if (!fileName) throw new Error("Nom de fichier invalide");
      
        // Référence dans le Storage
        const fileRef = ref(storage, `uploads/${userId}/${fileName}`);
      
        // 1️⃣ Suppression dans le Storage
        try {
          await deleteObject(fileRef);
          console.log(`Fichier ${fileName} supprimé du Storage`);
        } catch (error) {
          if (error.code === "storage/object-not-found") {
            console.warn(`Fichier ${fileName} introuvable dans le Storage`);
          } else {
            throw error;
          }
        }
      
        // 2️⃣ Suppression dans Firestore
        const userRef = doc(db, "users", userId);
        const snap = await getDoc(userRef);
      
        if (!snap.exists()) {
          console.warn("Document utilisateur introuvable, rien à supprimer dans Firestore");
          return;
        }
      
        const files = snap.data().files || [];
        const fileToRemove = files.find(f => f.name === fileName);
      
        if (fileToRemove) {
          await updateDoc(userRef, {
            files: arrayRemove(fileToRemove)
          });
          console.log(`Fichier ${fileName} retiré de Firestore`);
        } else {
          console.warn(`Fichier ${fileName} introuvable dans Firestore`);
        }
        await afficherFichiersFirestore(userId);
      }
      
      //Fonction qui affiche les fichiers de Firestore dans la page
      async function afficherFichiersFirestore(userId) {
        const container = document.getElementById("files-container");
        const textarea = document.getElementById("text-zone");
        container.innerHTML = ""; // vider avant
      
        try {
          const userRef = doc(db, "users", userId);
          
          const snap = await getDoc(userRef);
          
      
          if (!snap.exists()) {
            console.log("on est là");
            container.innerHTML = "<p>Aucun fichier trouvé.</p>";
            return;
          }
          
          
          const data = snap.data();
          
          const files = data.files || [];
          console.log (data);
          if (files.length === 0) {
            container.innerHTML = "<p>Aucun fichier trouvé.</p>";
            return;
          }
      
          files.forEach(file => {
            const btn = document.createElement("button");
            btn.textContent = file.name;
            btn.ondblclick = async () => {
              try {
                const response = await fetch(file.url);
                const text = await response.text();
                unloadPGN();
                textarea.value = cleanPGN(text);
                handlePGNSelection(text);
              } catch (err) {
                console.error("Erreur lors du chargement du fichier :", err);
              }
            };
            btn.addEventListener("contextmenu", (event) => {
            event.preventDefault(); 
            deletePGN(user.uid,file.name);
            
            });
            container.appendChild(btn);
            container.appendChild(document.createElement("br"));
          });
        } catch (error) {
          console.error("Erreur Firestore :", error);
          container.innerHTML = "<p>Erreur lors du chargement des fichiers.</p>";
        }
      }
      
      // Fonction qui permet le partage de fichiers entre utilisateurs (à faire)
      async function shareFile( targetUserId, fileData) {
        // 1. Mettre à jour le fichier pour indiquer qu’il est partagé avec targetUserId
        const fileRef = doc(db, "users/"+ user.uid , fileData.name);
        await updateDoc(fileRef, {
          sharedWith: arrayUnion(targetUserId)
        });
      
        // 2. Ajouter le fichier dans la liste personnelle de l'utilisateur cible
        const targetUserRef = doc(db, "users", targetUserId);
        await updateDoc(targetUserRef, {
          files: arrayUnion({
            
            name: fileData.name,
            url: fileData.url,
            sharedBy: fileData.ownerId,
            sharedAt: new Date().toISOString()
          })
        });
      }
      
      
      //--------// Fin de la gestion storage / Firestore
      
      
      
      // Début de tout le code relatif à l'app
      
      
      function turnboard(){
        const current = ground.state.orientation;
        ground.set({ orientation: current === 'white' ? 'black' : 'white' });
      }
      
      
      
      
      
      
      document.getElementById("logout-btn").addEventListener("click", async () => {
        try {
          await signOut(auth);
          console.log("Déconnecté avec succès");
          navigate('index') // redirige vers la page de connexion
        } catch (error) {
          console.error("Erreur lors de la déconnexion :", error);
        }
      });
      //----------// Fonctions relatives à la navigation à travers les fichiers PGN//----------//
      
      // Fonction qui va à la fin de la ligne principale, avec toute la ligne princcipale dans l'historique
      function goEnd() {
        
         if (gamemoves.length === 0) {
          return;
        }
        if (choixVarianteEnCours) return;
        history = [];
        if (!gamemoves || gamemoves.length === 0) {
          currentNode = null;
          return;
        }
      
        
        currentNode = null;
      
        let moves = gamemoves;
        let node = null;
      
        while (moves.length > 0) {
          node = moves[0];          
          history.push(currentNode); 
          currentNode = node;
      
          
          const idx = moves.indexOf(node);
          if (idx < moves.length - 1) {
            moves = moves.slice(idx + 1);
          } else {
            break; 
          }
        }
      
        afficherPosition(currentNode);
        afficherCommentaires(currentNode);
      }
      
      
      // Fonction qui retourne au début
      function gobeginning() {
        if (choixVarianteEnCours) return;
         if (gamemoves.length === 0) {
          return;
        }
        if (gamemoves.length > 0) {
          
          history = [];
          currentNode = null;
          afficherPosition(currentNode);
          afficherCommentaires(currentNode);
        }
      }
      
      // Avance d'un coup en prenant en compte les variantes
      function avancer() {
        ground.set({ turnColor: chess.turn() === 'w' ? 'black' : 'white' }); // On met à jour la couleur du trait
         if (choixVarianteEnCours) return;
        let nextMove;
        if (gamemoves.length === 0) {
          return;
        }
        if (currentNode === null) {
          // Premier coup
          nextMove = gamemoves[0];
        } else {
          
          nextMove = getNextMainLineMove(currentNode); // On récupère le prochain coup de la ligne principale
        }
      
        if (nextMove) {
          history.push(currentNode);
          currentNode = nextMove;
          if ( Array.isArray(currentNode.variations) && currentNode.variations.length > 0) { // Les variante sse trouve à, côté du prochain coup, pas en variantes du coup courant
            choixVarianteEnCours = true;
            afficherVariantes(currentNode.variations);
            return;
            };
      }
          afficherPosition(currentNode);
          afficherCommentaires(currentNode);
        }
      
      // Recule simplement d'un coup
      function reculer() {
         if (choixVarianteEnCours) return;
         if (gamemoves.length === 0) {
          return;
        }
         
        if (history.length > 0) {
          currentNode = history.pop();  
          afficherPosition(currentNode);
          afficherCommentaires(currentnode);
        }
      }
      
      //Affiche les commentaire sd'un coup dans la zone de commentaires
      function afficherCommentaires(coup){
        const comments = coup.comment ;
        const box = document.getElementById("comments_box");
        if (comments){
        box.innerText= comments ;}
      }
      
      
      
      //Affiche les variantes dans la zone prévue à cet effet
      function afficherVariantes(variations) {
        let curseur = 0 ;
        // Fonctions qui écoutent les flêches haut et bas pour changer de variante
        function changerVariante(event) {
          
        if (["ArrowUp", "ArrowDown"].includes(event.key) ) {
          event.preventDefault();
        }
       
        let value = curseur; 
        switch (event.key) {
          
          case "Enter" : 
              choisirVariante(curseur-1); // Ligne principale pour -1, tout est décalé de 1
              document.getElementById("variants").innerHTML = ""; // On nettoie la liste après le choix
              choixVarianteEnCours = false; 
          case "ArrowUp":
             
             value = (value + variations.length) % (variations.length+1); // Variatios +length +1 à cause de la ligne principale
            
             setCurseur(value);
            break;
          case "ArrowDown":
            
              value = (value + 1) % (variations.length +1) ; 
            
              setCurseur(value);
            break;
          
          }
        }
        function setCurseur(value) {
          
          curseur = value;
          const variantList = document.getElementById("variants");
          const items = variantList.querySelectorAll("li");
          
          items.forEach((item, index) => {
        
              item.style.backgroundColor = index === curseur ? "rgba(112,105,105,0.5)": ""; // Met en surbrillance l'élément sélectionné
            
            
        });
        }
        
        document.addEventListener("keydown",changerVariante);
        
        // Fonction qui permet de choisir des variantes si besoin
      function choisirVariante(index) {
        if (index === -1 ) {
            afficherPosition(currentNode);
            afficherCommentaires(currentNode);
        }
        else{
        currentNode = currentNode.variations[index][0];
        afficherPosition(currentNode);
        afficherCommentaires(currentNode);
        
        }
        document.getElementById("variant-modal").classList.add("hidden");
        document.removeEventListener("keydown", changerVariante); 
      }
      
        document.getElementById("variant-modal").classList.remove("hidden"); 
        document.getElementById("variants").innerHTML = ""; 
        // On commence par ajouter le coup en cours à la liste de variantes
        const la = document.createElement("li");
        la.textContent = ` ${currentNode.move}`;
        la.style.cursor = "pointer";
        la.addEventListener("click", () => {
          choisirVariante(-1);
          document.getElementById("variants").innerHTML = ""; 
          choixVarianteEnCours = false; 
        });
        document.getElementById("variants").appendChild(la);
        variations.forEach((variation, index) => {
          const li = document.createElement("li");
          li.textContent = ` ${variation[0].move}`;
          li.style.cursor = "pointer";
          li.addEventListener("click", () => {
            choisirVariante(index);
            document.getElementById("variants").innerHTML = ""; // On nettoie la liste après le choix
            choixVarianteEnCours = false; 
          });
          document.getElementById("variants").appendChild(li);
        });
        setCurseur(0); 
        // On met le curseur par défaut sur la ilgne principale
        
      }
      
      
      
      
      // Fonction récursive qui renvoie le tableau dans lequel se trouve le coup
       function findArrayContainingMove(array, target) {
          // est toujours appelée avec target non null
          if (array.includes(target)) return array;
          for (const moveObj of array) {
            if (moveObj.variations) {
              for (const variation of moveObj.variations) {
                const res = findArrayContainingMove(variation, target);
                if (res) return res;
              }
            }
          }
          return null;
        }
      
      
      // Affiche la position en prenant en compte les cas ou le currentNode est null
      function afficherPosition(node) {
        if (!node) {
          console.log('Aucun coup sélectionné');
          chess.load(feninitial); 
          ground.set({ fen: chess.fen() ,
            turnColor: chess.turn() === 'w' ? 'white' : 'black' }); 
        } else {
          chess.load(node.fenAfter); 
          ground.set({ fen: chess.fen() ,
            turnColor: chess.turn() === 'w' ? 'white' : 'black' }); 
          }
          }
      
      
      // Fonction qui récupère le prochain coup de la ligne principale du PGn
      
      function getNextMainLineMove(node) {
        if (node===null){
          return gamemoves.length > 0 ? gamemoves[0] : null; // Si c'est le premier coup, on retourne le premier coup du PGN
        }
        const array = findArrayContainingMove(gamemoves, node);
        
        if (!array) return null;
        let idx = array.indexOf(node);
        if (idx < 0 || idx >= array.length - 1) return null;
        return array[idx + 1];
      }
      
      
      // On ajoute des commandes clavier classiques
      document.addEventListener("keydown", (event) => {
        
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key) || 
            (event.ctrlKey && event.key.toLowerCase() === "f")) {
          event.preventDefault();
        }
        if (fichierchargé === true && choixVarianteEnCours === false) {
        switch (event.key) {
          case "ArrowUp":
            goEnd();
            break;
          case "ArrowDown":
            gobeginning();
            break;
          case "ArrowLeft":
            reculer();
            break;
          case "ArrowRight":
            avancer() ;
            break;
        }}
        
        if (event.ctrlKey && event.key.toLowerCase() === "f") {
          turnboard();
          
        }
      });
      
      
      //----------// Fonctions relatives au mode révision //----------//
      //Activation du mode révision
      document.getElementById("review-mode-btn").addEventListener("click", () => {
        modal.classList.remove('hidden')  
      });
      
      const modal = document.getElementById('review-modal');
      const closeModal = document.getElementById('close-modal');
      
      closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
      
      document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosenColor = btn.dataset.color;
         
          startReviewMode(chosenColor);
          modal.classList.add('hidden');
        });
      });
      
      
      //Mise en place du mode révision selon la couleur
      function startReviewMode(couleur) {
        moderévision = true;
        document.getElementById("review-mode-btn").disabled = true;
        document.getElementById("quit-review-mode-btn").disabled = false;
        color = couleur;
        ground.set({
        
        orientation: couleur,
        
        movable: {
          free: true,
          color: couleur,
          events: {
            
          after: (orig, dest) => {
          
          try {
          const move = chess.move({ from: orig, to: dest, promotion: 'q' });
          if (!move) {
            console.log("Coup illégal");
            ground.set({ fen: chess.fen() }); // revient à la position avant
          } else {
            ground.set({ fen: chess.fen() });
          }
          
          // Maintenant en mode révision, on compare ce coup avec le coup du PGN
          const expectedMove= getNextMainLineMove(currentNode); // On récupère le prochain coup de la ligne principale
          console.log(expectedMove);
          if (!expectedMove ) {
            console.log("Pas de coup suivant dans la ligne principale");
            chess.load(currentNode.fenAfter);
            ground.set({ fen: chess.fen() ,
            turnColor: chess.turn() === 'w' ? 'white' : 'black' }); 
          
            return;
          }
          if (cleanMoveNotation(expectedMove.move) !== move.san) {
            console.log("Pas le coup du fichier");
            chess.load(currentNode.fenAfter);
            ground.set({ fen: chess.fen() ,
            turnColor: chess.turn() === 'w' ? 'white' : 'black' }); 
          
            return;
          }
          // Dans les autres cas le coup était correct, donc on le laisse avoir été joué
          currentNode = expectedMove;  
          history.push(currentNode); // On ajoute le coup à l'historique
          afficherCommentaires(currentNode);
          console.log("Coup correct joué :", move.san);
          avancer(); // On joue le coup de l'autre camp automatiquement, avec un choix proposé s'il y a des variantes
        } catch (e) {
          console.log("Erreur  détectée, annulation");
          
          ground.set({ fen: chess.fen() ,
            turnColor: chess.turn() === 'w' ? 'white' : 'black' }); 
          }
        }   
      },
      
      
          },
      
        }
        );
      // Maintenant on regarde si dans la position initiale le trait est à nous ou non, si non , on fait avancer
        
        if (chess.turn() !== (  color === 'white' ? 'w' : 'b')) {
          avancer();
          
        }
        
      };
      
      // Fonction qui quitte le mode révision
      document.getElementById("quit-review-mode-btn").addEventListener("click", () => {
        moderévision = false;
        document.getElementById("review-mode-btn").disabled = false;
        document.getElementById("quit-review-mode-btn").disabled = true;
        ground.set({
          movable: { color: 'null' } // On désactive les coups
        });
        
        console.log("Mode révision quitté");
      });
      
      
      //----------// Fonctions relatives au chargement de fichiers PGN //----------//
      
      // Fonction qui teste si un texte est un PGN
      function estPGN(text) {
        if (!text) return false;
      
        const lignes = text.split("\n").map(l => l.trim()).filter(Boolean);
      
        // vérifier au moins un en-tête
        const aUnEntete = lignes.some(l => /^\[.+ ".+"\]$/.test(l));
        
      
        // vérifier la présence de coups typiques
        const aDesCoups = /[PNBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?|O-O(-O)?/.test(text);
        if (  !aUnEntete && !aDesCoups ){
          return false ;
        }
        else{
          return true ;
        }
      }
      // Fonction qui permet de coller des PGN dans la zone de texte et de les charger
      document.getElementById("text-zone").addEventListener("paste", (event) => {
        setTimeout(() => {
          const pgnText = event.target.value.trim();
          if (!pgnText) return;
          if (!estPGN(pgnText)) {
            alert ("Veuillez copier un PGN")
            return ;
          }
        loadPGN(pgnText);
      
        const fileBtn = document.getElementById("loadbtn");
        fileBtn.disabled = true;
        fileBtn.title = "PGN déjà chargé depuis la zone de texte";
          }, 10);
      });
      
      //Fonction qui gère le chargement du PGN en cas de double clic dans la zone des fichiers, donc sans upload
       async function handlePGNSelection(pgnText) {
        if (!pgnText.trim()) return;
      
        document.getElementById("loadbtn").disabled = true;
        ground.set({movable: {color : 'null' }}) // On ne peut pas jouer à ce moment là
        document.getElementById("review-mode-btn").disabled = false;
         document.getElementById("reset-btn").disabled = false;
         fichierchargé = true ;
        document.getElementById('text-zone').textContent = cleanPGN(pgnText); // On nettoie le pgn et on l'affiche dans la zone de texte
              const fenMatch = pgnText.match(/\[FEN\s+"([^"]+)"\]/); // Cherche si il ya une ligne FEN ( pas le FEN initial normal)
              if (fenMatch) { // si la position de départ du pgn n'est pas celle de départ
                  const fen = fenMatch[1];
                  ground.set({fen:fen});
                  chess.load(fen); // On charge le FEN dans chess.js
                  feninitial = fen; // On stocke le FEN initial
                  
                }
              else{
                feninitial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // On met le FEN initial par défaut
              }
              
              const whitePlayerMatch = pgnText.match(/\[White\s+"([^"]+)"\]/); // On cherche les noms des joueurs si il y en a
              const blackPlayerMatch = pgnText.match(/\[Black\s+"([^"]+)"\]/);
              let PGNname = ' ' ;
              if (whitePlayerMatch){
                const whitePlayer = whitePlayerMatch[1];
                document.getElementById('whitePlayer').textContent = whitePlayer;
                PGNname += whitePlayer ;
                PGNname += ' ';
              }
              if (blackPlayerMatch){
                const blackPlayer = blackPlayerMatch[1];
                document.getElementById('blackPlayer').textContent = blackPlayer;
                PGNname += blackPlayer ;
              }
              
              // Ici on va parcourir le pgn parsé pour associer à chaque coup le FEN de la position après ce coup.
              const { tags, moves } = parsePGN(pgnText);
              
              addFensToMoves(moves, chess); 
              if (fenMatch) { 
                  chess.load(feninitial); 
                  
                }
              else{
                chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); 
              }
              
              gamemoves = moves; 
              console.log( gamemoves);
      
        const fileBtn = document.getElementById("loadbtn");
        fileBtn.disabled = true;
        fileBtn.title = "PGN déjà chargé depuis la zone de texte";
      
        
      }
      
      
      // fonction qui enlève les ? et ! en cas de besoin
      function cleanMoveNotation(move) {
        // Supprime tous les symboles d'annotation (!, ?, !?, ?!, !!, ??) en fin de coup
        return move.replace(/(\!\?|\?\!|\!\!|\?\?|\!|\?)$/, '');
      }
      
      // Fonction qui charge un pgn textuel et l'upload dans firebase
      async function loadPGN(pgnText) {
        document.getElementById("loadbtn").disabled = true;
        ground.set({movable: {color : 'null' }}) // On ne peut pas jouer à ce moment là
        document.getElementById("review-mode-btn").disabled = false;
         document.getElementById("reset-btn").disabled = false;
         fichierchargé = true ;
        document.getElementById('text-zone').textContent = cleanPGN(pgnText); // On nettoie le pgn et on l'affiche dans la zone de texte
              const fenMatch = pgnText.match(/\[FEN\s+"([^"]+)"\]/); // Cherche si il ya une ligne FEN ( pas le FEN initial normal)
              if (fenMatch) { // si la position de départ du pgn n'est pas celle de départ
                  const fen = fenMatch[1];
                  ground.set({fen:fen});
                  chess.load(fen); // On charge le FEN dans chess.js
                  feninitial = fen; // On stocke le FEN initial
                  
                }
              else{
                feninitial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // On met le FEN initial par défaut
              }
              
              const whitePlayerMatch = pgnText.match(/\[White\s+"([^"]+)"\]/); // On cherche les noms des joueurs si il y en a
              const blackPlayerMatch = pgnText.match(/\[Black\s+"([^"]+)"\]/);
              let PGNname = ' ' ;
              if (whitePlayerMatch){
                const whitePlayer = whitePlayerMatch[1];
                document.getElementById('whitePlayer').textContent = whitePlayer;
                PGNname += whitePlayer ;
                PGNname += ' ';
              }
              if (blackPlayerMatch){
                const blackPlayer = blackPlayerMatch[1];
                document.getElementById('blackPlayer').textContent = blackPlayer;
                PGNname += blackPlayer ;
              }
              // Ici on upload le PGN dans Firebase Storage
              if (!user) {
              alert("Tu dois être connecté pour uploader un fichier.");
              return;
              } try {
              const url = await uploadPGN(pgnText, user.uid, PGNname);
              alert("Fichier uploadé avec succès : " + url);
              } catch (err) {
              console.error(err);
              alert("Erreur lors de l’upload.");
              }  
      
              // Ici on va parcourir le pgn parsé pour associer à chaque coup le FEN de la position après ce coup.
              const { tags, moves } = parsePGN(pgnText);
              
              addFensToMoves(moves, chess); 
              if (fenMatch) { 
                  chess.load(feninitial); 
                  
                }
              else{
                chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); 
              }
              
              gamemoves = moves; 
              console.log( gamemoves);
            }
      
      
      // Réinitialise l'état du jeu et de l'interface
      function unloadPGN() { 
        const fileBtn = document.getElementById("loadbtn");
        fichierchargé = false; 
        fileBtn.disabled = false; // On réactive le bouton de chargement de fichier 
        fileBtn.title = "Aucun fichier n'a été sélectionné";
        document.getElementById("reset-btn").disabled= true;
        document.getElementById("review-mode-btn").disabled= true;
        document.getElementById("quit-review-mode-btn").disabled= true;
        currentNode = null; 
        history = []; 
        gamemoves = [];
        color = 'white'; 
        choixVarianteEnCours = false;
        feninitial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; 
        document.getElementById('text-zone').textContent = 'Charger un fichier PGN pour commencer'; 
        document.getElementById('whitePlayer').textContent = 'Joueur Blanc'; 
        document.getElementById('blackPlayer').textContent = 'Joueur Noir';
        document.getElementById('loadbtn').value = ''; 
        ground.set({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' }); 
        chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); 
      }
      
      // Fonction appelée lors du chargement d'un fichier PGN
      function lireFichierPGN(event) {
          const file = event.target.files[0]; // Le premier fichier , si il y en a plusieurs
          if (!file) return;
          
          
          const reader = new FileReader();
          reader.onload = function(e) {
              const contenuPGN = e.target.result; // On met une version minimaliste du Pgn dans la zone de texte
              
              
              loadPGN(contenuPGN);
              
          };
          reader.readAsText(file);
          
      }
      
      // enlève les tags et les commentaires du pgn
      function cleanPGN(pgn) { 
        let withoutTags = pgn.replace(/^\[.*\]\s*$/gm, '');
      
        let clean = withoutTags.replace(/\{[^}]*\}/g, '');
        clean = clean.replace(/^\s*[\r\n]/gm, '').trim();
      
        return clean;
      }
      
      // La fonction qui extrait les tags et les coups du PGN
      function parsePGN(pgn) {
       
        let pos = 0;
      
        
        function parseTags() { // Parse l'en-tête
          const tags = {};
          const tagRegex = /\[([A-Za-z0-9_]+) "([^"]*)"\]/g;
          let match;
          while ((match = tagRegex.exec(pgn)) !== null) {
            tags[match[1]] = match[2];
          }
          pos = tagRegex.lastIndex;
          return tags;
        }
        function findMovesStart() { // trouve le début des coups dans le PGN
          const lines = pgn.split('\n');
          let index = 0;
          let charCount = 0;
          while (index < lines.length && lines[index].startsWith('[')) {
            charCount += lines[index].length + 1; // +1 pour le \n
            index++;
          }
          return charCount;
        }
        
        function parseMoves() { 
          const moves = [];
          let token = '';
      
          while (pos < pgn.length) {
            const char = pgn[pos];
      
            if (char === '{') {
              // C'est un commentaire
              pos++;
              let comment = '';
              while (pos < pgn.length && pgn[pos] !== '}') {
                comment += pgn[pos++];
              }
              pos++; // On saute la parenthèse fermante
              if (moves.length > 0) {
                moves[moves.length - 1].comment = (moves[moves.length - 1].comment || '') + comment.trim();
              }
            } else if (char === '(') {
              pos++;
              const variant = parseMoves();
              if (moves.length > 0) {
                moves[moves.length - 1].variations = moves[moves.length - 1].variations || [];
                moves[moves.length - 1].variations.push(variant);
              }
            } else if (char === ')') {
              pos++;
              break; // Marque la fin des variantes
            } else if (/\s/.test(char)) {
              pos++;
            } else {
              
              token = '';
              while (pos < pgn.length && !/\s|\{|\}|\(|\)/.test(pgn[pos])) {
                token += pgn[pos++];
              }
      
              // Ignore les numéros de coup (1., 2., 3...)
            if (/^\d+\.(\.\.)?$/.test(token) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) {
              // ignore ces tokens
              continue;
            }
      
            // Ignore et stocke les NAG ($11, $1, etc)
            if (/^\$\d+$/.test(token)) {
              if (moves.length > 0) {
                moves[moves.length - 1].nag = moves[moves.length - 1].nag || [];
                moves[moves.length - 1].nag.push(token);
              }
              continue; // ne pas considérer comme coup
            }
      
            // Sinon, c'est un vrai coup
            moves.push({ move: token });
      
            }
          }
          return moves;
        }
      
        const tags = parseTags();
          pos = findMovesStart();
        const moves = parseMoves();
      
        return { tags, moves };
      }
      
      
      // A l'objet moves ajoute, après chaque coup, le FEN de la position après ce coup
      function addFensToMoves(moves, chess) { 
        moves.forEach(moveObj => {
          
          const fenBefore = chess.fen();
          
          const result = chess.move(moveObj.move);
          if (result === null) {
        
          console.log("Coup illégal détecté :", move);
        
          } 
        
          moveObj.fenAfter = chess.fen();
      
          // On teste la présence de variantes
          if (moveObj.variations && moveObj.variations.length > 0) {
            moveObj.variations.forEach(variation => {
              // On clone la position actuelle avant d’entrer dans la variante
              const chessClone = new Chess(fenBefore);
              addFensToMoves(variation, chessClone);
            });
          }
        });
      }
  }