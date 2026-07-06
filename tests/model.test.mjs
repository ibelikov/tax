import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const src = html.match(/\/\* MODEL-START \*\/([\s\S]*?)\/\* MODEL-END \*\//)[1];
const model = new Function(src + '\nreturn {calc, P, state, INPUTS, PARAMS, ahkFor, akFor};')();
const {calc, P, ahkFor, akFor} = model;
const base = {...model.state};

test('default scenario arithmetic', () => {
  const r = calc(base);
  assert.equal(Math.round(r.revenue), 188000);
  assert.equal(Math.round(r.pbt), 108000);
  assert.equal(Math.round(r.vpb), 20520);
  assert.ok(Math.abs(r.dwht - 0.15 * base.dividend) < 0.01);
});

test('AHK phases out on verzamelinkomen, not salary alone', () => {
  const r = calc(base); // 70k salary + 80k dividend puts verzamelinkomen past the phase-out end
  assert.equal(r.ahk, 0);
  assert.ok(r.ahkClaw > 500);
  const noDiv = calc({...base, dividend: 0});
  assert.ok(noDiv.ahk > 500);
  assert.equal(noDiv.ahkClaw, 0);
});

test('credits are not refundable', () => {
  const r = calc({...base, salary: 10000, dividend: 0});
  assert.ok(r.nit >= 0);
  assert.ok(r.totalTax >= 0);
  const zero = calc({...base, rate: 0, cost: 0, salary: 0, dividend: 0});
  assert.equal(zero.totalTax, 0);
  assert.equal(zero.netCash, 0);
});

test('unused Box 1 credits offset Box 2 tax', () => {
  const r = calc({...base, salary: 5000, dividend: 30000});
  assert.equal(r.nit, 0);
  assert.ok(r.creditsB2 > 1000);
  assert.ok(Math.abs(r.box2 - (r.box2a + r.box2b - r.creditsB2)) < 0.01);
  assert.ok(r.creditsUnused >= 0);
});

test('a corporate loss carries forward instead of refunding VPB', () => {
  const r = calc({...base, salary: 200000});
  assert.ok(r.pbt < 0);
  assert.equal(r.vpb, 0);
  assert.equal(r.atp, r.pbt);
});

test('arbeidskorting curve is continuous and peaks at the published max', () => {
  for (const knot of [P.ak1lim, P.ak2lim, P.akStart]) {
    assert.ok(Math.abs(akFor(knot + 0.5) - akFor(knot - 0.5)) < 1);
  }
  assert.ok(Math.abs(akFor(P.akStart) - 5685) < 1);
  assert.equal(akFor(0), 0);
  assert.equal(akFor(200000), 0);
});

test('ahkFor matches published bounds', () => {
  assert.equal(ahkFor(0), P.ahkMax);
  assert.equal(ahkFor(P.ahkStart), P.ahkMax);
  assert.equal(ahkFor(200000), 0);
});
