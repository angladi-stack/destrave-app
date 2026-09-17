import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDetQ9aTwz1YAP6mrYNCq_0KtJXBvoB0Ug',
  authDomain: 'destrave-by-angladi.firebaseapp.com',
  projectId: 'destrave-by-angladi',
  storageBucket: 'destrave-by-angladi.firebasestorage.app',
  messagingSenderId: '164158289833',
  appId: '1:164158289833:web:d921ac06798a10afc9f6b8'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
