import {cp,rm,mkdir} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('index.html','dist/index.html');await cp('src','dist/src',{recursive:true});
console.log('Aurelis Authority build complete.');
