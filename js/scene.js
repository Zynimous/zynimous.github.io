/* ================= THREE ================= */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 1);
const scene = new THREE.Scene();
const FOV = 42;
const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 2400);

const geo = new THREE.PlaneGeometry(S, S, N-1, N-1);
geo.rotateX(-Math.PI/2);
{ const p = geo.attributes.position; for (let k=0;k<p.count;k++) p.setY(k, hAt(p.getX(k), p.getZ(k))); }
document.getElementById('boot-verts').textContent = geo.attributes.position.count.toLocaleString('en-US') + ' VERTS';

const terrainUniforms = {
  uLine:{value:new THREE.Color(0xff6a1a)}, uCursor:{value:new THREE.Vector2(9999,9999)}, uCursorOn:{value:0},
  uFocus:{value:new THREE.Vector2(9999,9999)}, uFocusAmt:{value:0}, uIntro:{value: reduce ? 2 : 0}, uZoom:{value: 200}
};
const terrainMat = new THREE.ShaderMaterial({
  uniforms: terrainUniforms,
  extensions: {derivatives:true},
  vertexShader: `varying vec3 vW; varying float vH0;
    void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vH0 = position.y; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uLine; uniform vec2 uCursor; uniform float uCursorOn; uniform vec2 uFocus; uniform float uFocusAmt; uniform float uIntro; uniform float uZoom;
    varying vec3 vW; varying float vH0;
    float iso(float v, float w){ float d = max(fwidth(v), 1e-4); float f = abs(fract(v - 0.5) - 0.5) / d; return 1.0 - clamp(f / w, 0.0, 1.0); }
    void main(){
      float vH = vH0 * 0.8667; // terrain is 1.5x taller; net contour density = 1.3x
      // zoom LOD: fine lines only when close, coarse ones persist when far
      float zFine = 1.0 - smoothstep(80.0, 160.0, uZoom);
      float zMid  = 1.0 - 0.8*smoothstep(200.0, 340.0, uZoom);
      float zFar  = smoothstep(220.0, 380.0, uZoom);
      float minor = max(iso(vH, 0.9)*0.5*zFine, iso(vH/2.0, 1.0)*zMid);
      float major = max(iso(vH/10.0, 1.35), iso(vH/20.0, 1.7)*zFar);
      float halo  = max(iso(vH/2.0, 4.5)*zMid, iso(vH, 4.0)*zFine*0.5);
      float dc = distance(vW.xz, uCursor);
      float cur = exp(-dc*dc/2000.0) * uCursorOn;
      float df = distance(vW.xz, uFocus);
      float foc = exp(-df*df/4200.0) * uFocusAmt;
      float energy = 0.42 + cur*1.0 + foc*0.75;
      vec3 lc = mix(vec3(0.78,0.78,0.76), uLine, clamp(cur*1.3, 0.0, 1.0));
      vec3 col = lc * (minor*0.55 + major*1.0 + halo*0.12) * energy;
      float gx = iso(vW.x/40.0, 0.7), gz = iso(vW.z/40.0, 0.7);
      col += vec3(0.055) * max(gx, gz);
      col += vec3(0.012 + max(vH0,0.0)*0.0005);
      float cd = distance(cameraPosition, vW);
      float fog = 1.0 - smoothstep(300.0, 1100.0, cd);
      float edge = 1.0 - smoothstep(${(HALF-80).toFixed(1)}, ${HALF.toFixed(1)}, max(abs(vW.x), abs(vW.z)));
      float r = length(vW.xz);
      float rev = 1.0 - smoothstep(uIntro*560.0 - 50.0, uIntro*560.0, r);
      float front = exp(-pow((r - uIntro*560.0)/14.0, 2.0)) * step(uIntro, 1.0);
      col *= fog * edge * rev;
      col += vec3(0.8) * front * 0.5 * edge * minor;
      gl_FragColor = vec4(col, 1.0);
    }`
});
scene.add(new THREE.Mesh(geo, terrainMat));

/* line helpers */
const dashMats = [];
function dashMat(color, opacity, dash, gap, speed){
  const m = new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}, uColor:{value:new THREE.Color(color)}, uOpacity:{value:opacity}, uDash:{value:dash}, uGap:{value:gap}, uSpeed:{value: reduce ? 0 : speed}},
    vertexShader:`attribute float lineDistance; varying float vD; void main(){ vD = lineDistance; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`uniform float uTime, uOpacity, uDash, uGap, uSpeed; uniform vec3 uColor; varying float vD;
      void main(){ float m = mod(vD - uTime*uSpeed, uDash + uGap); if (m > uDash) discard; gl_FragColor = vec4(uColor, uOpacity); }`,
    transparent:true, depthWrite:false
  });
  dashMats.push(m); return m;
}
function addLine(pts, mat, {closed=false, lift=.35, y=null, dashed=false}={}){
  const arr = [];
  const push = p => arr.push(p[0], (y ?? hAt(p[0], p[1])) + lift, p[1]);
  pts.forEach(push); if (closed) push(pts[0]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const l = new THREE.Line(g, mat); if (dashed) l.computeLineDistances(); scene.add(l); return l;
}
const polar = (cx, cz, a, r) => [cx + Math.cos(a)*r, cz + Math.sin(a)*r];

/* forts */
ZONES.forEach(z => {
  const fort = [], R = z.R;
  for (let i=0;i<z.n;i++){
    const th = -Math.PI/2 + i*2*Math.PI/z.n;
    for (const [da, rr] of [[-.30,.70],[-.20,.86],[0,1],[.20,.86],[.30,.70]]) fort.push(polar(z.x, z.z, th+da, R*rr));
  }
  z.wallMat = new THREE.LineBasicMaterial({color:0xcfcfcf, transparent:true, opacity:.85});
  addLine(fort, z.wallMat, {closed:true, y:z.h, lift:.3});
  const inner = fort.map(([px,pz]) => [z.x + (px-z.x)*.9, z.z + (pz-z.z)*.9]);
  addLine(inner, new THREE.LineBasicMaterial({color:0x5a5a5a, transparent:true, opacity:.7}), {closed:true, y:z.h, lift:.3});
  const ring = []; for (let i=0;i<=96;i++) ring.push(polar(z.x, z.z, i/96*Math.PI*2, R*1.2));
  addLine(ring, dashMat(0x8a8a8a, .55, 1.4, 1.8, 0), {y:z.h, lift:.3, dashed:true});
  const keep = [0,1,2,3].map(i => polar(z.x, z.z, Math.PI/4 + i*Math.PI/2, R*.2));
  z.detailMat = new THREE.LineBasicMaterial({color:0xcfcfcf, transparent:true, opacity:0});
  addLine(keep, z.detailMat, {closed:true, y:z.h, lift:.3});
  z.spokeMat = dashMat(0xcfcfcf, 0, 1, 1.2, 2);
  const k = z.items.length;
  z.items.forEach((it, idx) => {
    const a = -Math.PI/2 + Math.PI/k + idx*2*Math.PI/k;
    const [ix, iz] = polar(z.x, z.z, a, R*.62);
    it.x = ix; it.z = iz; it.h = z.h;
    const sq = [[-1.4,-1.4],[1.4,-1.4],[1.4,1.4],[-1.4,1.4]].map(([dx,dz]) => [ix+dx, iz+dz]);
    addLine(sq, z.detailMat, {closed:true, y:z.h, lift:.3});
    addLine([polar(z.x, z.z, a, R*.22), polar(z.x, z.z, a, R*.62 - 2)], z.spokeMat, {y:z.h, lift:.3, dashed:true});
  });
});

/* routes */
function route(a, b, bend){
  const A = ZMAP[a], B = ZMAP[b];
  const dx = B.x-A.x, dz = B.z-A.z, L = Math.hypot(dx,dz), ux = dx/L, uz = dz/L;
  const s = [A.x + ux*A.R*1.25, A.z + uz*A.R*1.25], e = [B.x - ux*B.R*1.25, B.z - uz*B.R*1.25];
  const mx = (s[0]+e[0])/2 - uz*bend, mz = (s[1]+e[1])/2 + ux*bend;
  const q1 = [(s[0]*2+mx)/3, (s[1]*2+mz)/3];
  const curve = new THREE.CatmullRomCurve3([s, q1, [mx,mz], e].map(p => new THREE.Vector3(p[0],0,p[1])), false, 'centripetal');
  return curve.getPoints(260).map(p => [p.x, p.z]);
}
const tourMat = dashMat(0xe8e8e8, .85, 3.2, 2.6, 5);
const spokeMat = dashMat(0x8a8a8a, .4, 1.2, 2.6, 0);
addLine(route('hq','projects', -24), tourMat, {lift:1, dashed:true});
addLine(route('projects','about', -60), tourMat, {lift:1, dashed:true});
addLine(route('about','blogs', -50), tourMat, {lift:1, dashed:true});
addLine(route('hq','blogs', 20), spokeMat, {lift:1, dashed:true});
addLine(route('hq','about', 16), spokeMat, {lift:1, dashed:true});

/* spot heights */
const peaks = [];
{
  const W = 12;
  for (let j=W;j<N-W;j+=2) for (let i=W;i<N-W;i+=2){
    const h = grid[j*N+i]; let ok = true;
    for (let dj=-W;dj<=W && ok;dj+=2) for (let di=-W;di<=W;di+=2){ if (grid[(j+dj)*N+i+di] > h){ ok=false; break; } }
    if (!ok) continue;
    const x = -HALF+i*CELL, z = -HALF+j*CELL;
    if (Math.max(Math.abs(x),Math.abs(z)) > HALF-90) continue;
    if (ZONES.some(zn => Math.hypot(x-zn.x, z-zn.z) < zn.R*2.4)) continue;
    peaks.push({x, z, h});
  }
  peaks.sort((a,b) => b.h - a.h);
  const chosen = [];
  for (const p of peaks){ if (chosen.every(c => Math.hypot(c.x-p.x, c.z-p.z) > 80)) chosen.push(p); if (chosen.length >= 6) break; }
  peaks.length = 0; peaks.push(...chosen);
}
