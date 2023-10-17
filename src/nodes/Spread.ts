import Expression from './Expression';
import type { Grammar, Replacement } from './Node';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { BasisTypeName } from '../basis/BasisConstants';
import Node, { node, optional } from './Node';
import Sym from './Sym';
import { BIND_SYMBOL } from '../parser/Symbols';
import AnyType from './AnyType';
import ListType from './ListType';
import type Locales from '../locale/Locales';

/** Inside a list literal, flattens values of a list value into a new list */
export default class Spread extends Node {
    readonly dots: Token;
    readonly list: Expression | undefined;

    constructor(dots: Token, list: Expression | undefined) {
        super();

        this.dots = dots;
        this.list = list;

        this.computeChildren();
    }

    static make(list: Expression) {
        return new Spread(new Token(BIND_SYMBOL, Sym.Bind), list);
    }

    static getPossibleNodes() {
        return [];
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'dots',
                kind: node(Sym.Bind),
            },
            {
                name: 'list',
                kind: optional(node(Expression)),
                getType: () => ListType.make(new AnyType()),
                label: (locales: Locales) => locales.get((l) => l.term.list),
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Spread(
            this.replaceChild('dots', this.dots, replace),
            this.replaceChild('list', this.list, replace)
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Value;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'list';
    }

    computeConflicts() {
        return;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Spread);
    }

    getGlyphs() {
        return Glyphs.Stream;
    }
}
