import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const src = html.match(/\/\* MODEL-START \*\/([\s\S]*?)\/\* MODEL-END \*\//)[1];
const model = new Function(src + '\nreturn {calc, calcZzp, P, state, INPUTS, PARAMS, ahkFor, akFor};')();
const {calc, calcZzp, P, ahkFor, akFor} = model;
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

test('fiscal partner split doubles the low Box 2 bracket', () => {
  const single = calc({...base, salary: 0, dividend: 130000, partner: 0});
  const split  = calc({...base, salary: 0, dividend: 130000, partner: 1});
  assert.equal(split.box2b, 0);           // both halves stay inside the low bracket
  assert.ok(single.box2b > 15000);
  assert.ok(split.box2 < single.box2);
  assert.ok(split.ahk > single.ahk);      // DGA verzamelinkomen only counts their own half
});

test('ahkFor matches published bounds', () => {
  assert.equal(ahkFor(0), P.ahkMax);
  assert.equal(ahkFor(P.ahkStart), P.ahkMax);
  assert.equal(ahkFor(200000), 0);
});

test('eenmanszaak deductions and tariefsaanpassing', () => {
  const z = calcZzp(base); // winst 178,000
  assert.equal(z.za, 1200);
  assert.ok(Math.abs(z.mkbAmt - 0.127 * 176800) < 0.01);
  // relief for the deducted euros is capped at the bracket-2 rate
  const expectedCorr = (P.b3r - P.b2r) * (z.winst - z.taxable);
  assert.ok(Math.abs(z.tariefCorr - expectedCorr) < 0.01);
  assert.ok(z.net > 0 && z.net < z.winst);
});

test('eenmanszaak edge cases', () => {
  const tiny = calcZzp({...base, rate: 1, cost: 0}); // winst 1,880
  assert.ok(tiny.tax >= 0);            // credits never refund
  assert.equal(tiny.tariefCorr, 0);
  const loss = calcZzp({...base, rate: 0, cost: 5000});
  assert.equal(loss.za, 0);            // deduction capped by profit
  assert.equal(loss.tax, 0);
  assert.equal(loss.net, loss.winst);  // the loss passes through untaxed
});
