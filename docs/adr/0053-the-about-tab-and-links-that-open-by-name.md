# ADR 0053: The app settings have an Interface tab and an About tab, and a link opens by name

- Status: Accepted
- Date: 2026-10-16
- Amends: [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the first tab was called General)
- Relates to: [ADR 0013](0013-online-sources-for-volume-data.md) (the page names an online source, never an address), [ADR 0041](0041-the-window-loads-its-page-from-its-own-scheme.md) (what the page may read), [ADR 0016](0016-one-share-panel-fixed-title-bar-clickable-drop-area.md) (the title bar)

## Context

ADR 0052 made the dialog behind the gear a list of tabs, with one in it. More are coming (a folder to process in, and other choices that make the app better to use), so what each tab is for has to be settled before they pile up: a tab is one responsibility, and a choice goes where a person would look for it.

The app also says nothing about itself. A person cannot find which version is running (the title bar shows it, but only while the window is wide), where the guide is, how to report a problem, who drew the icon, what the licenses are, or how to support the work. The icon is shown nowhere in the window, only by the system, although the guide's site shows it in every page.

The window cannot open a page in the browser by itself: it may not navigate or open windows (`window.ts` refuses both), and the one door to the system browser takes the name of an online source and opens that source's registered address (ADR 0013), not a link of the window's own.

## Decision

- **The tabs are named for what a person decides in them.** The first is **Interface**: how the window speaks and looks, today the language. The second is **About**: what the app says about itself, and nothing a person can change. A tab of choices (a folder to process in, the tools) goes between them when it exists, with its own ADR where it changes what the app guarantees (ADR 0003 and ADR 0017 say that nothing is downloaded or updated at runtime). The id of the first tab changes from `general` to `interface`; nothing kept refers to it.
- **About holds**: the logo, the app's name and the running version, a line of what it is, links to the guide (in the language of the window), the source code and the issues, a button to support the project, the credits (the artist of the icon, JPmarquesbraga, and MangaDex, which gives volumes and authors when a person looks them up online), and the license (MIT, with the third-party notices; the converters' own notices ship in the app's resources). It is written in the window's language and fits the dialog on a 768px-high screen without scrolling.
- **A link opens by name.** The window sends `app:open-link` with the name of a place (`guide`, `repository`, `issues`, `license`, `third-party-notices`, `support`, `mangadex`) and its own language. The main process has the address for each, always https, and opens it with `shell.openExternal`; the guide's address depends on the language. The window can never give an address, as with the homepage of an online source. A place is added by one name in `src/shared/project-links-contract.ts` and one address in `src/main/project-links.ts`; the compiler says where it is missing. If the system cannot open one, the tab says so and nothing else happens.
- **The support address is one thing in four places**: the website's `supportUrl`, the `buy_me_a_coffee` of `.github/FUNDING.yml` here and in mangabind and mangapress, and `supportAddress` in `src/main/project-links.ts`. A unit test says when the three that are in this repository differ; changing service means changing all of them.
- **The logo is in the title bar, in place of the accent dot, at 20px, and in About at 96px.** It is the tight square master of the artwork (`assets/icons/mangabound.png`) exported at 48px and at 192px, so that screens at twice the density are sharp. The two are small (4.6 KB and 41 KB) and go inside the renderer's bundle as `data:` addresses, which the page's policy already allows (`img-src 'self' data:`); nothing new is served and the policy does not change. Both are decoration beside the app's name, so they have no text of their own for a screen reader, and the title bar's picture cannot be dragged, since the bar is what drags the window.
- **What About shows is not kept.** It reads the version from the bridge it already has and keeps nothing; it does not touch `app-settings.json`.

## Consequences

- The dialog now shows a row of two tabs, and the baseline of the picture of the dialog changes, as does every picture of the window that includes the title bar.
- A new place to link to is a name and an address, a test of the address, and a button; the bridge gains one method (`openProjectLink`) and the preload one channel, listed on purpose in the test of what the page is handed.
- The title bar and About depend on the logo files in `src/renderer/assets/`; when the artwork changes they are re-exported with the rest, as `assets/README.md` says.
- The About tab is the natural place for what comes next that is about the app and not a choice: the versions of the bundled converters, a link to the release notes of the running version, and the folder of the app's data.
