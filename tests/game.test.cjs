const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'OVERDRAW.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const rules = script.slice(0, script.indexOf('const $='));
const context = vm.createContext({});
vm.runInContext(rules + '\nthis.rules = { Game, ENEMIES, CARDS, rollRewardChoices };', context);
const { Game, ENEMIES, CARDS, rollRewardChoices } = context.rules;

function defeatEnemy(game) {
  game.enemyHP = 1;
  game.chain = ['quick'];
  game.stand();
  game.rewardChoices = ['setup', 'fortify', 'clean'];
}

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
  assert.deepEqual(Array.from(game.draw.slice(0, 4)), ['precision', 'heavy', 'clean', 'last']);
  assert.equal(game.archive[0].status, 'victory');
});


test('starting deck contains three each of points 5, 6, 7 and 8 in both modes', () => {
  const game = new Game();
  for (const random of [false, true]) {
    game.restart(random);
    assert.deepEqual(Array.from(game.deck, k => CARDS[k].point).sort((a, b) => a - b), [5,5,5,6,6,6,7,7,7,8,8,8]);
    assert.deepEqual(Array.from(game.draw).sort(), Array.from(game.deck).sort());
  }
});

test('rewards offer three unique cards with lower weight for cards under 4 points', () => {
  let lowFirst = 0;
  for (let i = 0; i < 20000; i++) {
    const choices = rollRewardChoices();
    assert.equal(new Set(choices).size, 3);
    if (CARDS[choices[0]].point < 4) lowFirst++;
  }
  assert.ok(lowFirst / 20000 > 0.19 && lowFirst / 20000 < 0.23, `low-point rate: ${lowFirst / 20000}`);
  const game = new Game();
  game.enemyHP = 1;
  game.chain = ['precision'];
  game.stand();
  assert.equal(game.phase, 'reward');
  const rejected = Object.keys(CARDS).find(key => !game.rewardChoices.includes(key));
  game.reward(rejected);
  assert.equal(game.phase, 'reward');
  game.reward(game.rewardChoices[0]);
  assert.equal(game.phase, 'drawing');
});
