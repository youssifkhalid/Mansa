// Firebase Configuration
// استبدل هذه القيم بقيم مشروعك من Firebase Console
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// تهيئة Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// تصدير المتغيرات للاستخدام في app.js
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseApp = app;

// Firebase Auth Functions
window.firebaseSignIn = signInWithEmailAndPassword;
window.firebaseSignUp = createUserWithEmailAndPassword;
window.firebaseGoogleSignIn = () => signInWithPopup(auth, googleProvider);
window.firebaseSignOut = () => signOut(auth);
window.firebaseAuthStateChanged = onAuthStateChanged;
window.firebaseUpdateProfile = updateProfile;

// Firestore Functions
window.firestoreCollection = collection;
window.firestoreAddDoc = addDoc;
window.firestoreUpdateDoc = updateDoc;
window.firestoreDeleteDoc = deleteDoc;
window.firestoreDoc = doc;
window.firestoreGetDocs = getDocs;
window.firestoreQuery = query;
window.firestoreWhere = where;
window.firestoreOrderBy = orderBy;
window.firestoreOnSnapshot = onSnapshot;
window.firestoreServerTimestamp = serverTimestamp;

console.log('Firebase initialized successfully');
