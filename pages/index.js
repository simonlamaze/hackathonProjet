import {auth} from '../firebase.js'
import {db} from '../firebase.js'
import {storage} from '../firebase.js'
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

//-----// Fin des imports 



export function Index(){
  return `<!DOCTYPE html>

  <h1>La Super App! - Connexion</h1>
  <form id="login-form">
    <input type="email" id="email" placeholder="Email" required />
    <input type="password" id="password" placeholder="Mot de passe" required />
    <button type="submit">Se connecter</button>
  </form>
  <div id="message"></div>
  <div > 
    <p>Pas encore inscrit ? <a href="#" onclick="navigate('signin')">S'inscrire</a></p>
    
  </div>
`

}

export function initIndex(){
  document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = e.target.email.value;
  const password = e.target.password.value;
  const messageDiv = document.getElementById('message');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    messageDiv.textContent = "Connexion réussie";

    localStorage.setItem('token', token);

    navigate('main');
  } catch (error) {
    messageDiv.textContent = "Erreur de connexion : " + error.message;
  }
});
}

