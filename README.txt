NIRO — COMPLETE STATIC WEBSITE

FILES
- index.html: homepage and featured banner
- reels.html: reels page (Dates and Dances are couple-only)
- books.html: yearly and trip photobooks
- photos.html: photo collections
- style.css: shared ivory/teal styling and typography
- app.js: loader, login UI, cards, viewer, homepage banner controls
- media-data.js: edit your content and media URLs
- assets/: put your photographs here

SETUP
1. Keep all files in the same NIRO folder.
2. Create an assets folder if it does not exist.
3. Put your couple banner photo at assets/niro-hero.jpg.
4. Put NIRO's profile photo at assets/niro-profile.jpg.
5. Upload the files to the root of your GitHub Pages repository.
6. Enable GitHub Pages from Settings > Pages.

LOGIN
Username: niro
Password: 2616

IMPORTANT
This is a static, client-side login for convenience only. It does not provide secure authentication or protect images/videos in a public GitHub repository. Do not upload sensitive media.

ADDING CONTENT
Edit media-data.js. Use:
- visibility: "guest" for guest-visible content
- visibility: "couple" for content hidden until NIRO logs in
- category: "trips", "dates", "dances", "yearly", or "collections"
- image: relative path or hosted image URL
- url: hosted video URL for video playback

The sample entries are placeholders. Replace them with your actual content.
