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
    if (['reward', 'chest'].includes(game.phase)) game.reward(null);
    if (game.phase === 'rest') game.heal();
    if (['rest', 'shop'].includes(game.phase)) game.leaveNode();
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
    assert.equal(game.phase, 'rest');
    assert.equal(game.hp, before);
    assert.equal(game.restAmount(), after - before);
    if (before < 40) {
      game.leaveNode();
      assert.equal(game.phase, 'rest');
    }
    game.heal();
    game.heal();
    assert.equal(game.hp, after);
    assert.equal(game.healed, before === 40 ? null : after - before);
    game.leaveNode();
    assert.equal(game.phase, 'map');
    game.selectNode(1);
    assert.equal(game.hp, after);
    assert.deepEqual(Array.from(game.nextNodes()), [3, 4]);
  }
});

test('Chest grants three choices without combat and preserves the deck, HP, and coins', () => {
  const game = new Game();
  reach(game, [0, 1]);
  game.hp = 23;
  game.selectNode(4);
  assert.equal(game.phase, 'chest');
  assert.equal(new Set(game.rewardChoices).size, 3);
  const card = game.rewardChoices[0];
  game.reward(card);
  assert.equal(game.phase, 'map');
  assert.equal(game.deck.at(-1), card);
  assert.equal(game.coins, 5);
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
  assert.equal(game.coins, 10);
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
  reach(game, [1]);
  game.selectNode(3);
  assert.equal(game.phase, 'drawing');
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
  assert.equal(game.coins, 0);
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
  assert.equal(game.coins, 0);
  assert.equal(game.shopStock.length, 0);
  assert.equal(game.shopRemoved, false);
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

test('victories pay coins immediately and skipping a card does not change the balance', () => {
  const game = new Game();
  assert.equal(game.coins, 0);
  game.selectNode(0);
  defeatEnemy(game);
  assert.equal(game.coins, 5);
  game.stand();
  game.reward(null);
  assert.equal(game.coins, 5);
  reach(game, [2, 4]);
  assert.equal(game.coins, 10);
  game.selectNode(8);
  defeatEnemy(game);
  assert.equal(game.coins, 20);
  game.reward(game.rewardChoices[0]);
  assert.equal(game.coins, 20);
});

test('Shop has five unique cards and charges only for valid purchases and one removal', () => {
  const game = new Game();
  reach(game, [0, 2, 5, 8]);
  assert.equal(game.coins, 25);
  game.selectNode(12);
  assert.equal(game.phase, 'shop');
  const stock = game.shopStock;
  assert.equal(new Set(stock.map(item => item.card)).size, 5);
  assert.deepEqual(Array.from(stock, item => item.price), [5, 5, 5, 8, 8]);
  assert.ok(stock.every(item => item.price === (CARDS[item.card].point < 4 ? 8 : 5)));

  game.removeCard('quick');
  assert.equal(game.coins, 25);
  const originalCopies = game.deck.filter(card => card === 'precision').length;
  game.removeCard('precision');
  game.removeCard('precision');
  assert.equal(game.coins, 15);
  assert.equal(game.deck.filter(card => card === 'precision').length, originalCopies - 1);

  game.buyCard(stock[3].card);
  game.buyCard(stock[3].card);
  game.buyCard(stock[4].card);
  game.buyCard(stock[0].card);
  assert.equal(game.coins, 2);
  assert.equal(game.deck.length, 13);
  assert.deepEqual(Array.from(stock, item => item.sold), [true, false, false, true, false]);
  game.leaveNode();
  assert.deepEqual(Array.from(game.nextNodes()), [14]);
  game.selectNode(14);
  assert.equal(game.phase, 'chest');
  game.reward(null);
  assert.equal(game.coins, 2);
  assert.deepEqual(Array.from(game.nextNodes()), [15]);
});

test('fresh maps vary nodes and connections while every node stays reachable without crossed paths', () => {
  const layouts = new Set(), connections = new Set();
  const template = JSON.stringify(ROUTE);
  for (let run = 0; run < 1000; run++) {
    const game = new Game();
    game.restart(true);
    const map = game.map;
    assert.equal(map.length, 16);
    assert.equal(map[0].type, 'start');
    assert.equal(map[0].enemy, 0);
    assert.equal(map[15].type, 'boss');
    assert.equal(map[15].enemy, 2);
    const reachable = new Set([0]);
    for (let floor = 0; floor <= 6; floor++) {
      const row = map.filter(node => node.floor === floor);
      assert.deepEqual(Array.from(row, node => node.type).sort(),
        Array.from(ROUTE.filter(node => node.floor === floor), node => node.type).sort());
      for (const node of row) {
        if (floor === 6) { assert.equal(node.next.length, 0); continue; }
        assert.ok(node.next.length >= 1 && node.next.length <= 2);
        assert.equal(new Set(node.next).size, node.next.length);
        for (const to of node.next) {
          assert.equal(map[to].floor, floor + 1);
          if (reachable.has(map.indexOf(node))) reachable.add(to);
          for (const other of row) for (const otherTo of other.next) {
            assert.ok((node.x - other.x) * (map[to].x - map[otherTo].x) >= 0);
          }
        }
      }
    }
    assert.equal(reachable.size, 16);
    layouts.add(JSON.stringify(map.map(node => [node.type, node.enemy])));
    connections.add(JSON.stringify(map.map(node => node.next)));
    const initialMap = JSON.stringify(map);
    openRoute(game);
    assert.equal(JSON.stringify(game.map), initialMap);
    const next = game.nextNodes()[0];
    game.selectNode(next);
    assert.equal(game.phase, NODE_PHASE(game.map[next].type));
    const exported = game.export().runs.at(-1);
    assert.equal(JSON.stringify(exported.map), initialMap);
    game.restart(true);
    assert.equal(JSON.stringify(game.archive.at(-1).map), initialMap);
  }
  assert.ok(layouts.size > 100);
  assert.ok(connections.size > 20);
  assert.equal(JSON.stringify(ROUTE), template);
  function NODE_PHASE(type) { return ['rest', 'shop', 'chest'].includes(type) ? type : 'drawing'; }
});

test('deck views preserve every copy and exclude current chain and discards from remaining cards', () => {
  const game = new Game();
  game.selectNode(0);
  const order = Array.from(game.draw);
  assert.equal(game.viewCards().length, 12);
  assert.equal(game.viewCards(true).filter(key => key === 'precision').length, 3);
  assert.deepEqual(Array.from(game.draw), order);
  game.hit();
  assert.equal(game.viewCards().length, 11);
  assert.equal(game.viewCards().filter(key => key === 'precision').length, 2);
  assert.equal(game.viewCards(true).filter(key => key === 'precision').length, 3);
  game.stand();
  game.next();
  assert.equal(game.discard.length, 1);
  game.hit();
  assert.equal(game.viewCards().length, 10);
  assert.equal(game.viewCards().filter(key => key === 'heavy').length, 2);
  assert.equal(game.viewCards(true).length, 12);
  assert.equal(game.viewCards().length + game.chain.length + game.discard.length, game.deck.length);

  game.draw = [];
  game.discard = ['quick', 'brace'];
  assert.equal(game.viewCards().length, 0);
  game.hit();
  assert.equal(game.viewCards().length, 1);
  assert.equal(game.discard.length, 0);
  const points = Array.from(game.viewCards(true), key => CARDS[key].point);
  assert.deepEqual(points, [...points].sort((a, b) => a - b));
});
