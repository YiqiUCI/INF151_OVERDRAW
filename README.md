# OVERDRAW — INF151 Group Project

A deckbuilding combat prototype built around the risk of going over 21.

Download the project and open **OVERDRAW.html** in a browser. The game,
artwork, music, and sound effects are embedded in this file, so it works
offline without installing dependencies or starting a server.

## Route map

Select **Start Game**, then **Start** on the map to fight Gatekeeper. After
the fight, choose a highlighted node connected to the last one you visited.
Your HP, deck, coins, and Quiet Counter relic carry forward. Use **View deck** on
the map or the draw pile during combat to inspect your cards.

| Node | What happens |
| --- | --- |
| Start | Fight Gatekeeper. Earn 5 coins and get Quiet Counter after resolving the first card reward. |
| Fight | Fight a fixed Gatekeeper or Candle-Eye Slug. Win 5 coins and choose one of three cards or skip. |
| Chest | Choose one of three cards or skip, without fighting. |
| Shop | Buy one or more of five cards for 5 or 8 coins, or pay 10 coins to remove one card once per shop. |
| Rest | Select Heal once to restore 20% of missing HP, rounded up. Maximum HP is 40. |
| Elite | Fight a stronger Slug with 38 HP and attacks of 7, 9, and 6. Win 10 coins. At least one of the three reward cards has 1–3 Point. You can skip. |
| Boss | Defeat the Deer-Bone Priest to finish the run and see the route you took. |

The starting deck has three each of the 5, 6, 7, and 8 Point cards. Regular
reward draws give cards below 4 Point one-third the weight of other cards.

Enemies use the existing combat rules, breathing movement, attack and
damage feedback, card animations, sound effects, and background music.
The Slug and Priest portraits are in **assets/monsters/** and embedded in
the game. Their portraits appear behind the tabletop during combat.

## Controls

- **H / HIT:** draw a card.
- **S / STAND:** resolve your chain.
- **N / NEXT TURN:** discard the resolved chain and start the next turn.
- **Draw pile:** click the left-hand pile to inspect the current deck.
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

The tests cover map connections and reachability, combat and reward rules,
HP and deck carryover, Chest, Rest, Shop, coins, Elite rewards, defeat, victory, and restart.

The map was also checked in Microsoft Edge at desktop (1440 × 960) and
mobile (390 × 844) sizes, including a complete desktop run through an Elite.

Audio sources and licenses are listed in **AUDIO_CREDITS.txt** and
**AUDIO_MANIFEST.json**. The Kenney license files are included.
