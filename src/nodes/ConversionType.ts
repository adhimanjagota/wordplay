import type { NativeTypeName } from '../native/NativeConstants';
import { CONVERT_SYMBOL } from '../parser/Tokenizer';
import type Context from './Context';
import Token from './Token';
import TokenType from './TokenType';
import Type from './Type';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';
import type TypeSet from './TypeSet';
import type { Replacement } from './Node';

export default class ConversionType extends Type {
    readonly input: Type;
    readonly convert: Token;
    readonly output: Type;

    constructor(input: Type, convert: Token | undefined, output: Type) {
        super();

        this.input = input;
        this.convert = convert ?? new Token(CONVERT_SYMBOL, TokenType.CONVERT);
        this.output = output;

        this.computeChildren();
    }
    getGrammar() {
        return [
            { name: 'input', types: [Type] },
            { name: 'convert', types: [Token] },
            { name: 'output', types: [Type] },
        ];
    }

    computeConflicts() {}

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types
            .list()
            .every(
                (type) =>
                    type instanceof ConversionType &&
                    this.input.accepts(type.input, context) &&
                    this.output instanceof Type &&
                    type.output instanceof Type &&
                    this.output.accepts(type.output, context)
            );
    }

    getNativeTypeName(): NativeTypeName {
        return 'conversion';
    }

    clone(replace?: Replacement) {
        return new ConversionType(
            this.replaceChild('input', this.input, replace),
            this.replaceChild('convert', this.convert, replace),
            this.replaceChild('output', this.output, replace)
        ) as this;
    }

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'A conversion function type',
        };
    }
}
