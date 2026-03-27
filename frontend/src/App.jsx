import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { useState } from "react";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";


function App() {
  const [user, setUser] = useState(null);

  return user ? <Home /> : <AuthPage />;
}
export default App;

