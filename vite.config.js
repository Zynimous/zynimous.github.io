import {defineConfig} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import {buildManifest} from './scripts/manifest.mjs';

const ROOT = import.meta.dirname, VID = 'virtual:manifest', RID = '\0' + VID;

// Serves the content manifest as a virtual module; rebuilds when content/config change.
function manifestPlugin(){
  return {
    name: 'zynimous-manifest',
    resolveId: id => id === VID ? RID : null,
    load(id){
      if (id !== RID) return null;
      this.addWatchFile(path.join(ROOT, 'config/regions.yml'));
      this.addWatchFile(path.join(ROOT, 'config/model-families.yml'));
      this.addWatchFile(path.join(ROOT, 'config/decals.yml'));
      return 'export default ' + JSON.stringify(buildManifest(ROOT));
    },
    // SPA fallbacks for static hosts: GitHub Pages serves 404.html, Cloudflare Pages reads _redirects.
    closeBundle(){
      const dist = path.join(ROOT, 'dist'), idx = path.join(dist, 'index.html');
      if (!fs.existsSync(idx)) return;
      fs.copyFileSync(idx, path.join(dist, '404.html'));
      fs.writeFileSync(path.join(dist, '_redirects'), '/*  /index.html  200\n');
    },
    configureServer(server){
      server.watcher.add([path.join(ROOT, 'content'), path.join(ROOT, 'config')]);
      const hit = f => /[\\/](content|config)[\\/]/.test(f);
      const reload = f => {
        if (!hit(f)) return;
        const m = server.moduleGraph.getModuleById(RID);
        if (m) server.moduleGraph.invalidateModule(m);
        server.ws.send({type: 'full-reload'});
      };
      server.watcher.on('change', reload).on('add', reload).on('unlink', reload);
    }
  };
}

export default defineConfig({
  plugins: [manifestPlugin()],
  server: {watch: {usePolling: true, interval: 200}} // /mnt/c (WSL) doesn't deliver fs events
});
