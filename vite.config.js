import {defineConfig,loadEnv} from 'vite';
import {resolve} from 'node:path';
import {generationApi} from './server/generation-api.js';
import {dungeonApi} from './server/dungeon-api.js';
export default defineConfig(({mode})=>({build:{rollupOptions:{input:{table:resolve('index.html'),solo:resolve('solo.html')}}},plugins:[{name:'local-game-generation',configureServer(server){const env={...loadEnv(mode,process.cwd(),''),...process.env};server.middlewares.use(dungeonApi(env));server.middlewares.use(generationApi(env))}}]}));
