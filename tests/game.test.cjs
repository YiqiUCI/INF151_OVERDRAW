const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'prototype.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const rules = script.slice(0, script.indexOf('const $='));
const context = vm.createContext({});
vm.runInContext(rules + '\nthis.rules = { Game, ENEMIES, CARDS };', context);
const { Game, ENEMIES } = context.rules;

function defeatEnemy(game) {
  game.enemyHP = 1;
  game.chain = ['quick'];
  game.stand();
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
  assert.deepEqual(Array.from(game.draw.slice(0, 4)), ['brace', 'heavy', 'precision', 'heavy']);
  assert.equal(game.archive[0].status, 'victory');
});
