import { Index, initIndex} from './pages/index.js';
import { Signin , initSignin} from './pages/signin.js';
import { Main,initMain } from './pages/main.js';
import { Profil , initProfil} from './pages/profil.js';
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";

import "./styles/chessground.base.override.css";

const routes = {
  index: Index,
  signin: Signin,
  main: Main,
  profil: Profil
};

const app = document.getElementById('app');

window.navigate = function(route) {
  const page = routes[route];
  if (!page) return;
  app.innerHTML = page();
  if (route === 'index'){
    initIndex()
  }
  if (route === 'profil'){
    initProfil()
  }
  if (route === 'signin'){
    initSignin()
  }
  if (route === 'main'){
    initMain()
    
  }
};

// Page d'entrée
navigate('index');