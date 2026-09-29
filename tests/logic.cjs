const assert = require('node:assert/strict');
const {validate, selectPrize, targetAngle} = require('../logic.js');
const prizes = [{name:'Never',chance:0},{name:'Small',chance:12.34},{name:'Big',chance:87.66}];
assert.equal(validate(prizes), '');
assert.equal(selectPrize(prizes,0).name,'Small');
assert.equal(selectPrize(prizes,.123399).name,'Small');
assert.equal(selectPrize(prizes,.1234).name,'Big');
assert.equal(selectPrize(prizes,.999999).name,'Big');
assert.ok(validate([]));
assert.ok(validate([{name:' ',chance:100}]));
for(const chance of [-1,101,NaN,12.345]) assert.ok(validate([{name:'Invalid',chance}]));
assert.ok(validate([{name:'Incomplete',chance:99.99}]));
assert.equal(validate([{name:'A',chance:33.33},{name:'B',chance:33.33},{name:'C',chance:33.34}]),'');
assert.throws(()=>selectPrize(prizes,1));
const counts={Small:0,Big:0};
for(let i=0;i<10000;i++) counts[selectPrize(prizes,i/10000).name]++;
assert.deepEqual(counts,{Small:1234,Big:8766});
for(const count of [1,2,8,17]) for(let i=0;i<count;i++) for(const current of [0,1999,4578.5]) {
  const angle=targetAngle(i,count,current);
  assert.ok(angle-current>=1800);
  const pointerPosition=((360-angle%360)%360+360)%360;
  assert.equal(Math.floor(pointerPosition/(360/count)),i);
}
console.log('Passed: percentage validation, exact weighted boundaries, zero odds, distribution, and pointer alignment.');
const {rebalance, units} = require('../logic.js');
const balanced = Array.from({length:8}, (_,i)=>({id:String(i),name:'Prize',chance:12.5}));
for(const value of [0,100,33.33,12.34,99.99,0.01]) {
  rebalance(balanced,'0',value);
  assert.equal(balanced[0].chance,value);
  assert.equal(balanced.reduce((sum,p)=>sum+units(p.chance),0),10000);
  assert.equal(validate(balanced),'');
}
rebalance(balanced,'0',100);rebalance(balanced,'0',30);
assert.equal(balanced.slice(1).reduce((sum,p)=>sum+units(p.chance),0),7000);
balanced.shift();rebalance(balanced);assert.equal(validate(balanced),'');
const single=[{id:'only',name:'Only',chance:0}];rebalance(single,'only',20);assert.equal(single[0].chance,100);
rebalance([]);
console.log('Passed: automatic balancing, rounding, zero-weight redistribution, deletion and single prize.');
