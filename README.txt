OVERDRAW - Atmosphere Playtest (v1.3)

CHANGES IN v1.3
The next-draw bust risk hint and risk percentages in the draw log have been removed.
The resource bar now shows Point, damage and Block. Audio and animations are unchanged.

HOW TO PLAY
Extract the ZIP and double-click prototype.html in your browser.
Everything is embedded in that HTML file, including music and sound effects.
It can be played offline without a local server.

HIT / H: Draw a card from the pile on the left. The card flies into your chain
and flips face up, with a slide sound and a quiet landing sound.
STAND / S: Send your current chain toward the enemy. A card movement sound
plays first, then the sword attack and any enemy retaliation.
NEXT TURN / N: Discard the resolved chain and reveal the next enemy intent.

The short animation locks combat inputs so repeated clicks or keypresses
cannot create duplicate draws or turns. Restart cancels unfinished flights.
Fully blocked attacks do not flash red. Defeated enemies cannot retaliate.

AUDIO CONTROLS
SFX: On / Off controls all card and combat sound effects.
Music: On / Off controls the looping Dark Shrine Loop background track.
Music volume is below the action buttons. The default is a quiet 18%; the
slider ranges from 0% to 50%. Preferences are saved locally when available.
Browser autoplay rules require the first click or H/S/N keypress before
music can begin. Music pauses while the page is hidden.

The music is a free CC0 mysterious shrine/cult themed loop. Cult of the Lamb
is a mood reference supplied by the team; its soundtrack is not included.
Existing project artwork is retained. Monster breathing uses a small movement
of the existing masked image, not a new sprite animation.
System reduced-motion preferences skip card flights and monster breathing.

LICENSES AND SOURCES
All added music and sound effects come from sources marked CC0.
AUDIO_CREDITS.txt lists authors, source pages and original filenames.
AUDIO_MANIFEST.json records the embedded audio files and their SHA-256 hashes.
Original Kenney license notices are included in this folder.

VERIFICATION
JavaScript syntax check passed. 23 logic checks passed, including comparison
with the original game's card/HP/turn rules, animation sequencing, repeated
input, busts, block, kills, rewards, restart, mute and music preferences.
Audio Ogg containers and the ZIP archive were checked for integrity.
Browser rendering and actual sound playback have not been verified in this
environment. Check the animation speed and listening volume on your machine.

---------------------------------------------------------------------

OVERDRAW - 氛围试玩版 v1.3

已移除下次抽牌爆点风险提示和抽牌日志中的风险百分比。
数值栏保留 Point、伤害与格挡；音效、音乐和动画保持原样。

解压后双击 prototype.html 即可离线游玩。
H 抽牌：卡牌从左侧牌库飞进手牌并翻面，配抽牌和落牌声。
S 结算：整条手牌飞向怪物，再播放挥砍和敌人反击反馈。
N 下一回合。动画期间会暂时锁住操作，避免重复抽牌。

SFX 控制音效，Music 控制背景音乐，下方滑杆调整音乐音量。
第一次点击或按 H/S/N 后音乐开始；切到别的标签页时音乐暂停。
新增音乐与音效均选用标为 CC0 的免费素材，来源见 AUDIO_CREDITS.txt。
咩咩启示录只是氛围参考，本版本没有使用它的原声。

原有卡牌、血量和战斗规则保持原样。23 项逻辑检查已通过；
实际画面和听感尚未完成浏览器实测。
