
const $ = id => document.getElementById(id);


// ==========================================
// LOGIN AND SESSION MANAGEMENT
// ==========================================

// Navigation between pages keeps the login active.
// Refreshing the page logs the user out.
// A successful login is allowed to complete its reload.

const navigationEntry = performance.getEntriesByType("navigation")[0];

const loginJustSucceeded =
    sessionStorage.getItem("niroLoginJustSet") === "true";

if (loginJustSucceeded) {
    sessionStorage.removeItem("niroLoginJustSet");
} else if (navigationEntry && navigationEntry.type === "reload") {
    sessionStorage.removeItem("niroLoggedIn");
}

const loggedIn = () =>
    sessionStorage.getItem("niroLoggedIn") === "true";


function updateAccess() {
    document.body.classList.toggle("couple-mode", loggedIn());

    document.querySelectorAll(".login-memory").forEach(el => {
        el.classList.toggle("hidden", loggedIn());
    });

    document.querySelectorAll(
        ".couple-profile, .role-label, .logout-button"
    ).forEach(el => {
        el.classList.toggle("hidden", !loggedIn());
    });
}


function openLogin() {
    $("loginModal")?.classList.remove("hidden");
}


function closeLogin() {
    $("loginModal")?.classList.add("hidden");
}


function logout() {
    sessionStorage.removeItem("niroLoggedIn");
    sessionStorage.removeItem("niroLoginJustSet");
    location.reload();
}


function setupLogin() {
    $("loginForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const username = $("username")?.value.trim();
        const password = $("password")?.value;

        if (username === "niro" && password === "2616") {
            sessionStorage.setItem("niroLoggedIn", "true");
            sessionStorage.setItem("niroLoginJustSet", "true");

            closeLogin();
            location.reload();
        } else {
            $("loginError").textContent =
                "Incorrect username or password.";
        }
    });
}


// ==========================================
// MEDIA ACCESS
// ==========================================

function visibleItems(items) {
    return (items || []).filter(item =>
        loggedIn() || item.visibility !== "couple"
    );
}


// ==========================================
// CREATE MEDIA CARDS
// ==========================================

function createCard(item, book = false) {
    const card = document.createElement("article");

    card.className = `media-card${book ? " book-card" : ""}`;

    const imageBox = document.createElement("div");
    imageBox.className = "media-image";

    const image = document.createElement("img");

    image.src = item.image || "assets/niro-hero.jpg";
    image.alt = item.title || "NIRO memory";
    image.loading = "lazy";

    imageBox.appendChild(image);

    if (item.type === "video" && !book) {
        const play = document.createElement("span");

        play.className = "media-play";
        play.textContent = "▶";

        imageBox.appendChild(play);
    }

    card.appendChild(imageBox);

    const title = document.createElement("h3");
    title.textContent = item.title || "Untitled memory";

    card.appendChild(title);

    if (item.description) {
        const description = document.createElement("p");

        description.textContent = item.description;

        card.appendChild(description);
    }

    card.addEventListener("click", () => {
        const url =
            item.url || item.image || "assets/niro-hero.jpg";

        openViewer(
            url,
            item.type === "video" && item.url ? "video" : "image"
        );
    });

    return card;
}


// ==========================================
// RENDER MEDIA SHELVES
// ==========================================

function renderShelf(id, items, book = false) {
    const track = $(id);

    if (!track) return;

    track.replaceChildren();

    visibleItems(items).forEach(item => {
        track.appendChild(createCard(item, book));
    });
}


// ==========================================
// MEDIA VIEWER
// ==========================================

function openViewer(url, type) {
    const viewer = $("viewer");
    const content = $("viewerContent");

    if (!viewer || !content) return;

    content.replaceChildren();

    const media = document.createElement(
        type === "video" ? "video" : "img"
    );

    media.src = url;

    if (type === "video") {
        media.controls = true;
        media.autoplay = true;
        media.playsInline = true;
    }

    content.appendChild(media);

    viewer.classList.remove("hidden");
}


function closeViewer() {
    const viewer = $("viewer");
    const content = $("viewerContent");

    viewer?.classList.add("hidden");

    // Stop any video when the viewer closes.
    content?.querySelectorAll("video").forEach(video => {
        video.pause();
        video.removeAttribute("src");
        video.load();
    });

    content?.replaceChildren();
}


// ==========================================
// HOMEPAGE HERO SLIDER
// ==========================================

function setupHero() {
    const slides = [
        ...document.querySelectorAll(".hero-slide")
    ];

    if (slides.length < 2) return;

    let active = 0;

    const dots = [
        ...document.querySelectorAll(".hero-indicators button")
    ];

    function show(index) {
        active = (index + slides.length) % slides.length;

        slides.forEach((slide, i) => {
            slide.classList.toggle("active", i === active);
        });

        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === active);
        });
    }

    $("heroPrev")?.addEventListener("click", () => {
        show(active - 1);
    });

    $("heroNext")?.addEventListener("click", () => {
        show(active + 1);
    });

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => show(i));
    });

    setInterval(() => show(active + 1), 7000);
}


// ==========================================
// BACKGROUND MUSIC
// ==========================================

function setupMusic() {
    const MUSIC_TIME_KEY = "niroMusicTime";
    const MUSIC_PLAYING_KEY = "niroMusicPlaying";

    const navigationEntry =
        performance.getEntriesByType("navigation")[0];

    const isReload = navigationEntry?.type === "reload";

    const niroMusic = new Audio("./assets/niro-music.mp3");

    niroMusic.loop = true;
    niroMusic.volume = 0.25;
    niroMusic.preload = "auto";

    // Floating music button
    const musicButton = document.createElement("button");

    musicButton.id = "musicToggle";
    musicButton.className = "music-toggle";
    musicButton.textContent = "♫ Play Music";

    musicButton.setAttribute(
        "aria-label",
        "Play or pause background music"
    );

    document.body.appendChild(musicButton);


    // On refresh, restart at 3 seconds.
    // On normal navigation, restore the previous position.

    let savedTime = isReload
        ? null
        : sessionStorage.getItem(MUSIC_TIME_KEY);

    let restoredTime = savedTime === null
        ? 3
        : Math.max(0, Number(savedTime) || 0);

    let musicEnabled = isReload
        ? true
        : sessionStorage.getItem(MUSIC_PLAYING_KEY) !== "false";

    let musicReady = false;
    let autoplayBlocked = false;


    function saveMusicState() {
        if (
            musicReady &&
            Number.isFinite(niroMusic.currentTime)
        ) {
            sessionStorage.setItem(
                MUSIC_TIME_KEY,
                String(niroMusic.currentTime)
            );
        }

        sessionStorage.setItem(
            MUSIC_PLAYING_KEY,
            String(musicEnabled)
        );
    }


    function updateButton() {
        musicButton.textContent = niroMusic.paused
            ? "♫ Play Music"
            : "♫ Music On";
    }


    function startMusic() {
        if (!musicEnabled || !musicReady) return;

        niroMusic.play()
            .then(() => {
                autoplayBlocked = false;
                updateButton();
            })
            .catch(error => {
                autoplayBlocked = true;
                updateButton();

                console.log(
                    "Autoplay blocked by browser:",
                    error
                );
            });
    }


    // Restore playback position after audio metadata loads.
    niroMusic.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(niroMusic.duration)) {
            restoredTime = Math.min(
                restoredTime,
                Math.max(0, niroMusic.duration - 0.1)
            );
        }

        niroMusic.currentTime = restoredTime;
    }, { once: true });


    // Attempt to play automatically when the audio is ready.
    niroMusic.addEventListener("canplay", () => {
        if (!musicReady) {
            musicReady = true;

            if (musicEnabled) {
                startMusic();
            } else {
                updateButton();
            }
        }
    }, { once: true });


    // Retry autoplay after the visitor interacts with the page.
    function firstInteraction(event) {
        if (event.target.closest("#musicToggle")) return;

        if (
            autoplayBlocked &&
            musicEnabled &&
            niroMusic.paused
        ) {
            startMusic();
        }
    }

    document.addEventListener("click", firstInteraction);
    document.addEventListener("touchstart", firstInteraction);
    document.addEventListener("keydown", firstInteraction);


    // Manual music button.
    musicButton.addEventListener("click", () => {
        if (niroMusic.paused) {
            musicEnabled = true;

            sessionStorage.setItem(
                MUSIC_PLAYING_KEY,
                "true"
            );

            if (musicReady) {
                startMusic();
            }
        } else {
            musicEnabled = false;

            niroMusic.pause();

            saveMusicState();
            updateButton();
        }
    });


    // Save playback position when navigating away.
    window.addEventListener("pagehide", saveMusicState);

    niroMusic.addEventListener("timeupdate", () => {
        sessionStorage.setItem(
            MUSIC_TIME_KEY,
            String(niroMusic.currentTime)
        );
    });


    // Show an error if the music file cannot be loaded.
    niroMusic.addEventListener("error", () => {
        musicButton.textContent = "♫ Music Unavailable";

        console.error(
            "Could not load assets/niro-music.mp3"
        );
    });


    // ======================================
    // PAUSE MUSIC WHEN A VIDEO STARTS
    // ======================================

    let resumeMusicAfterVideo = false;


    // Pause background music when any video starts.
    document.addEventListener("play", event => {
        if (event.target.tagName !== "VIDEO") return;

        // Remember whether music was playing before the video.
        resumeMusicAfterVideo = !niroMusic.paused;

        if (resumeMusicAfterVideo) {
            niroMusic.pause();
            updateButton();
        }
    }, true);


    // Resume music when the video is paused.
    document.addEventListener("pause", event => {
        if (event.target.tagName !== "VIDEO") return;

        if (resumeMusicAfterVideo) {
            resumeMusicAfterVideo = false;

            if (musicEnabled) {
                startMusic();
            }
        }
    }, true);


    // Resume music when the video finishes.
    document.addEventListener("ended", event => {
        if (event.target.tagName !== "VIDEO") return;

        if (resumeMusicAfterVideo) {
            resumeMusicAfterVideo = false;

            if (musicEnabled) {
                startMusic();
            }
        }
    }, true);
}


// ==========================================
// HOMEPAGE CONTENT
// ==========================================

function renderHome() {
    if (typeof NIRO_MEDIA === "undefined") return;

    renderShelf("homeReels", NIRO_MEDIA.reels);

    renderShelf(
        "homeBooks",
        NIRO_MEDIA.books,
        true
    );

    renderShelf(
        "homePhotos",
        NIRO_MEDIA.photos
    );
}


// ==========================================
// INITIALISE WEBSITE
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    setupLogin();

    updateAccess();

    setupHero();

    renderHome();

    setupMusic();

    setTimeout(() => {
        $("loader")?.classList.add("done");
    }, 850);
});
