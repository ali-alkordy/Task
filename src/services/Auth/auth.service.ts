import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../../api/firebase";

export async function register(email: string, password: string) {
  return (await createUserWithEmailAndPassword(auth, email, password)).user;
}

export async function login(email: string, password: string) {
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}

export async function logout() {
  await signOut(auth);
}
