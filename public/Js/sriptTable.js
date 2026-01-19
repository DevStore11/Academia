import { auth, provider, db } from "./firebaseConfig.js";
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.getElementById("loginBtn").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Usuário logado:", result.user);

    // Depois do login, lê a coleção
    const querySnapshot = await getDocs(collection(db, "clubes"));
    querySnapshot.forEach(doc => console.log(doc.id, doc.data()));
  } catch (error) {
    console.error(error);
  }
});
