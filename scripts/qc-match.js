const { spawn } = require('child_process');
const net = require('net');
const WebSocket = require('ws');

const TEST_TIMEOUT_MS = 30000;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let settled = false;
    const failTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`Server did not start on port ${port}`));
    }, 8000);
    child.stdout.on('data', data => {
      const text = data.toString();
      process.stdout.write(text);
      if (!settled && text.includes('server running')) {
        settled = true;
        clearTimeout(failTimer);
        resolve(child);
      }
    });
    child.stderr.on('data', data => process.stderr.write(data.toString()));
    child.on('exit', code => {
      if (!settled) {
        settled = true;
        clearTimeout(failTimer);
        reject(new Error(`Server exited before ready (${code})`));
      }
    });
  });
}

function openMatch(port, name = 'QC') {
  const url = `ws://localhost:${port}`;
  const ws = new WebSocket(url);
  let roomId = null;
  let playerId = null;
  let matchState = null;
  const sessionToken = `qc-${Date.now()}-${Math.random()}`;
  const send = msg => ws.send(JSON.stringify(msg));
  const close = () => {
    try { ws.close(); } catch {}
  };
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Match open timed out (${name})`)), TEST_TIMEOUT_MS);
    ws.on('open', () => send({ type: 'create_room', name, teamId: 'sun', sessionToken }));
    ws.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.type === 'connected') playerId = msg.playerId;
      if (msg.type === 'room_created') {
        roomId = msg.roomId;
        send({ type: 'add_ai', teamId: 'moon' });
        setTimeout(() => send({ type: 'start_game' }), 100);
      }
      if (msg.type === 'asset_loading_start') send({ type: 'asset_progress', progress: 100 });
      if (msg.type === 'game_start') matchState = msg.state;
      if (msg.type === 'world_state' && (msg.creeps || []).length >= 10) {
        clearTimeout(timer);
        resolve({ ws, send, close, roomId, playerId, sessionToken, state: matchState, firstWorld: msg });
      }
    });
    ws.on('error', reject);
  });
  return ready;
}

function reconnectMatch(port, roomId, sessionToken) {
  const ws = new WebSocket(`ws://localhost:${port}`);
  let playerId = null;
  const send = msg => ws.send(JSON.stringify(msg));
  const close = () => {
    try { ws.close(); } catch {}
  };
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Reconnect timed out')), TEST_TIMEOUT_MS);
    ws.on('open', () => send({ type: 'rejoin_session', roomId, sessionToken }));
    ws.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.type === 'connected') playerId = msg.playerId;
      if (msg.type === 'rejoin_failed') {
        clearTimeout(timer);
        reject(new Error('Server rejected reconnect'));
      }
      if (msg.type === 'game_start' && msg.rejoined) {
        clearTimeout(timer);
        resolve({ ws, send, close, roomId, playerId, state: msg.state });
      }
    });
    ws.on('error', reject);
  });
  return ready;
}

function waitForMessage(ws, predicate, timeoutMs = TEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for message'));
    }, timeoutMs);
    const onMessage = raw => {
      const msg = JSON.parse(raw);
      if (!predicate(msg)) return;
      cleanup();
      resolve(msg);
    };
    const onError = err => {
      cleanup();
      reject(err);
    };
    function cleanup() {
      clearTimeout(timer);
      ws.off('message', onMessage);
      ws.off('error', onError);
    }
    ws.on('message', onMessage);
    ws.on('error', onError);
  });
}

async function testBaseline(port) {
  const match = await openMatch(port, 'QC Baseline');
  const samples = [];
  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Baseline timed out')), 22000);
    match.ws.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.type !== 'world_state') return;
      const creeps = (msg.creeps || []).filter(creep => creep.hp > 0);
      const modes = creeps.reduce((acc, creep) => {
        const mode = creep.debugRoute?.mode || creep.debugMode || 'none';
        acc[mode] = (acc[mode] || 0) + 1;
        return acc;
      }, {});
      samples.push({ creeps: creeps.length, modes });
      if (samples.length >= 90) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  await done;
  match.close();
  const blockedSpikes = samples.filter(sample => (sample.modes['group-blocked'] || 0) > 2).length;
  if (blockedSpikes) throw new Error(`Baseline had ${blockedSpikes} blocked spikes`);
  return { samples: samples.length, last: samples.at(-1) };
}

async function testTowerPolygon(port) {
  const match = await openMatch(port, 'QC Tower Polygon');
  const tower = (match.firstWorld.objectives || []).find(obj => obj.id === 'sun_tower_mid');
  const requests = [];
  async function requestMove(label, footDx, footDy, expectCorrection) {
    const footX = tower.x + tower.w / 2 + footDx;
    const footY = tower.y + tower.h + footDy;
    const req = { label, expectCorrection, x: footX - 20, y: footY - 56, correction: null };
    requests.push(req);
    const correctionPromise = waitForMessage(
      match.ws,
      msg => msg.type === 'player_state' && msg.playerId === match.playerId,
      450,
    ).then(msg => {
      req.correction = { x: msg.x, y: msg.y, state: msg.state };
    }).catch(() => {});
    match.send({ type: 'player_input', x: req.x, y: req.y, vx: 1, vy: 0, onGround: true, facing: 1, state: 'run', hp: 648 });
    await correctionPromise;
    if (Boolean(req.correction) !== expectCorrection) {
      throw new Error(`${label} correction mismatch`);
    }
  }
  await requestMove('old rectangle corner', 45, 9, false);
  await requestMove('tower center', 0, 0, true);
  match.close();
  return { requests };
}

async function testRestartSpeed(port) {
  const match = await openMatch(port, 'QC Restart');
  const measures = [];
  async function measure(label) {
    let first = null;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Measure timed out: ${label}`)), 6000);
      const onMessage = raw => {
        const msg = JSON.parse(raw);
        if (msg.type !== 'world_state') return;
        const creep = (msg.creeps || []).filter(c => c.hp > 0 && c.teamId === 'sun').sort((a, b) => a.id.localeCompare(b.id))[0];
        if (!creep) return;
        if (!first) {
          first = { t: Date.now(), x: creep.x, y: creep.y };
          return;
        }
        const dt = (Date.now() - first.t) / 1000;
        if (dt < 1.2) return;
        cleanup();
        const dist = Math.hypot(creep.x - first.x, creep.y - first.y);
        const speed = dist / dt;
        measures.push({ label, speed: Number(speed.toFixed(2)) });
        resolve();
      };
      function cleanup() {
        clearTimeout(timer);
        match.ws.off('message', onMessage);
      }
      match.ws.on('message', onMessage);
    });
  }
  await measure('initial');
  match.send({ type: 'test_restart_match' });
  await waitForMessage(match.ws, msg => msg.type === 'game_start' && msg.restarted, 8000);
  await measure('restart1');
  match.send({ type: 'test_restart_match' });
  await waitForMessage(match.ws, msg => msg.type === 'game_start' && msg.restarted, 8000);
  await measure('restart2');
  match.close();
  const speeds = measures.map(item => item.speed);
  const ratio = Math.max(...speeds) / Math.min(...speeds);
  if (ratio > 1.35) throw new Error(`Restart speed ratio too high: ${ratio.toFixed(2)}`);
  return { measures, ratio: Number(ratio.toFixed(2)) };
}

async function testObjectiveChain(port) {
  const match = await openMatch(port, 'QC Objective Chain');
  const destroyed = [];
  const order = ['moon_tower_front', 'moon_tower_mid', 'moon_tower_base', 'moon_ancient'];
  let index = 0;
  function hit(id, times) {
    for (let i = 0; i < times; i++) {
      setTimeout(() => match.send({ type: 'unit_hit', unitId: id, damage: 500, skillId: 'qc', hitDir: 1 }), i * 80);
    }
  }
  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Objective chain timed out')), 16000);
    match.ws.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.type === 'objective_destroyed') {
        destroyed.push(msg.objective.id);
        index += 1;
        const next = order[index];
        if (next) hit(next, next.includes('ancient') ? 6 : 3);
      }
      if (msg.type === 'game_over') {
        clearTimeout(timer);
        resolve(msg.winner);
      }
    });
  });
  hit(order[index], 3);
  const winner = await done;
  match.close();
  if (winner !== 'sun' || !order.every(id => destroyed.includes(id))) {
    throw new Error(`Objective chain failed: winner=${winner}, destroyed=${destroyed.join(',')}`);
  }
  return { winner, destroyed };
}

async function testCreepDamage(port) {
  const match = await openMatch(port, 'QC Creep Damage');
  const target = match.firstWorld.creeps.find(creep => creep.teamId === 'moon' && creep.hp > 0);
  let hitConfirm = null;
  const deathPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Creep death timed out')), 8000);
    match.ws.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.type === 'unit_hit_confirmed') hitConfirm = msg;
      if (msg.type === 'unit_death') {
        clearTimeout(timer);
        resolve(msg);
      }
    });
  });
  match.send({ type: 'unit_hit', unitId: target.id, damage: 20, skillId: 'qc-small', hitDir: 1 });
  setTimeout(() => match.send({ type: 'unit_hit', unitId: target.id, damage: 500, skillId: 'qc-kill', hitDir: 1 }), 250);
  const death = await deathPromise;
  match.close();
  if (!hitConfirm || death.unit?.id !== target.id) throw new Error('Creep damage/death event failed');
  return { targetId: target.id, hitHp: hitConfirm.hp, deathDamage: death.damage };
}

async function testTowerShootsHero(port) {
  const match = await openMatch(port, 'QC Tower Hero');
  const tower = match.firstWorld.objectives.find(obj => obj.id === 'moon_tower_front');
  const footX = tower.x + tower.w / 2 - 120;
  const footY = tower.y + tower.h + 38;
  match.send({ type: 'player_input', x: footX - 20, y: footY - 56, vx: 0, vy: 0, onGround: true, facing: 1, state: 'idle', hp: 648 });
  const shot = await waitForMessage(match.ws, msg => msg.type === 'tower_shot' && msg.targetId === match.playerId, 8000);
  match.close();
  return { towerId: shot.towerId, targetId: shot.targetId };
}

async function testAiHeroRespawnAndActions(port) {
  const match = await openMatch(port, 'QC AI Hero');
  const ai = (match.state?.players || []).find(player => player.isAI && player.teamId === 'moon');
  if (!ai) throw new Error('AI hero missing from match state');

  const castPromise = waitForMessage(match.ws, msg => msg.type === 'skill_cast' && msg.playerId === ai.id, 8000);
  match.send({
    type: 'player_input',
    x: ai.x - 54,
    y: ai.y,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    state: 'idle',
    hp: 648,
  });
  const cast = await castPromise;

  match.send({ type: 'player_hit', targetId: ai.id, damage: 500, skillId: 'qc-ai-kill-1', hitDir: 1 });
  setTimeout(() => match.send({ type: 'player_hit', targetId: ai.id, damage: 500, skillId: 'qc-ai-kill-2', hitDir: 1 }), 80);
  const death = await waitForMessage(match.ws, msg => msg.type === 'player_hit' && msg.targetId === ai.id && msg.hp <= 0, 5000);
  const respawn = await waitForMessage(match.ws, msg => msg.type === 'player_respawn' && msg.playerId === ai.id && msg.hp > 0, 14000);
  match.close();
  return { aiId: ai.id, firstSkill: cast.skillId, deathHp: death.hp, respawnHp: respawn.hp };
}

async function testReconnect(port) {
  const match = await openMatch(port, 'QC Reconnect');
  const { roomId, sessionToken, playerId } = match;
  match.close();
  const rejoined = await reconnectMatch(port, roomId, sessionToken);
  const world = await waitForMessage(rejoined.ws, msg => msg.type === 'world_state' && (msg.creeps || []).length >= 10, 8000);
  rejoined.close();
  return {
    roomId,
    playerId,
    rejoinedPlayerId: rejoined.playerId,
    creeps: (world.creeps || []).length,
  };
}

async function run() {
  const port = await getFreePort();
  const server = await startServer(port);
  const tests = [
    ['baseline movement', testBaseline],
    ['tower polygon collision', testTowerPolygon],
    ['restart speed', testRestartSpeed],
    ['objective chain', testObjectiveChain],
    ['creep damage/death', testCreepDamage],
    ['tower shoots hero', testTowerShootsHero],
    ['ai hero respawn/actions', testAiHeroRespawnAndActions],
    ['reconnect match', testReconnect],
  ];
  const results = [];
  try {
    for (const [name, fn] of tests) {
      const startedAt = Date.now();
      const details = await fn(port);
      results.push({ name, ok: true, ms: Date.now() - startedAt, details });
      console.log(`[qc] PASS ${name}`);
    }
    console.log(JSON.stringify({ ok: true, results }, null, 2));
  } finally {
    server.kill();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
