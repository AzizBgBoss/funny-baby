# لعبة الرضيع الطريف

`لعبة الرضيع الطريف` is a chaotic, browser-based multiplayer arcade game inspired by Bomberman-style gameplay. The goal is to make something easy to join, funny to watch, simple to control, and wild enough to become a regular friend-group game night pick on phones and PCs.

The first milestone is not networking. We start by making the gameplay fun in a static browser build, then move into server-hosted multiplayer once the controls, bombs, explosions, and game feel are solid.

## Core Vision

- Arcade-first: fast rounds, simple rules, instant chaos
- Cross-platform: playable in a browser on phones and desktops
- Social: built for 4 to 8 players with both free-for-all and team modes
- Silly tone: baby-themed powerups, colorful visuals, and unserious energy
- Easy hosting: eventually self-hosted on a small server with room codes

## Core Gameplay

Players control baby-like characters in a destructible arena. Everyone moves around, places bombs, breaks soft blocks, grabs powerups, and tries to be the last one alive.

### Match Rules

- Arena style survival
- Last player standing wins in free-for-all
- Last team standing wins in team mode
- Short rounds with fast restarts

### Controls

- Desktop: `WASD` for movement, dedicated key for bomb placement
- Mobile: analog touch control for movement and a large bomb button

### Powerup Direction

Planned examples:

- `Milk Bottle`: shield
- `Candy`: temporary speed boost
- `Nap Time`: extra bomb capacity
- `Baby Rage`: larger explosion radius
- `Diaper`: silly debuff effect

## Development Philosophy

The project should be built in layers. Fun comes before infrastructure. Networking comes after the local prototype feels good.

Priorities:

1. Tight controls
2. Readable explosions
3. Fast round flow
4. Good mobile feel
5. Chaos that stays understandable

## Development Phases

## Phase 1: Static Gameplay Prototype

Goal: prove the game is fun in a single local HTML build with no server.

Scope:

- Single static page
- One human player
- CPU opponents for chaos and testing
- Desktop and mobile controls
- Arena generation
- Bombs, explosions, destructible blocks, deaths, and round reset

Deliverables:

- `index.html`
- `style.css`
- `game.js`

Success criteria:

- Movement feels responsive on keyboard and mobile touch
- Bomb placement and chain reactions are satisfying
- Bots create enough pressure to make rounds interesting
- A full round can be played and restarted without page reloads

## Phase 2: Arcade Fun and Polish

Goal: make the prototype feel memorable, readable, and funny.

Scope:

- Baby-themed powerups
- Better visual feedback
- Sound effects
- Stronger HUD and round flow
- Team mode support
- Bilingual UI structure

Success criteria:

- Players can understand what is happening even during chaos
- Powerups create funny moments without overwhelming clarity
- Mobile layout remains usable on smaller screens

## Phase 3: Multiplayer Foundation

Goal: turn the local prototype into a playable hosted game for friends.

Scope:

- Node.js server
- Room code system
- Join flow and lobby
- Match start and round progression
- Host-controlled game settings

Success criteria:

- Friends can join by link and room code
- A room can run a full match reliably
- The server controls the authoritative game state

## Phase 4: Multiplayer Game Authority

Goal: move all important gameplay logic to the server to support fair online play.

Scope:

- Server-authoritative simulation
- Client input events
- State synchronization
- Reconnect and disconnect handling
- Match result tracking

Success criteria:

- Clients cannot easily cheat by editing local game state
- Gameplay remains consistent across devices
- Bombs, deaths, and wins resolve the same way for everyone

## Phase 5: Final Party-Game Polish

Goal: make the game feel like a finished friend-group party game.

Scope:

- Better art and animation
- Improved bot behavior
- More powerups if needed
- Final language toggle and UI cleanup
- Audio polish
- Hosting and deployment instructions

Success criteria:

- Joining and starting a match is easy
- The game is fun for repeat sessions
- The visual tone feels intentional and distinctive

## Recommended Build Order

1. Grid and map rendering
2. Human movement
3. Mobile analog controls
4. Bomb placement and explosions
5. Destructible blocks
6. Death and round reset
7. CPU players
8. Powerups
9. Team mode
10. UI and presentation polish
11. Multiplayer server

## Things We Are Deliberately Not Doing First

- Native mobile apps
- Accounts or logins
- Matchmaking
- Persistence or progression systems
- Advanced AI before the basic fun is proven
- Networking before the static gameplay works well

## Long-Term Hosting Direction

Once the static prototype is fun, the game can be self-hosted on a small machine using a browser client and a lightweight Node.js backend. Players would join through a room code system, making it easy to share with friends on local networks or over the internet.

## Short Project Summary

This project starts as a polished local prototype and grows into a self-hosted multiplayer browser game. The north star is simple: make something chaotic, funny, readable, and easy to jump into with friends.
