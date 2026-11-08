import {solvePuzzle} from './solver.js';
self.onmessage=({data})=>{try{self.postMessage(solvePuzzle(data));}catch{self.postMessage({status:'error',message:'The calculation could not finish. Check the entries and try again.'});}};
