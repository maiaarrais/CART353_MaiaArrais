const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

async function game({ missing = [], reducedMotion = false } = {}) {
  const draws = [], elements = new Map();
  const context = new Proxy({
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: text => ({ width: String(text).length * 7 }),
    drawImage: (image, ...args) => {
      assert(image.width > 0, 'drawing a loaded image or fallback');
      assert(args.every(Number.isFinite), 'finite drawing coordinates');
      draws.push(args);
    }
  }, { get: (target, key) => target[key] || (() => {}) });
  const element = () => ({
    width: 1000, height: 542, clientWidth: 1000, clientHeight: 542,
    offsetWidth: 1000, offsetHeight: 542, clientLeft: 0, clientTop: 0,
    dataset: {}, style: { setProperty() {} }, value: 0, textContent: '', innerHTML: '',
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {}, scrollIntoView() {},
    children: [], prepend() {}, appendChild() {}, remove() {}, querySelectorAll: () => [], getContext: () => context,
    getBoundingClientRect: () => ({ x: 0, y: 0, left: 0, top: 0, width: 1000, height: 542 })
  });
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  class Image {
    width = 2048; height = 2048; naturalWidth = 2048; complete = true;
    set src(value) { queueMicrotask(() => missing.some(name => value.endsWith(name)) ? this.onerror() : this.onload()); }
  }
  const sandbox = {
    console: { warn() {}, log() {} }, Image,
    document: { getElementById: get, querySelector: get, querySelectorAll: () => [], createElement: element, addEventListener() {} },
    window: { devicePixelRatio: 1, matchMedia: () => ({ matches: reducedMotion }), addEventListener() {}, scrollTo() {} },
    localStorage: { getItem: () => null, setItem() {} },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {}, setTimeout: () => 1,
    performance: { now: () => 0 }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const run = code => vm.runInContext(code, sandbox);
  await run('assetsReady');
  await run('startDay()');
  return { run, draws, elements };
}

const step = `updateTeamMotion(0.05); updateStaff(0.05);`;

test('missing portraits get drawable fallbacks and do not block the day', async () => {
  const { run } = await game({ missing: ['student.png', 'student-back.png', 'Barista1.png', 'barista2.png', 'Manager.png'] });
  assert.equal(run('running'), true);
  assert.equal(run('failedAssets.length'), 0);
  assert.equal(run('sceneAssets.student.fallback'), true);
  assert.equal(run('sceneAssets.baristaKai.fallback'), true);
  run('drawCafe(); drawShopBaristas();');
});

test('missing essential room art blocks opening with a useful message', async () => {
  const { run, elements } = await game({ missing: ['scene.png'] });
  assert.equal(run('running'), false);
  assert.match(elements.get('message').textContent, /scene.png/);
});

test('named staff identities survive old saves and hiring previews follow the next employee', async () => {
  const { run, elements } = await game();
  assert.equal(run('staffSprite({name:"Juno"})'), 'barista');
  assert.equal(run('staffSprite({name:"Rue"})'), 'barista2');
  assert.equal(run('staffSprite({name:"Kai"})'), 'baristaKai');
  run('updateSetup()');
  assert.equal(elements.get('shopBaristaName').textContent, 'Hire Rue');
  run('hireStaff()');
  assert.equal(elements.get('shopBaristaName').textContent, 'Hire Kai');
  run('hireStaff()');
  assert.equal(elements.get('shopBaristaName').textContent, 'Team complete');
});

test('staff reserve orders, walk before taking them, and route around furniture', async () => {
  const { run } = await game();
  run(`staff = [{name:'Juno',speed:1,energy:100,rest:0,cd:0,role:'floor'}, {name:'Rue',speed:1,energy:100,rest:0,cd:0,role:'floor'}];
    seatCustomer('student',{name:'Guest',drink:'tea'},0,{state:'waiting'});
    updateStaff(0.05);`);
  assert.equal(run('tickets.length'), 0, 'ordering waits until arrival');
  assert.equal(run('staff.filter(m=>m.job?.kind === "order").length'), 1, 'one claim per guest');
  run(`for(let frame=0; frame<350 && !tickets.length; frame++){ ${step} }`);
  assert.equal(run('tickets.length'), 1);
  assert.equal(run('staff[0].scene.arrived'), true);
  assert.equal(run(`staffWalkPath({x:890,y:340},tableServicePoint(0)).every(p =>
    !tablePositions.slice(0,cafe.tables).map(tableFootprint).some(b=>p.x>b.left && p.x<b.right && p.y>b.top && p.y<b.bottom))`), true);
});

test('drinks travel with staff; interruptions return them to the counter', async () => {
  const { run } = await game();
  run(`staff[0].cd=0;
    seatCustomer('regular',{name:'Guest',drink:'tea'},0,{state:'waiting'});
    tickets=[{id:customers[0].id,drink:'tea',state:'ready',price:5}];
    updateStaff(0.05);
    for(let frame=0; frame<300 && tickets[0]?.state!=='staff-carried'; frame++){ ${step} }`);
  assert.equal(run('tickets[0].state'), 'staff-carried');
  assert.equal(run('customers[0].state'), 'waiting', 'collection does not serve remotely');
  assert.equal(run('nextServiceTicket("ready")'), undefined, 'manager cannot pick up staff drinks');
  run('staff[0].energy=90; restStaff(0)');
  assert.equal(run('tickets[0].state'), 'ready');
  assert.equal(run('staff[0].job'), null);
});

test('delivery follows a moved guest and serves exactly once', async () => {
  const { run } = await game();
  run(`staff[0].cd=0;
    seatCustomer('regular',{name:'Guest',drink:'tea'},0,{state:'waiting'});
    tickets=[{id:customers[0].id,drink:'tea',state:'ready',price:5}];
    updateStaff(0.05);
    for(let frame=0; frame<300 && tickets[0]?.state!=='staff-carried'; frame++){ ${step} }
    movePartyTo(customers[0].id,1);
    for(let frame=0; frame<500 && tickets.length; frame++){ ${step} }`);
  assert.equal(run('customers[0].state'), 'drinking');
  assert.equal(run('customers[0].drinksServed'), 1);
  assert.equal(run('tickets.length'), 0);
  run(`for(let frame=0; frame<80; frame++){ ${step} }`);
  assert.equal(run('customers[0].drinksServed'), 1);
});

test('repair work waits for arrival; zero time freezes motion', async () => {
  const { run } = await game();
  run(`staff[0].scene={x:900,y:500,moving:false,arrived:true,facing:1};
    problems=[{id:99,kind:'spill',table:0}]; handleProblem(99,true);
    updateTeamMotion(0.05); updateOperations(0.05);`);
  assert.equal(run('staff[0].assignment.time'), 7);
  const before = run('JSON.stringify(staff[0].scene)');
  run('updateTeamMotion(0); updateStaff(0);');
  assert.equal(run('JSON.stringify(staff[0].scene)'), before);
  run('for(let frame=0; frame<500 && staff[0].assignment; frame++){updateTeamMotion(0.05);updateOperations(0.05);}');
  assert.equal(run('problems.some(p=>p.id===99)'), false);
});

test('seated animation and selection use the same pose, with reduced motion respected', async () => {
  const { run } = await game();
  run(`seatCustomer('social',{name:'Guest',drink:'latte'},0,{state:'drinking',timer:6});
    customers[0].x=customers[0].targetX; customers[0].y=customers[0].targetY;`);
  const pose = run('JSON.stringify(seatedMotion(customers[0]))');
  run('emergenceClock+=0.4');
  assert.notEqual(run('JSON.stringify(seatedMotion(customers[0]))'), pose);
  assert.equal(run(`(()=>{const b=guestBounds(customers[0]);return guestAtPoint({inside:true,x:customers[0].x,y:b.top+12})?.id})()`), 0);
  assert.equal(run('guestAtPoint({inside:true,x:5,y:5})'), undefined);
  run('drawCafe();drawCustomers();drawDraggedParty();');
  const reduced = await game({ reducedMotion: true });
  assert.equal(reduced.run('JSON.stringify(seatedMotion({state:"drinking",type:"social",id:1,timer:6}))'), '{}');
});

test('fully furnished cafés have reachable service points for every table', async () => {
  const { run } = await game();
  run('cafe.tables=6');
  for (let layout = 0; layout < 5; layout++) {
    run('tablePositions=createTableLayout()');
    for (let table = 0; table < 6; table++) {
      const distance = run(`(()=>{const target=tableServicePoint(${table});const route=staffWalkPath({x:890,y:340},target);const end=route.at(-1);return Math.hypot(end.x-target.x,end.y-target.y)})()`);
      assert(distance < 35, `table ${table + 1} can be served from a nearby aisle (${distance}px)`);
    }
  }
});

test('a complete day with three employees runs through service and closing', async () => {
  const { run } = await game();
  run(`hireStaff();hireStaff();
    staff=cafe.staff.map(m=>({...m,role:'floor',energy:100,cd:0,rest:0}));
    for(let frame=1;frame<=2000 && running;frame++) {
      for(const party of [...waitingParties]) {
        const table=availableTables(party.size)[0];
        if(table!=null) seatWaiting(party.id,table);
      }
      gameLoop(frame*50);
    }`);
  assert.equal(run('running'), false);
  assert(run('Object.values(customerSpending).reduce((n,s)=>n+s.served,0)') > 0, 'staff completed service');
});
