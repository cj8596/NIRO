# NIRO — Couple memories website

A responsive, ivory-themed, Netflix-inspired static website. GitHub Pages hosts the frontend; Firebase provides real authentication, album metadata and media storage.

## What is included
- Guest and couple sign-in modes.
- Guest accounts can read albums marked **Guests & the couple**.
- Couple accounts can read all albums and create albums with photos/videos.
- Horizontal album rows, video/reel row, little-moments photo grid and full-screen viewer.
- Firebase security rules are included.

## Important architecture note
GitHub Pages is static hosting. It cannot securely store passwords, enforce private guest/couple permissions, or accept private uploads on its own. This project uses Firebase Authentication, Firestore and Storage for those features. Do not put private photos/videos in this GitHub repository.

## 1. Create and configure Firebase
1. Open https://console.firebase.google.com/ and create a project named `niro-memories` (or your preferred project ID).
2. Add a **Web app** in Project settings and copy its Firebase config.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Create a **Cloud Firestore** database.
5. Enable **Storage**.
6. Open `firebase-config.js` and replace every `PASTE_...` / `YOUR_PROJECT_ID` placeholder with your web app config.
7. In Firestore Rules, paste the contents of `firestore.rules` and publish.
8. In Storage Rules, paste the contents of `storage.rules` and publish.

Firebase may require a billing-enabled plan for Cloud Storage depending on your project creation date and current Firebase terms. Check the Firebase console before relying on uploads.

## 2. Create the two accounts and assign roles
1. In Firebase Console → Authentication → Users, add the couple account and guest account (or register them through a separate trusted process).
2. Copy each user's **UID**.
3. In Firestore, create a collection named `users`.
4. Create a document whose document ID is the couple user's exact UID. Add field `role` (string) = `couple`.
5. Create a document whose document ID is the guest user's exact UID. Add field `role` (string) = `guest`.

Role documents are deliberately not writable from the website. Never allow users to edit their own role. For additional guests, create an Auth account and matching `users/{uid}` document with `role: guest`.

## 3. Run locally
Because the site uses JavaScript modules, serve it over HTTP rather than opening `index.html` directly.

With Python installed, from this folder run:
```bash
python -m http.server 8000
```
Then open http://localhost:8000.

## 4. Deploy to GitHub Pages
1. Create a new GitHub repository, e.g. `niro-couple-website`.
2. Upload the project files to the repository root (keep `index.html` at the root).
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then Save.
6. Wait for the Pages deployment. Your site will be available at `https://YOUR-USERNAME.github.io/niro-couple-website/`.

If using a custom domain, add it in the Pages settings and configure DNS as GitHub instructs.

## 5. Firebase authorized domains
In Firebase Console → Authentication → Settings → Authorized domains, make sure your GitHub Pages hostname is listed (for example `YOUR-USERNAME.github.io`). Add your custom domain too, if you use one.

## Notes and sensible next steps
- This starter supports creating albums and uploading media. It does not yet include editing album details or deleting individual media items from the interface.
- Guests need an account created in Firebase; the guest login is not an open public sign-up.
- Use Firebase Console to disable an account if access should be revoked.
- For a production launch, consider upload progress, image resizing, pagination, backups and a custom invitation flow.
- Do not store Firebase service-account credentials or private admin keys in frontend code. The Firebase web config is intended for client apps; security is enforced by the published rules.
