import nlp from 'compromise';
import { routeByText } from './route.js';

// Usado só como função (POS e sentimento); as propriedades estáticas do nlp não são expostas.
function pos(...args: Parameters<typeof nlp>): ReturnType<typeof nlp> {
	return routeByText('compromise-pos.nlp', args[0] ?? '', () => nlp(...args));
}

export default pos as typeof nlp;
