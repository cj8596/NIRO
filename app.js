import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, query, where, orderBy, serverTimestamp, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const $ = (id) => document.getElementById(id);
let loginMode = "guest";
let currentRole = null;
let allAlbums = [];

$("footer-year").textContent = new Date().getFullYear();
document.querySelectorAll(".switch").forEach(btn => btn.addEventListener("click", () => {
  loginMode = btn.dataset.mode;
  document.querySelectorAll(".switch").forEach(b => b.classList.toggle("active", b === btn));
  $("login-error").textContent = "";
}));
$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("login-button").disabled = true;
  $("login-error").textContent = "";
  try {
    const credential = await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    const roleSnap = await getDoc(doc(db, "users", credential.user.uid));
    const role = roleSnap.data()?.role;
    if (!role || role !== loginMode) {
      await signOut(auth);
      throw new Error("This account does not have " + loginMode + " access. Please choose the correct login.");
    }
  } catch (error) {
    $("login-error").textContent = friendlyError(error);
  } finally {
    $("login-button").disabled = false;
  }
});
$("logout-button").addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, async user => {
  if (!user) {
    $("login-screen").classList.remove("hidden");
    $("app-screen").classList.add("hidden");
    return;
  }
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    currentRole = snap.data()?.role;
    if (!["guest", "couple"].includes(currentRole)) throw new Error("Your account has not been assigned a role yet.");
    $("login-screen").classList.add("hidden");
    $("app-screen").classList.remove("hidden");
    $("role-label").textContent = currentRole === "couple" ? "COUPLE ACCESS" : "GUEST VIEW";
    $("couple-tools").classList.toggle("hidden", currentRole !== "couple");
    $("welcome-title").textContent = currentRole === "couple" ? "Welcome back to your little world." : "A little world of our own.";
    await loadAlbums();
  } catch (error) {
    $("login-error").textContent = error.message;
    await signOut(auth);
  }
});

async function loadAlbums() {
  const q = currentRole === "couple"
    ? query(collection(db, "albums"), orderBy("createdAt", "desc"))
    : query(collection(db, "albums"), where("visibility", "==", "guest"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  allAlbums = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderAlbums();
}
function renderAlbums() {
  const rows = $("album-rows");
  rows.innerHTML = "";
  const visible = allAlbums;
  if (!visible.length) { rows.innerHTML = '<p class="empty-state">Your albums will appear here once they’re added.</p>'; return; }
  const row = document.createElement("div");
  row.className = "album-row";
  visible.forEach(album => {
    const card = document.createElement("article");
    card.className = "album-card";
    const cover = album.media?.find(m => m.type === "image")?.url || "";
    card.innerHTML = `<div class="album-cover">${cover ? `<img src="${escapeAttr(cover)}" alt="">` : ""}<span class="count">${album.media?.length || 0} ITEMS</span></div><h3>${escapeHtml(album.title)}</h3><p>${escapeHtml(album.description || "A chapter in our story")}</p>`;
    card.addEventListener("click", () => openAlbum(album));
    if (currentRole === "couple") {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "album-remove";
      remove.textContent = "Delete album";
      remove.addEventListener("click", async (event) => {
        event.stopPropagation();
        if (!confirm(`Delete “${album.title}” and all its media? This cannot be undone.`)) return;
        try {
          for (const item of (album.media || [])) {
            if (item.path) await deleteObject(ref(storage, item.path)).catch(() => {});
          }
          await deleteDoc(doc(db, "albums", album.id));
          await loadAlbums();
        } catch (error) { alert("Could not delete album: " + friendlyError(error)); }
      });
      card.appendChild(remove);
    }
    row.appendChild(card);
  });
  rows.appendChild(row);
  renderMedia();
}
function renderMedia() {
  const reels = $("reel-row"), moments = $("moments-grid");
  reels.innerHTML = ""; moments.innerHTML = "";
  const media = allAlbums.flatMap(a => (a.media || []).map(m => ({...m, albumTitle:a.title})));
  const videos = media.filter(m => m.type === "video");
  const photos = media.filter(m => m.type === "image");
  if (!videos.length) reels.innerHTML = '<p class="empty-state">The moving memories will live here.</p>';
  videos.forEach(m => reels.appendChild(mediaCard(m, true)));
  if (!photos.length) moments.innerHTML = '<p class="empty-state">A little space for everyday magic.</p>';
  photos.slice(0, 12).forEach(m => {
    const card = document.createElement("div"); card.className = "moment-card";
    card.innerHTML = `<img src="${escapeAttr(m.url)}" alt="${escapeAttr(m.name || "A memory")}" loading="lazy">`;
    card.addEventListener("click", () => openViewer(m));
    moments.appendChild(card);
  });
}
function mediaCard(m, isVideo) {
  const card = document.createElement("article"); card.className = "media-card";
  card.innerHTML = `<div class="media-thumb ${isVideo ? "video" : ""}">${isVideo ? "" : `<img src="${escapeAttr(m.url)}" alt="" loading="lazy">`}</div><p>${escapeHtml(m.name || m.albumTitle || "A little memory")}</p>`;
  card.addEventListener("click", () => openViewer(m)); return card;
}
function openAlbum(album) {
  const viewer = $("viewer"), content = $("viewer-content");
  content.innerHTML = "";
  const grid = document.createElement("div"); grid.className = "album-view-grid";
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;max-height:75vh;overflow:auto;width:min(85vw,900px)";
  (album.media || []).forEach(m => {
    const tile = document.createElement("div");
    tile.style.cssText = "position:relative;min-width:0";
    const el = document.createElement(m.type === "video" ? "video" : "img");
    el.src = m.url; el.style.cssText = "width:100%;height:220px;object-fit:cover;cursor:pointer";
    if (m.type === "video") { el.controls = true; el.style.objectFit = "contain"; }
    else el.addEventListener("click", () => openViewer(m));
    tile.appendChild(el);
    if (currentRole === "couple") {
      const remove = document.createElement("button");
      remove.type = "button"; remove.textContent = "Remove";
      remove.style.cssText = "margin-top:6px;padding:7px 10px;border:1px solid #d6c7b6;background:#fffdf9;color:#685747;font-size:10px;cursor:pointer";
      remove.addEventListener("click", async () => {
        if (!confirm(`Remove “${m.name}” from this album?`)) return;
        try {
          const remaining = (album.media || []).filter(item => item.path !== m.path);
          await deleteDocMedia(album, m, remaining);
          $("viewer-caption").textContent = "Memory removed.";
          await loadAlbums();
          setTimeout(() => openAlbum(allAlbums.find(a => a.id === album.id) || {...album, media: remaining}), 250);
        } catch (error) { alert("Could not remove media: " + friendlyError(error)); }
      });
      tile.appendChild(remove);
    }
    grid.appendChild(tile);
  });
  content.appendChild(grid); $("viewer-caption").textContent = album.title + (album.description ? " — " + album.description : "");
  viewer.classList.remove("hidden");
}
async function deleteDocMedia(album, mediaItem, remaining) {
  const { updateDoc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await updateDoc(doc(db, "albums", album.id), { media: remaining });
  if (mediaItem.path) await deleteObject(ref(storage, mediaItem.path)).catch(() => {});
}
function openViewer(m) {
  const content = $("viewer-content"); content.innerHTML = "";
  const el = document.createElement(m.type === "video" ? "video" : "img");
  el.src = m.url; if (m.type === "video") { el.controls = true; el.autoplay = true; }
  else el.alt = m.name || "A memory";
  content.appendChild(el); $("viewer-caption").textContent = m.name || m.albumTitle || "A little memory";
  $("viewer").classList.remove("hidden");
}
$("viewer-close").addEventListener("click", () => { $("viewer").classList.add("hidden"); $("viewer-content").innerHTML = ""; });
$("viewer").addEventListener("click", e => { if (e.target === $("viewer")) $("viewer-close").click(); });

$("album-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (currentRole !== "couple") return;
  const files = [...$("media-files").files];
  if (!files.length) { $("upload-status").textContent = "Choose at least one photo or video first."; return; }
  if (files.some(f => f.size > 150 * 1024 * 1024)) { $("upload-status").textContent = "Each file must be smaller than 150 MB."; return; }
  $("create-album-button").disabled = true;
  $("upload-status").textContent = "Creating album…";
  let albumRef;
  try {
    albumRef = await addDoc(collection(db, "albums"), {
      title: $("album-title").value.trim(),
      description: $("album-description").value.trim(),
      visibility: $("album-visibility").value,
      media: [],
      createdAt: serverTimestamp()
    });
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      $("upload-status").textContent = `Uploading ${i + 1} of ${files.length}: ${file.name}`;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `albums/${albumRef.id}/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      uploaded.push({ name: file.name, type: file.type.startsWith("video/") ? "video" : "image", path, url: await getDownloadURL(storageRef) });
    }
    const { updateDoc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
    await updateDoc(albumRef, { media: uploaded });
    $("album-form").reset();
    $("upload-status").textContent = "Your album is now in the archive.";
    await loadAlbums();
  } catch (error) {
    $("upload-status").textContent = "Upload failed: " + friendlyError(error);
  } finally {
    $("create-album-button").disabled = false;
  }
});

function friendlyError(error) {
  const messages = {
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/too-many-requests":"Too many attempts. Please try again later.",
    "auth/network-request-failed":"Network error. Check your connection."
  };
  return messages[error.code] || error.message || "Something went wrong.";
}
function escapeHtml(s="") { return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function escapeAttr(s="") { return escapeHtml(s); }
