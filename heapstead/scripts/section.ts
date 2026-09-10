import { buildScene } from '../src/sim/diorama.ts';
import { BlockType } from '../src/sim/blocks.ts';

const { world, lanes } = buildScene(1);
const lane = lanes[0]!;
const z = Math.round(lane.z0 + lane.width / 2);
const glyph = { [BlockType.Air]: '.', [BlockType.Soil]: 's', [BlockType.Stone]: '#', [BlockType.Grass]: 'G' } as Record<number, string>;

console.log(`world ${world.sizeX} x ${world.sizeY} x ${world.sizeZ}, cross-section at z=${z}`);
console.log('    ' + Array.from({ length: world.sizeX }, (_, x) => (x % 10 === 0 ? String((x / 10) % 10) : ' ')).join(''));
for (let y = world.sizeY - 1; y >= 0; y--) {
  let row = '';
  for (let x = 0; x < world.sizeX; x++) row += glyph[world.get(x, y, z)] ?? '?';
  console.log(String(y).padStart(3) + ' ' + row);
}
console.log('\nkey features at this z:');
console.log(`  dig area      x ${lane.digArea.x0}..${lane.digArea.x1}   surface y=${world.surfaceY(20, z)}`);
console.log(`  chute path    ${lane.chutePath.map((p) => `(${p.x},${p.y.toFixed(1)},${p.z})`).join(' -> ')}`);
console.log(`  staging pile  origin ${JSON.stringify(lane.staging.shape.origin)} ${lane.staging.shape.width}x${lane.staging.shape.depth}`);
console.log(`  main pile     origin ${JSON.stringify(lane.main.shape.origin)} ${lane.main.shape.width}x${lane.main.shape.depth}`);
console.log(`  crane base    ${JSON.stringify(lane.craneBase)}`);
console.log(`  rim pile      origin ${JSON.stringify(lane.rim.shape.origin)} ${lane.rim.shape.width}x${lane.rim.shape.depth}`);
console.log(`  pit           x ${lane.pit.x0}..${lane.pit.x1}  floor y=${world.surfaceY(53, z)}`);
