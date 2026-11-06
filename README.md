
> [!NOTE]
> This project is still in development, and is not yet complete. Please be patient with us as we work on it, and please report any bugs you find to the Discord server (specifically on the #`bug-report` forum) or the Issues page on this repository. Thank you for your support!

<div align="center">
  <img  
  alt="Web Dashers" 
  src="./wd_branding/wordmark/wordmark_1080.png" 
  />
  <p>
  <strong>A modded Geometry Dash demo with extra features added!</strong>
  </p>
  <a 
  href="https://web-dashers.github.io/" 
  target="_blank">
    <img 
    width="279" 
    height="89" 
    alt="PlayOnline" 
    src="https://github.com/user-attachments/assets/830fc500-f289-4b96-9686-4fbb5b9af3f5" 
    />
  </a>
  &nbsp;
  <a 
  href="https://discord.gg/h6xYNUBFnq" 
  target="_blank">
    <img 
    width="279" 
    height="89" 
    alt="JoinTheDiscord" 
    src="https://github.com/user-attachments/assets/285a9de1-e72a-491a-9dd4-3d31887e73b2" 
    />
  </a>
</div>

---

## Features currently implemented:
- **Main Menu** - A mostly fully working main menu with all 2.1 levels.
- **Online Levels** - You can play online levels, and create your own!
- **Icon Kit** - A working Icon Kit with different colors and icons to choose from! (Currently not including 2.2 icons.)
- **Different Gamemodes** - Just about every gamemode is implemented currently, with the exception of the Swing.
- **Extra Settings** - You can enable and disable things like Noclip or Show Hitboxes from the settings menu, along with other settings, like the level percentage!

## Things currently in development:
- **Practice Mode** - Although an early version of Practice mode is already in the game, we hope to make a completely working Practice Mode with no bugs at all.
- **Level Editor** - We wish to add a fully working level editor, with all of the objects in Geometry Dash to choose from, and more! Currently, the editor is very run down and still needs a big amount of it's features to be added.
- **Slopes** - Slopes are almost done, but we need to get their physics correct with other speed portals. 

<sub> beg pinkdev to please finish slopes faster he is taking too long<sub>

## What we hope to see added in the future:
- **All Gamemodes** - Currently, every gamemode except the Swing has been implemented. There is a chance it will, and will not be added.
- **All Objects Working** - In the current state of Web Dashers, you might notice some objects seem to be bugged, such as a lack of animations, and coloring being incorrect.

### Come try out the WIP Web Dashers demo at:
**[web-dashers.github.io](https://web-dashers.github.io/)**

<sub> Last updated: 8/7/2026

## Deploying to GitHub Pages

Web Dashers is a pure static site (no build step, no server), so it deploys to
GitHub Pages directly.

### Option A — Automatic (recommended)

This repo includes a GitHub Actions workflow at
`.github/workflows/deploy-pages.yml`. To enable it:

1. Push the repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.

Every push to `main` (or `master`) then auto-deploys. You can also trigger a
run manually from the **Actions** tab.

### Option B — Manual (branch)

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **Deploy from a branch**.
3. Choose the branch (`main`) and the **root** (`/`) folder, then **Save**.

The site uses relative asset paths, so it works with **no extra configuration**
under either URL style.

### Getting the bare `[site].github.io` URL

GitHub Pages serves at the root domain **only** for a *user/org site*, which
must live in a repository named exactly `<username>.github.io`. This project's
repo is **`web-dashers/web-dashers.github.io`**, so it is served at
**`https://web-dashers.github.io/`** (no `/repo` suffix).

1. Push this project into the **`web-dashers.github.io`** repo.
2. Enable Pages (either method above).

A differently-named project repo (`<anything-else>`) is always served at
`https://<username>.github.io/<repo>/` — that's a GitHub rule, not a code
setting, so no code changes are needed either way.




---
> - <sub>Special thanks to all of the people that help the project by contributing, and Please support us by starring the repo, as it helps us out a ton!!<sub>
> - <sub>Also, please report bugs found to the Discord server or the Issues page on github, just please dont be annoying about it, and don't make bug reports about bugs already being worked on or ones that are already known about.<sub>
