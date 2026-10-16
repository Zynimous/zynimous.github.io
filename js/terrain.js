/* ================= TERRAIN ================= */
const S = 640, HALF = S/2, N = 321, CELL = S/(N-1);
function hash(ix, iy){ let h = (Math.imul(ix,374761393) + Math.imul(iy,668265263))|0; h = Math.imul(h ^ (h>>>13), 1274126177); h ^= h>>>16; return (h>>>0)/4294967296; }
function vnoise(x, y){
  const xi = Math.floor(x), yi = Math.floor(y), xf = x-xi, yf = y-yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  const a = hash(xi,yi), b = hash(xi+1,yi), c = hash(xi,yi+1), d = hash(xi+1,yi+1);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
function fbm(x, y){ let s=0, a=.5, f=1; for (let o=0;o<5;o++){ s += a*vnoise(x*f, y*f); f *= 2.03; a *= .5; } return s; }
function raw(x, z){
  const n = fbm(x*0.0065+3.1, z*0.0065-1.7);
  const r = fbm(x*0.003+11.3, z*0.003+5.9);
  const ridge = 1 - Math.abs(r*2-1);
  return n*66 + ridge*ridge*36 - 9;
}
ZONES.forEach(z => { z.h = 2*Math.round(raw(z.x,z.z)/2) + 1; z.pin = z.R*1.3; z.pout = z.R*1.3 + 24; });
function Hgt(x, z){
  let h = raw(x, z);
  for (const zn of ZONES){
    const d = Math.hypot(x-zn.x, z-zn.z);
    if (d < zn.pout){ let t = (zn.pout-d)/(zn.pout-zn.pin); t = t<0?0:t>1?1:t; t = t*t*(3-2*t); h += (zn.h-h)*t; }
  }
  return h;
}
const grid = new Float32Array(N*N);
for (let j=0;j<N;j++) for (let i=0;i<N;i++) grid[j*N+i] = Hgt(-HALF+i*CELL, -HALF+j*CELL);
function hAt(x, z){
  let u = (x+HALF)/CELL, v = (z+HALF)/CELL;
  u = u<0?0:u>N-1.001?N-1.001:u; v = v<0?0:v>N-1.001?N-1.001:v;
  const i = u|0, j = v|0, fu = u-i, fv = v-j;
  const a = grid[j*N+i], b = grid[j*N+i+1], c = grid[(j+1)*N+i], d = grid[(j+1)*N+i+1];
  return a + (b-a)*fu + (c-a)*fv + (a-b-c+d)*fu*fv;
}
const meters = h => Math.round(h*10 + 120);
const gridRef = v => String(Math.max(0, Math.round((v+HALF)*10))).padStart(4,'0');
