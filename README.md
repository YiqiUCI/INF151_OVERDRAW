# OVERDRAW — INF151 Group Project

A deckbuilding combat prototype built around the risk of going over 21.

Download the project and open **OVERDRAW.html** in a browser. The game,
artwork, music, and sound effects are embedded in this file, so it works
offline without installing dependencies or starting a server.

## Three-encounter build (v1.5)

The starter deck now has a minimum cost of **5 Point** per card. Every card
still has two starter copies. Base attack numbers are unchanged and are now
labelled **Damage**, including cards, the deck list, and the English/Chinese help.

| Starter card | Point | Damage |
| --- | --- | --- |
| Quick Cut | 5 | 3 |
| Brace | 5 | 2 |
| Follow Through | 5 | 5 |
| Heavy Strike | 7 | 10 |
| Precision | 5 | 6 |
| Last Word | 8 | 12 |

Reward Point costs remain Set Up 1, Fortify 3, and Clean Finish 6. In a
fresh starter shuffle, four consecutive draws exceed 21 in **425 of 495**
possible four-card combinations (about **85.9%**, previously 28.7%). This is
a deck probability, not an observed participant Bust rate.

The repeatable opening keeps Brace → Heavy Strike → Precision: **17 Point,
18 Damage, 4 Block**. Stand leaves the Gatekeeper at 6 HP and you at 39 HP.
The fourth Heavy Strike causes a **24 Point Bust**, leaving the enemy at
24 HP and you at 35 HP. Exported logs identify this build as v1.5.

| Encounter | Enemy | HP | Repeating attacks |
| --- | --- | --- | --- |
| 1 | Gatekeeper | 24 | 5, 7, 4 |
| 2 | Candle-Eye Slug | 32 | 6, 8, 5 |
| 3 | Deer-Bone Priest — Boss | 42 | 7, 10, 8 |

All three enemies use the original combat rules. The Priest is currently
distinguished by its artwork, Boss label, and higher stats. Dedicated Boss
mechanics are deferred; busts do not increase future enemy attacks.

Every defeated enemy offers the same three card rewards: **Set Up**,
**Fortify**, or **Clean Finish**. Choose one or Skip. HP and earned cards
carry into the next encounter. Quiet Counter is granted once, after the
Gatekeeper. The final Boss also gives a reward; claiming or skipping it
completes the run.

The new enemies share the existing breathing movement, attack and damage
feedback, card animations, sound effects, and background music. Their original
PNG files are in **assets/monsters/**, and copies are embedded in the game.

Both portraits are enlarged and placed behind the original tabletop. The
Priest is visible to the waist; the Slug shows its head, shoulders, cards,
and the tops of its hands. The table edge stays fixed during breathing and
combat feedback.

## Controls

- **H / HIT:** draw a card.
- **S / STAND:** resolve your chain.
- **N / NEXT TURN:** discard the resolved chain and start the next turn.
- **Deck:** inspect the current deck.
- **Restart:** choose a fresh shuffle or the repeatable opening.
- **SFX / Music / Music volume:** adjust audio.
- **Export log:** download this browser's run history.

Above 21 is a bust: pending damage and Block are lost, and the enemy attacks.
A defeated enemy cannot retaliate. Browser autoplay rules require an initial
interaction before music starts. System reduced-motion preferences are respected.

## Verification

With Node.js installed, run:

```sh
node --test tests/game.test.cjs
```

The tests cover the starter Point floor, increased four-draw Bust risk,
Damage fields and bilingual card labels, the revised repeatable opening,
encounter order, all three reward screens, final victory,
HP and deck carryover, attack cycles, busts, defeated-enemy retaliation,
duplicate reward prevention, Quiet Counter, defeat, and restart.

The earlier three-encounter build was exercised in headless Microsoft Edge
at desktop and mobile sizes. This v1.5 change was verified with Node.js
rules and card-markup tests; browser rendering was not rechecked. Actual
listening volume and game balance still need player testing.

Audio sources and licenses are listed in **AUDIO_CREDITS.txt** and
**AUDIO_MANIFEST.json**. The Kenney license files are included.
