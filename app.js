// ==========================================
// NIRO - MAIN JAVASCRIPT
// ==========================================

const $ = id => document.getElementById(id);


// ==========================================
// 1. LOGIN AND SESSION MANAGEMENT
// ==========================================

const navigationEntry =
    performance.getEntriesByType("navigation")[0];

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
// 2. MEDIA ACCESS
// ==========================================

function visibleItems(items) {
    return (items || []).filter(item =>
        loggedIn() || item.visibility !== "couple"
    );
}


// ==========================================
// 3. CREATE MEDIA CARDS
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
        if (book && item.type === "flipbook") {
            openFlipbook(item);
            return;
        }

        if (book && item.type === "pdf") {
            openViewer(item.url, "pdf");
            return;
        }

        const url = item.url || item.image || "assets/niro-hero.jpg";

        openViewer(
            url,
            item.type === "video" && item.url ? "video" : "image"
        );
    });

    return card;
}


// ==========================================
// 4. RENDER MEDIA SHELVES
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
// 5. IMAGE, VIDEO AND PDF VIEWER
// ==========================================

function openViewer(url, type) {
    const viewer = $("viewer");
    const content = $("viewerContent");

    if (!viewer || !content || !url) return;

    content.replaceChildren();

    let media;

    if (type === "video") {
        media = document.createElement("video");
        media.controls = true;
        media.autoplay = true;
        media.playsInline = true;

    } else if (type === "pdf") {
        media = document.createElement("iframe");

        media.title = "NIRO Photobook";
        media.setAttribute("loading", "lazy");

        media.style.width = "90vw";
        media.style.height = "85vh";
        media.style.maxWidth = "1100px";
        media.style.border = "none";
        media.style.background = "#fff";

    } else {
        media = document.createElement("img");
        media.alt = "NIRO memory";
    }

    media.src = url;
    content.appendChild(media);

    viewer.classList.remove("hidden");
}


function closeViewer() {
    const viewer = $("viewer");
    const content = $("viewerContent");

    content?.querySelectorAll("video").forEach(video => {
        video.pause();
        video.removeAttribute("src");
        video.load();
    });

    content?.querySelectorAll("iframe").forEach(frame => {
        frame.src = "about:blank";
    });

    viewer?.classList.add("hidden");
    content?.replaceChildren();
}


// ==========================================
// 6. HOMEPAGE HERO SLIDER
// ==========================================

function setupHero() {
    const slides = [...document.querySelectorAll(".hero-slide")];

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

    $("heroPrev")?.addEventListener("click", () => show(active - 1));
    $("heroNext")?.addEventListener("click", () => show(active + 1));

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => show(i));
    });

    setInterval(() => show(active + 1), 7000);
}


// ==========================================
// 7. NIRO DIGITAL PHOTOBOOK
// Realistic 3D page turning
// ==========================================

let flipbookIndex = 0;
let flipbookPages = [];
let flipbookBusy = false;
let flipbookTimer = null;


function openFlipbook(book) {
    if (!Array.isArray(book.pages) || !book.pages.length) {
        console.error("No page images found for:", book.title);
        return;
    }

    flipbookPages = book.pages;
    flipbookIndex = 0;
    flipbookBusy = false;

    let viewer = $("flipbookViewer");

    if (!viewer) {
        viewer = document.createElement("div");
        viewer.id = "flipbookViewer";
        viewer.className = "flipbook-viewer";

        viewer.innerHTML = `
            <button class="flipbook-close"
                aria-label="Close book">×</button>

            <div class="flipbook-heading"></div>

            <div class="flipbook-stage">

                <button class="flipbook-arrow previous"
                    aria-label="Previous page">‹</button>

                <div class="flipbook-page-wrap">

                    <div class="flipbook-page-stack">

                        <img class="flipbook-under-image"
                            alt=""
                            draggable="false">

                        <div class="flipbook-turn-sheet">

                            <div class="flipbook-sheet-front">
                                <img class="flipbook-image"
                                    alt="Photobook page"
                                    draggable="false">
                            </div>

                            <div class="flipbook-sheet-back">
                                <img class="flipbook-back-image"
                                    alt=""
                                    draggable="false">
                            </div>

                        </div>

                    </div>

                </div>

                <button class="flipbook-arrow next"
                    aria-label="Next page">›</button>

            </div>

            <div class="flipbook-controls">
                <span class="flipbook-counter"></span>
            </div>

            <div class="flipbook-hint">
                Turn the page to continue our story
            </div>
        `;

        document.body.appendChild(viewer);

        viewer.querySelector(".flipbook-close")
            .addEventListener("click", closeFlipbook);

        viewer.querySelector(".previous")
            .addEventListener("click", () => turnFlipbook(-1));

        viewer.querySelector(".next")
            .addEventListener("click", () => turnFlipbook(1));

        // Mobile swipe navigation
        let touchStartX = 0;
        let touchStartY = 0;

        viewer.addEventListener("touchstart", event => {
            if (!event.changedTouches.length) return;

            touchStartX = event.changedTouches[0].screenX;
            touchStartY = event.changedTouches[0].screenY;
        }, { passive: true });

        viewer.addEventListener("touchend", event => {
            if (!event.changedTouches.length) return;

            const dx = event.changedTouches[0].screenX - touchStartX;
            const dy = event.changedTouches[0].screenY - touchStartY;

            if (
                Math.abs(dx) > 45 &&
                Math.abs(dx) > Math.abs(dy) * 1.25
            ) {
                turnFlipbook(dx < 0 ? 1 : -1);
            }
        }, { passive: true });
    }

    viewer.querySelector(".flipbook-heading").textContent =
        book.title || "Our Memories";

    viewer.classList.add("active");

    showFlipbookPage();

    document.addEventListener("keydown", flipbookKeyboard);
}


// Preload an image before turning
function preloadFlipbookPage(index) {
    return new Promise(resolve => {
        const image = new Image();

        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);

        image.src = flipbookPages[index];
    });
}


// Display the current page
function showFlipbookPage() {
    const viewer = $("flipbookViewer");

    if (!viewer) return;

    const current = viewer.querySelector(".flipbook-image");
    const under = viewer.querySelector(".flipbook-under-image");
    const back = viewer.querySelector(".flipbook-back-image");
    const sheet = viewer.querySelector(".flipbook-turn-sheet");

    current.src = flipbookPages[flipbookIndex];
    current.alt = `Page ${flipbookIndex + 1}`;

    const nextIndex = Math.min(
        flipbookIndex + 1,
        flipbookPages.length - 1
    );

    under.src = flipbookPages[nextIndex];
    back.src = flipbookPages[nextIndex];

    sheet.classList.remove("turn-forward", "turn-backward");

    viewer.querySelector(".flipbook-counter").textContent =
        `${flipbookIndex + 1} of ${flipbookPages.length}`;

    viewer.querySelector(".previous").disabled =
        flipbookIndex === 0;

    viewer.querySelector(".next").disabled =
        flipbookIndex === flipbookPages.length - 1;
}


// Turn page forward or backward
async function turnFlipbook(direction) {
    if (flipbookBusy) return;

    const nextIndex = flipbookIndex + direction;

    if (nextIndex < 0 || nextIndex >= flipbookPages.length) return;

    const viewer = $("flipbookViewer");

    if (!viewer || !viewer.classList.contains("active")) return;

    const sheet = viewer.querySelector(".flipbook-turn-sheet");
    const under = viewer.querySelector(".flipbook-under-image");
    const back = viewer.querySelector(".flipbook-back-image");
    const current = viewer.querySelector(".flipbook-image");

    flipbookBusy = true;

    await preloadFlipbookPage(nextIndex);

    if (!viewer.classList.contains("active")) {
        flipbookBusy = false;
        return;
    }

    // Set the destination page underneath the turning sheet.
    under.src = flipbookPages[nextIndex];
    back.src = flipbookPages[nextIndex];

    sheet.classList.remove("turn-forward", "turn-backward");

    void sheet.offsetWidth;

    sheet.classList.add(
        direction > 0 ? "turn-forward" : "turn-backward"
    );

    let finished = false;

    function finishTurn() {
        if (finished) return;

        finished = true;

        clearTimeout(flipbookTimer);

        sheet.removeEventListener("animationend", finishTurn);

        if (viewer.classList.contains("active")) {
            flipbookIndex = nextIndex;

            sheet.classList.remove("turn-forward", "turn-backward");

            current.src = flipbookPages[flipbookIndex];

            const nextPage = Math.min(
                flipbookIndex + 1,
                flipbookPages.length - 1
            );

            under.src = flipbookPages[nextPage];
            back.src = flipbookPages[nextPage];

            viewer.querySelector(".flipbook-counter").textContent =
                `${flipbookIndex + 1} of ${flipbookPages.length}`;

            viewer.querySelector(".previous").disabled =
                flipbookIndex === 0;

            viewer.querySelector(".next").disabled =
                flipbookIndex === flipbookPages.length - 1;
        }

        flipbookBusy = false;
    }

    sheet.addEventListener("animationend", finishTurn, { once: true });

    flipbookTimer = setTimeout(finishTurn, 1000);
}


// Close book
function closeFlipbook() {
    const viewer = $("flipbookViewer");

    viewer?.classList.remove("active");

    clearTimeout(flipbookTimer);

    document.removeEventListener("keydown", flipbookKeyboard);

    flipbookBusy = false;
}


// Keyboard navigation
function flipbookKeyboard(event) {
    const viewer = $("flipbookViewer");

    if (!viewer?.classList.contains("active")) return;

    if (event.key === "ArrowRight") turnFlipbook(1);
    if (event.key === "ArrowLeft") turnFlipbook(-1);
    if (event.key === "Escape") closeFlipbook();
}


// ==========================================
// 8. BACKGROUND MUSIC
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

    const musicButton = document.createElement("button");

    musicButton.id = "musicToggle";
    musicButton.className = "music-toggle";
    musicButton.textContent = "♫ Play Music";

    musicButton.setAttribute(
        "aria-label",
        "Play or pause background music"
    );

    document.body.appendChild(musicButton);

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
        if (musicReady && Number.isFinite(niroMusic.currentTime)) {
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
                console.log("Autoplay blocked by browser:", error);
            });
    }

    niroMusic.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(niroMusic.duration)) {
            restoredTime = Math.min(
                restoredTime,
                Math.max(0, niroMusic.duration - 0.1)
            );
        }

        niroMusic.currentTime = restoredTime;
    }, { once: true });

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

    function firstInteraction(event) {
        if (event.target.closest("#musicToggle")) return;

        if (autoplayBlocked && musicEnabled && niroMusic.paused) {
            startMusic();
        }
    }

    document.addEventListener("click", firstInteraction);
    document.addEventListener("touchstart", firstInteraction);
    document.addEventListener("keydown", firstInteraction);

    musicButton.addEventListener("click", () => {
        if (niroMusic.paused) {
            musicEnabled = true;

            sessionStorage.setItem(MUSIC_PLAYING_KEY, "true");

            if (musicReady) startMusic();

        } else {
            musicEnabled = false;

            niroMusic.pause();

            saveMusicState();
            updateButton();
        }
    });

    window.addEventListener("pagehide", saveMusicState);

    niroMusic.addEventListener("timeupdate", () => {
        sessionStorage.setItem(
            MUSIC_TIME_KEY,
            String(niroMusic.currentTime)
        );
    });

    niroMusic.addEventListener("error", () => {
        musicButton.textContent = "♫ Music Unavailable";
        console.error("Could not load assets/niro-music.mp3");
    });

    // Pause music when video plays
    let resumeMusicAfterVideo = false;

    document.addEventListener("play", event => {
        if (event.target.tagName !== "VIDEO") return;

        resumeMusicAfterVideo = !niroMusic.paused;

        if (resumeMusicAfterVideo) {
            niroMusic.pause();
            updateButton();
        }
    }, true);

    document.addEventListener("pause", event => {
        if (event.target.tagName !== "VIDEO") return;

        if (resumeMusicAfterVideo) {
            resumeMusicAfterVideo = false;

            if (musicEnabled) startMusic();
        }
    }, true);

    document.addEventListener("ended", event => {
        if (event.target.tagName !== "VIDEO") return;

        if (resumeMusicAfterVideo) {
            resumeMusicAfterVideo = false;

            if (musicEnabled) startMusic();
        }
    }, true);
}


// ==========================================
// 9. HOMEPAGE CONTENT
// ==========================================

function renderHome() {
    if (typeof NIRO_MEDIA === "undefined") return;

    renderShelf("homeReels", NIRO_MEDIA.reels);

    renderShelf("homeBooks", NIRO_MEDIA.books, true);

    renderShelf("homePhotos", NIRO_MEDIA.photos);
}


// ==========================================
// 10. INITIALISE WEBSITE
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