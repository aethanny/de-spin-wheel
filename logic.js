(function (root) {
  'use strict';
  const units = value => Math.round(Number(value) * 100);
  function validate(prizes) {
    if (!prizes.length) return 'Add at least one prize before spinning.';
    if (prizes.some(p => !p.name.trim())) return 'Give every prize a name.';
    if (prizes.some(p => !Number.isFinite(Number(p.chance)) || Number(p.chance) < 0 || Number(p.chance) > 100 || Math.abs(Number(p.chance) * 100 - units(p.chance)) > 0.000001)) return 'Use percentages from 0 to 100 with up to two decimal places.';
    if (prizes.reduce((sum, p) => sum + units(p.chance), 0) !== 10000) return 'Prize chances must total exactly 100%.';
    return '';
  }
  function selectPrize(prizes, random) {
    const error = validate(prizes);
    if (error) throw new Error(error);
    if (random < 0 || random >= 1) throw new Error('Random value must be in [0, 1).');
    const ticket = Math.floor(random * 10000);
    let cumulative = 0;
    return prizes.find(p => { cumulative += units(p.chance); return ticket < cumulative; });
  }
  function targetAngle(index, count, current) {
    const destination = (360 - (index + 0.5) * 360 / count) % 360;
    return current + 360 * 5 + (destination - current % 360 + 360) % 360;
  }
  function rebalance(prizes, editedId, value) {
    if (!prizes.length) return;
    const edited = prizes.find(p => p.id === editedId);
    if (edited) edited.chance = Math.max(0, Math.min(10000, units(value))) / 100;
    const others = prizes.filter(p => p !== edited);
    if (!others.length) { prizes[0].chance = 100; return; }
    const remaining = 10000 - (edited ? units(edited.chance) : 0);
    const weights = others.map(p => Math.max(0, units(p.chance) || 0));
    const total = weights.reduce((sum, n) => sum + n, 0);
    const shares = weights.map(w => remaining * (total ? w / total : 1 / others.length));
    const rounded = shares.map(Math.floor);
    const order = shares.map((share, i) => i).sort((a, b) => (shares[b] - rounded[b]) - (shares[a] - rounded[a]));
    const leftover = remaining - rounded.reduce((sum, n) => sum + n, 0);
    for (let i = 0; i < leftover; i++) rounded[order[i]]++;
    others.forEach((p, i) => { p.chance = rounded[i] / 100; });
  }
  const api = { units, validate, selectPrize, targetAngle, rebalance };
  if (typeof module !== 'undefined') module.exports = api;
  else root.WheelLogic = api;
})(globalThis);
