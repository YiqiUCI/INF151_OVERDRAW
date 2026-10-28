const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'OVERDRAW.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // Parse all UI/audio code as well as the extracted rules.
const rules = script.slice(0, script.indexOf('const $='));
const context = vm.createContext({});
vm.runInContext(rules + '\nthis.rules = { Game, ENEMIES, CARDS };', context);
const { Game, ENEMIES, CARDS } = context.rules;

function defeatEnemy(game) {
  game.enemyHP = 1;
  game.chain = ['quick'];
  game.stand();
}

test('all twelve starter cards cost at least 5 Point without changing the deck composition', () => {
  for (const random of [false, true]) {
    const game = new Game();
    game.restart(random);
    assert.equal(game.deck.length, 12);
    assert.ok(game.draw.every(key => CARDS[key].point >= 5));
    for (const key of ['quick', 'brace', 'follow', 'heavy', 'precision', 'last']) {
      assert.equal(game.deck.filter(card => card === key).length, 2);
    }
    assert.deepEqual(Array.from(['quick', 'brace', 'follow', 'heavy', 'precision', 'last'], key => CARDS[key].point), [5, 5, 5, 7, 5, 8]);
  }
  assert.deepEqual(Array.from(['setup', 'fortify', 'clean'], key => CARDS[key].point), [1, 3, 6]);
});

test('four consecutive starter draws now bust in more than 80 percent of possible hands', () => {
  const points = new Game().deck.map(key => CARDS[key].point);
  let hands = 0, busts = 0;
  for (let a = 0; a < 9; a++) for (let b = a + 1; b < 10; b++)
    for (let c = b + 1; c < 11; c++) for (let d = c + 1; d < 12; d++) {
      hands++;
      if (points[a] + points[b] + points[c] + points[d] > 21) busts++;
    }
  assert.ok(busts / hands > .8, `Four-draw Bust rate: ${busts}/${hands}`);
});

test('card damage keeps every original attack number and replaces the value field and labels', () => {
  assert.deepEqual(Array.from(['quick', 'brace', 'follow', 'heavy', 'precision', 'last', 'setup', 'fortify', 'clean'], key => CARDS[key].damage), [3, 2, 5, 10, 6, 12, 1, 2, 8]);
  assert.ok(Object.values(CARDS).every(card => !Object.hasOwn(card, 'value')));
  assert.ok(!/\bVALUE\b|<th>Value<\/th>|<b>Value<\/b>|（Value）|Value is base damage/.test(html));
  assert.ok(html.includes("'DAMAGE'"));
  assert.ok(html.includes('<th>Damage</th>'));
  assert.ok(html.includes('（Damage）'));
  assert.ok(html.includes('value="18"'), 'Music slider values remain valid');
});

test('the same repeatable cards now reach 17 Point and a fourth draw busts at 24', () => {
  const stand = new Game();
  for (let i = 0; i < 3; i++) stand.hit();
  assert.equal(stand.points(), 17);
  assert.equal(stand.output().damage, 18);
  assert.equal(stand.output().block, 4);
  stand.stand();
  assert.equal(stand.enemyHP, 6);
  assert.equal(stand.hp, 39);
  const bust = new Game();
  for (let i = 0; i < 4; i++) bust.hit();
  assert.equal(bust.points(), 24);
  assert.equal(bust.phase, 'resolved');
  assert.equal(bust.output().damage, 0);
  assert.equal(bust.output().block, 0);
  assert.equal(bust.enemyHP, 24);
  assert.equal(bust.hp, 35);
});

test('hand and reward card markup displays the actual damage in both languages', () => {
  const markup = script.match(/^function cardHTML\([^\n]+/m)[0];
  const ui = vm.createContext({
    CARDS, game: new Game(), currentLanguage: 'en',
    CARD_ART: Object.fromEntries(Object.keys(CARDS).map(key => [key, `art:${key}`])),
    cardName: key => CARDS[key].name,
    cardEffect: key => CARDS[key].effect
  });
  vm.runInContext(markup, ui);
  for (const reward of [false, true]) {
    const en = vm.runInContext(`cardHTML('quick', 0, ${reward})`, ui);
    assert.ok(en.includes('<b>3</b> DAMAGE'));
    assert.ok(en.includes('<strong>5</strong> POINT'));
    assert.ok(!en.includes('VALUE'));
    ui.currentLanguage = 'zh';
    assert.ok(vm.runInContext(`cardHTML('quick', 0, ${reward})`, ui).includes('<b>3</b> 伤害值'));
    ui.currentLanguage = 'en';
  }
});

test('the run has Gatekeeper, Candle-Eye Slug, then Deer-Bone Priest as Boss', () => {
  assert.deepEqual(Array.from(ENEMIES, enemy => enemy.name), [
    'Gatekeeper', 'Candle-Eye Slug', 'Deer-Bone Priest'
  ]);
  assert.equal(ENEMIES[2].boss, true);
  assert.equal(ENEMIES[0].boss, false);
  assert.equal(ENEMIES[1].boss, false);
});

test('every encounter offers a reward, including the final Boss', () => {
  const game = new Game();
  for (let index = 0; index < 3; index++) {
    assert.equal(game.encounter, index);
    defeatEnemy(game);
    assert.equal(game.phase, 'reward', 'each defeated enemy must offer a reward');
    game.reward('fortify');
    assert.equal(game.deck.length, 13 + index);
    assert.equal(game.phase, index === 2 ? 'victory' : 'drawing');
  }
  assert.equal(game.events.filter(event => event.action === 'reward').length, 3);
});

test('Skip works after all three encounters and finishes the final reward', () => {
  const game = new Game();
  for (let index = 0; index < 3; index++) {
    defeatEnemy(game);
    game.reward(null);
    assert.equal(game.deck.length, 12);
    assert.equal(game.phase, index === 2 ? 'victory' : 'drawing');
  }
  assert.equal(game.encounter, 2);
  assert.equal(game.events.filter(event => event.action === 'skip').length, 3);
});

test('remaining HP and earned cards carry into both later encounters', () => {
  const game = new Game();
  game.hp = 23;
  defeatEnemy(game);
  game.reward('fortify');
  assert.equal(game.hp, 23);
  assert.equal(game.enemyHP, ENEMIES[1].hp);
  assert.equal(game.draw.length, 13);
  assert.equal(game.relic, true);
  defeatEnemy(game);
  game.reward('clean');
  assert.equal(game.encounter, 2);
  assert.equal(game.hp, 23);
  assert.equal(game.enemyHP, ENEMIES[2].hp);
  assert.equal(game.draw.length, 14);
  assert.equal(game.chain.length, 0);
  assert.equal(game.discard.length, 0);
  assert.equal(game.turn, 1);
  assert.equal(game.intent(), ENEMIES[2].attacks[0]);
});

test('all three enemies use the original attack cycle without a Boss bust penalty', () => {
  for (let index = 0; index < 3; index++) {
    const game = new Game();
    game.encounter = index;
    game.enemyHP = ENEMIES[index].hp;
    game.displayedAttack = game.baseIntent();
    game.chain = ['last', 'last', 'heavy'];
    game.resolve(true);
    assert.equal(game.lastResult.damage, 0);
    assert.equal(game.lastResult.block, 0);
    assert.equal(game.hp, 40 - ENEMIES[index].attacks[0]);
    game.next();
    assert.equal(game.intent(), ENEMIES[index].attacks[1]);
  }
});

test('a defeated enemy never retaliates in any encounter', () => {
  for (let index = 0; index < ENEMIES.length; index++) {
    const game = new Game();
    game.encounter = index;
    game.displayedAttack = game.baseIntent();
    defeatEnemy(game);
    assert.equal(game.hp, 40);
    assert.equal(game.lastResult.taken, 0);
    assert.equal(game.enemyHP, 0);
  }
});

test('reward choices cannot be duplicated or submitted outside the reward screen', () => {
  const game = new Game();
  game.reward('setup');
  assert.equal(game.encounter, 0);
  assert.equal(game.deck.length, 12);
  defeatEnemy(game);
  game.reward('unknown');
  assert.equal(game.phase, 'reward');
  game.reward('setup');
  game.reward('setup');
  assert.equal(game.encounter, 1);
  assert.equal(game.deck.length, 13);
  defeatEnemy(game);
  game.reward(null);
  defeatEnemy(game);
  game.reward('clean');
  game.reward('clean');
  assert.equal(game.encounter, 2);
  assert.equal(game.deck.length, 14);
  assert.equal(game.phase, 'victory');
});

test('Quiet Counter is awarded once and keeps its original three-card Block bonus', () => {
  const game = new Game();
  defeatEnemy(game);
  game.reward(null);
  assert.equal(game.relic, true);
  game.chain = ['quick', 'quick', 'quick'];
  assert.equal(game.output().block, 2);
  game.chain = ['quick', 'quick'];
  assert.equal(game.output().block, 0);
});

test('player defeat ends the run without a reward', () => {
  const game = new Game();
  game.hp = 1;
  game.chain = ['quick'];
  game.stand();
  assert.equal(game.phase, 'defeat');
  game.reward('fortify');
  assert.equal(game.deck.length, 12);
  assert.equal(game.encounter, 0);
});

test('Restart resets a completed run to the original repeatable opening', () => {
  const game = new Game();
  for (let index = 0; index < 3; index++) {
    defeatEnemy(game);
    game.reward('setup');
  }
  game.restart(false);
  assert.equal(game.encounter, 0);
  assert.equal(game.enemyHP, ENEMIES[0].hp);
  assert.equal(game.hp, 40);
  assert.equal(game.deck.length, 12);
  assert.equal(game.relic, false);
  assert.equal(game.phase, 'drawing');
  assert.deepEqual(Array.from(game.draw.slice(0, 4)), ['brace', 'heavy', 'precision', 'heavy']);
  assert.equal(game.archive[0].status, 'victory');
});
