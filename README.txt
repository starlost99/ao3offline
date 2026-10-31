READING DASHBOARD - HOME SCREEN APP
===================================

What's in this folder
  index.html            the page (it just loads app.js)
  app.js                your script, exactly as it is now
  manifest.webmanifest  tells iPhone it's an app
  sw.js                 lets it open without internet
  icon-*.png            the app icon

STEP 1 - Put the folder online (pick ONE)

  A) Netlify Drop (easiest, on a computer)
     1. Go to app.netlify.com/drop
     2. Drag the whole ao3-home-app folder onto the page.
     3. You get a link like https://something-random.netlify.app
        Keep that link private (see the note at the bottom).

  B) GitHub Pages (works from a phone browser)
     1. Make a free GitHub account, then a new repository.
     2. "Add file" > "Upload files": upload the files from this
        folder (not the folder itself) and commit.
     3. Settings > Pages > deploy from the main branch.
     4. Your link is https://YOURNAME.github.io/REPONAME/

STEP 2 - Add it to your Home Screen
  1. Open the link in SAFARI on your iPhone.
  2. Tap Share > "Add to Home Screen" > Add.
  3. Open it from the Home Screen icon (not from Safari).

STEP 3 - Load your data
  The app starts empty because Home Screen apps keep their own storage.
  Tap the cloud "sync" pill at the bottom and sign in with the same
  cloud sync email and password you use in the userscript. Your fics,
  logs and everything else come down. After that it syncs both ways.
  (Or use export / import json in the dashboard footer.)

UPDATING THE SCRIPT LATER
  Replace app.js with your newer script, upload it again, then close
  the app fully and reopen it (twice if it still shows the old version).

GOOD TO KNOW
  - Fic links open in Safari. The app can't run on AO3 itself, so keep
    using your normal userscript there.
  - It can't check AO3 for new chapters; it shows what your tracker
    last saw.
  - app.js contains your sync server address and key. Don't share the
    link, and don't make the site listed or searchable.
