import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { updateProfile } from "firebase/auth"; 
import { doc,setDoc, updateDoc,arrayUnion} from "firebase/firestore";    
import { ref, uploadBytes } from "firebase/storage";
import {getFirestore} from "firebase/firestore";
import {getStorage} from "firebase/storage" ;
import { signOut } from "firebase/auth";
import {auth} from '../firebase.js'
import {db} from '../firebase.js'
import {storage} from '../firebase.js'

export function Signin(){
  
  return `
    <h1>Inscription</h1>
  <form id="signup-form">
  <input type="text" id="username" placeholder="Nom d'utilisateur" required />
  <input type="email" id="email" placeholder="Email" required />
  <input type="password" id="password" placeholder="Mot de passe" required />
  <button type="submit">S'inscrire</button>
</form>
<div > 
    <p>Déjà inscrit ? <a href="#" onclick="navigate('index')">Se connecter</a></p>
    
  </div>
<div id="signup-message"></div>
`};

export function initSignin(){
  document.getElementById("signup-form").addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const email = e.target.email.value;
    const password = e.target.password.value;
    const username = e.target.username.value; 
  
    try {
      //  Création Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      //  Met à jour le displayName dans Auth
      await updateProfile(user, { displayName: username });
      
      // Crée le doc Firestore avec les listes
      await setDoc(doc(db, "users", user.uid), {
        displayName: username,
        myTrainers: [],
        myStudents: [],
        myFiles: [],
        createdAt: new Date().toISOString()
      });
      const userDocRef = doc(db, "usernames", "site-users");
  
      // Mise à jour des deux listes
      await updateDoc(userDocRef, {
        usersids: arrayUnion(user.uid),     // exemple: ajouter son uid dans "admins"
        usersnames: arrayUnion(username)     // exemple: ajouter son username dans "members"
      });
      
      //  Redirection
      document.getElementById('signup-message').textContent = "Inscription réussie !";
      window.location.href = 'login.html';
      await signOut(auth);
    } catch (error) {
      document.getElementById('signup-message').textContent = `Erreur : ${error.message}`;
    }
  });
}

