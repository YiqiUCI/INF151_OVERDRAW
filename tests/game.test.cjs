const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'OVERDRAW.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script, { filename: 'OVERDRAW.html' });
const rules = script.slice(0, script.indexOf('const $='));
const context = vm.createContext({});
vm.runInContext(rules + '\nthis.rules = { Game, ENEMIES, CARDS, ROUTE, rollRewardChoices };', context);
const { Game, ENEMIES, CARDS, ROUTE, rollRewardChoices } = context.rules;

function defeatEnemy(game) {
  game.enemyHP = 1;
  game.chain = ['quick'];
  game.stand();
}

function openRoute(game) {
  game.selectNode(0);
  defeatEnemy(game);
  game.reward(null);
}

function reach(game, nodes) {
  for (const node of nodes) {
    game.selectNode(node);
    if (game.phase === 'drawing') defeatEnemy(game);
    if (game.phase === 'reward') game.reward(null);
  }
}

test('the map has 16 nodes and every connection leads to a complete route', () => {
  assert.equal(ROUTE.length, 16);
  let paths = [[0]];
  for (let floor = 1; floor <= 6; floor++) {
    paths = paths.flatMap(route => Array.from(ROUTE[route.at(-1)].next, id => [...route, id]));
    for (const route of paths) assert.equal(ROUTE[route.at(-1)].floor, floor);
  }
  assert.equal(paths.length, 20);
  assert.equal(new Set(paths.flat()).size, ROUTE.length);
  assert.ok(paths.every(route => route.at(-1) === 15));
  assert.deepEqual(Array.from(ROUTE[15].next), []);
});

test('only connected nodes open and the opening fight is mandatory', () => {
  const game = new Game();
  assert.equal(game.phase, 'map');
  assert.deepEqual(Array.from(game.nextNodes()), [0]);
  game.selectNode(1);
  assert.equal(game.route.length, 0);
  game.selectNode(0);
  game.selectNode(2);
  assert.deepEqual(Array.from(game.route), [0]);
  assert.equal(ENEMIES[game.encounter].name, 'Gatekeeper');
  defeatEnemy(game);
  game.selectNode(1);
  assert.equal(game.route.length, 1);
  game.reward(null);
  assert.deepEqual(Array.from(game.nextNodes()), [1, 2]);
  game.selectNode(2);
  assert.equal(ENEMIES[game.encounter].name, 'Candle-Eye Slug');
  defeatEnemy(game);
  game.reward(null);
  assert.deepEqual(Array.from(game.nextNodes()), [4, 5]);
  game.selectNode(1);
  assert.deepEqual(Array.from(game.route), [0, 2]);
});

test('Rest restores 20% of missing HP rounded up and cannot be repeated', () => {
  for (const [before, after] of [[40,40], [38,39], [27,30], [10,16], [1,9]]) {
    const game = new Game();
    openRoute(game);
    game.hp = before;
    game.selectNode(1);
    assert.equal(game.hp, after);
    assert.equal(game.healed, after - before);
    assert.equal(game.phase, 'map');
    game.selectNode(1);
    assert.equal(game.hp, after);
    assert.deepEqual(Array.from(game.nextNodes()), [3, 4]);
  }
});

test('Card grants three choices without combat and preserves the deck and HP', () => {
  const game = new Game();
  openRoute(game);
  game.selectNode(1);
  game.hp = 23;
  game.selectNode(4);
  assert.equal(game.phase, 'reward');
  assert.equal(new Set(game.rewardChoices).size, 3);
  const card = game.rewardChoices[0];
  game.reward(card);
  assert.equal(game.phase, 'map');
  assert.equal(game.deck.at(-1), card);
  game.selectNode(7);
  assert.equal(game.phase, 'drawing');
  assert.equal(game.hp, 23);
  assert.equal(game.draw.length, 13);
  assert.ok(game.draw.includes(card));
  assert.equal(game.chain.length, 0);
  assert.equal(game.discard.length, 0);
  assert.equal(game.turn, 1);
  assert.equal(game.intent(), 6);
});

test('both Elite nodes reuse the stronger Slug and reward three cards with a low-point option', () => {
  for (const route of [[0, 1, 4, 8], [0, 1, 3, 6, 10, 13]]) {
    const game = new Game();
    reach(game, route.slice(0, -1));
    game.selectNode(route.at(-1));
    assert.equal(game.enemyHP, 38);
    assert.equal(ENEMIES[game.encounter].art, 'slug');
    assert.deepEqual(Array.from(ENEMIES[game.encounter].attacks), [7, 9, 6]);
    defeatEnemy(game);
    assert.equal(new Set(game.rewardChoices).size, 3);
    assert.ok(game.rewardChoices.some(key => CARDS[key].point <= 3));
    game.reward(null);
    assert.equal(game.phase, 'map');
  }
});

test('defeating the Priest finishes the run immediately with the chosen route', () => {
  const game = new Game();
  const route = [0, 1, 4, 7, 11, 14, 15];
  reach(game, route);
  assert.equal(ENEMIES[game.encounter].name, 'Deer-Bone Priest');
  assert.equal(ENEMIES[game.encounter].boss, true);
  assert.equal(game.phase, 'victory');
  assert.equal(game.rewardChoices.length, 0);
  assert.deepEqual(Array.from(game.route), route);
  assert.deepEqual(Array.from(game.nextNodes()), []);
  assert.equal(game.events.at(-1).action, 'victory');
  assert.equal(game.hp, 40);
});

test('the four encounters retain their repeating attack cycles and never penalize future turns for a bust', () => {
  const fights = [[0], [0,2], [0,1,4,7,11,14,15], [0,1,4,8]];
  for (const [index, route] of fights.entries()) {
    const game = new Game();
    reach(game, route.slice(0, -1));
    game.selectNode(route.at(-1));
    assert.equal(game.encounter, index);
    game.chain = ['last', 'last', 'heavy'];
    game.resolve(true);
    assert.equal(game.lastResult.damage, 0);
    assert.equal(game.lastResult.block, 0);
    assert.equal(game.hp, 40 - ENEMIES[index].attacks[0]);
    game.next();
    assert.equal(game.intent(), ENEMIES[index].attacks[1]);
  }
});

test('reward choices cannot be duplicated or submitted outside a reward screen', () => {
  const game = new Game();
  game.reward('setup');
  assert.equal(game.deck.length, 12);
  game.selectNode(0);
  defeatEnemy(game);
  assert.equal(game.lastResult.taken, 0);
  const rejected = Object.keys(CARDS).find(key => !game.rewardChoices.includes(key));
  game.reward(rejected);
  assert.equal(game.phase, 'reward');
  const selected = game.rewardChoices[0];
  game.reward(selected);
  game.reward(selected);
  assert.equal(game.deck.length, 13);
  assert.equal(game.phase, 'map');
});

test('Quiet Counter is awarded only after the opening Gatekeeper', () => {
  const game = new Game();
  openRoute(game);
  assert.equal(game.relic, true);
  game.selectNode(1);
  game.selectNode(3);
  game.chain = ['quick', 'quick', 'quick'];
  assert.equal(game.output().block, 2);
  game.chain = ['quick', 'quick'];
  assert.equal(game.output().block, 0);
  defeatEnemy(game);
  game.reward(null);
  assert.equal(game.events.filter(event => event.relicAcquired).length, 1);
});

test('defeat ends the run without a reward or a next node', () => {
  const game = new Game();
  game.selectNode(0);
  game.hp = 1;
  game.chain = ['quick'];
  game.stand();
  assert.equal(game.phase, 'defeat');
  assert.deepEqual(Array.from(game.nextNodes()), []);
  game.reward('fortify');
  assert.equal(game.deck.length, 12);
});

test('Restart clears the route and restores the repeatable opening', () => {
  const game = new Game();
  reach(game, [0, 1, 4, 7, 11, 14, 15]);
  game.restart(false);
  assert.equal(game.hp, 40);
  assert.equal(game.deck.length, 12);
  assert.equal(game.relic, false);
  assert.equal(game.phase, 'map');
  assert.equal(game.route.length, 0);
  assert.deepEqual(Array.from(game.nextNodes()), [0]);
  assert.equal(game.archive[0].status, 'victory');
  game.selectNode(0);
  assert.deepEqual(Array.from(game.draw.slice(0, 4)), ['precision', 'heavy', 'clean', 'last']);
});

test('the starting deck contains three each of points 5, 6, 7 and 8 in both modes', () => {
  const game = new Game();
  for (const random of [false, true]) {
    game.restart(random);
    assert.deepEqual(Array.from(game.deck, k => CARDS[k].point).sort((a, b) => a - b), [5,5,5,6,6,6,7,7,7,8,8,8]);
    assert.deepEqual(Array.from(game.draw).sort(), Array.from(game.deck).sort());
  }
});

test('ordinary rewards keep three distinct choices and their lower weight for low-point cards', () => {
  let lowFirst = 0;
  for (let i = 0; i < 20000; i++) {
    const choices = rollRewardChoices();
    assert.equal(new Set(choices).size, 3);
    if (CARDS[choices[0]].point < 4) lowFirst++;
  }
  assert.ok(lowFirst / 20000 > 0.19 && lowFirst / 20000 < 0.23, `low-point rate: ${lowFirst / 20000}`);
});
