# OVERDRAW — INF151 Group Project

A deckbuilding combat prototype built around the risk of going over 21.

Download the project and open **prototype.html** in a browser. The game,
artwork, music, and sound effects are embedded in this file, so it works
offline without installing dependencies or starting a server.

## Three-encounter build (v1.4)

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

The tests cover encounter order, all three reward screens, final victory,
HP and deck carryover, attack cycles, busts, defeated-enemy retaliation,
duplicate reward prevention, Quiet Counter, defeat, and restart.

The three-encounter flow was also exercised in headless Microsoft Edge.
Desktop (1440 × 1100) and mobile (390 × 844) layouts were checked. Actual
listening volume and game balance still need player testing.

Audio sources and licenses are listed in **AUDIO_CREDITS.txt** and
**AUDIO_MANIFEST.json**. The Kenney license files are included.
