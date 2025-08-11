// Importa las funciones que necesitas de los SDKs que necesitas
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ===================================================================================
// ESTA ES TU CONFIGURACIÓN REAL DE FIREBASE. ¡LISTO PARA USAR!
// ===================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCVqjRaslFzz9MJCh-GITX3nl_QN9umIXM",
  authDomain: "invitacion-bbf0c.firebaseapp.com",
  projectId: "invitacion-bbf0c",
  storageBucket: "invitacion-bbf0c.appspot.com",
  messagingSenderId: "812806117717",
  appId: "1:812806117717:web:a39d54fdc6dabb543f77dc",
  measurementId: "G-1VP3FZ5SF4"
};

// Usa un ID único para tu evento para que los datos no se mezclen con otros.
const eventId = "cumple-de-max-2025";

let db, auth, userId;
let attendeesState = [], notAttendeesState = [], maybeAttendeesState = [];

// --- Elementos del DOM ---
const rsvpForm = document.getElementById('rsvp-form');
const nameInput = document.getElementById('name');
const attendingList = document.getElementById('attending-list');
const notAttendingList = document.getElementById('not-attending-list');
const maybeList = document.getElementById('maybe-list');
const attendingCount = document.getElementById('attending-count');
const notAttendingCount = document.getElementById('not-attending-count');
const maybeCount = document.getElementById('maybe-count');
const notificationModal = document.getElementById('notification-modal');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

// --- Funciones ---

function showNotification(message) {
    modalMessage.textContent = message;
    notificationModal.classList.remove('hidden');
}

function hideNotification() {
    notificationModal.classList.add('hidden');
}

function renderAllLists() {
    const renderList = (listEl, state, className) => {
        listEl.innerHTML = '';
        state.forEach(guest => {
            const li = document.createElement('li');
            li.className = `attendee-item ${className}`;
            li.textContent = guest.name;
            listEl.appendChild(li);
        });
    };
    renderList(attendingList, attendeesState, 'text-gray-700');
    renderList(maybeList, maybeAttendeesState, 'text-gray-700');
    renderList(notAttendingList, notAttendeesState, 'text-gray-600 italic');
    attendingCount.textContent = attendeesState.length;
    notAttendingCount.textContent = notAttendeesState.length;
    maybeCount.textContent = maybeAttendeesState.length;
}

async function initializeAppAndListeners() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        const userCredential = await signInAnonymously(auth);
        userId = userCredential.user.uid;
        setupRealtimeListeners();

    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        if (error.code === 'auth/configuration-not-found') {
            showNotification("ACCIÓN REQUERIDA: Ve a tu consola de Firebase, entra en 'Authentication', luego en la pestaña 'Sign-in method' y habilita el proveedor 'Anónimo'.");
        } else {
            showNotification("No se pudo conectar con el servicio de confirmación.");
        }
    }
}

function setupRealtimeListeners() {
    const createListener = (collectionName, stateUpdater) => {
        const collRef = collection(db, `artifacts/${eventId}/public/data/${collectionName}`);
        onSnapshot(query(collRef), (snapshot) => {
            stateUpdater(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            renderAllLists();
        });
    };
    createListener('attendees', (data) => attendeesState = data);
    createListener('not_attendees', (data) => notAttendeesState = data);
    createListener('maybe_attendees', (data) => maybeAttendeesState = data);
}

async function findAndRemoveExistingGuest(name) {
    const collections = ['attendees', 'not_attendees', 'maybe_attendees'];
    const deletePromises = [];
    for (const coll of collections) {
        const collRef = collection(db, `artifacts/${eventId}/public/data/${coll}`);
        const q = query(collRef, where("name", "==", name));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            deletePromises.push(deleteDoc(doc.ref));
        });
    }
    await Promise.all(deletePromises);
}

// --- Event Listeners ---

rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!userId) { return; }
    const name = nameInput.value.trim();
    if (!name) {
        showNotification("Por favor, ingresa tu nombre.");
        return;
    }
    const attendance = document.querySelector('input[name="attendance"]:checked').value;
    const guestData = { name, timestamp: new Date() };

    try {
        await findAndRemoveExistingGuest(name);
        let targetCollection = '';
        if (attendance === 'yes') targetCollection = 'attendees';
        else if (attendance === 'no') targetCollection = 'not_attendees';
        else targetCollection = 'maybe_attendees';
        
        await addDoc(collection(db, `artifacts/${eventId}/public/data/${targetCollection}`), guestData);
        showNotification("¡Gracias! Tu respuesta ha sido actualizada.");
        rsvpForm.reset();
    } catch (error) {
        console.error("Error al guardar la confirmación: ", error);
        showNotification("Hubo un error al enviar tu confirmación.");
    }
});

modalCloseBtn.addEventListener('click', hideNotification);
notificationModal.addEventListener('click', (e) => {
    if (e.target === notificationModal) hideNotification();
});

// --- Iniciar la aplicación ---
initializeAppAndListeners();
