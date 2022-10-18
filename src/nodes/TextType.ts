import { TEXT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { TEXT_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import Language from "./Language";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Type from "./Type";
import { getPossibleLanguages } from "./getPossibleLanguages";
import type Transform from "./Transform";

export default class TextType extends NativeType {

    readonly quote: Token;
    readonly format?: Language;

    constructor(quote?: Token, format?: Language) {
        super();

        this.quote = quote ?? new Token(TEXT_SYMBOL, [ TokenType.TEXT_TYPE ]);
        this.format = format;
    }

    computeChildren() {
        const children = [];
        if(this.quote) children.push(this.quote);
        if(this.format) children.push(this.format);
        return children;
    }

    computeConflicts() {}

    accepts(type: Type): boolean { 
        return  (type instanceof TextType && 
                ((this.format === undefined && type.format === undefined) || 
                 (this.format !== undefined && type.format !== undefined && this.format.equals(type.format)))); 
    }

    getNativeTypeName(): string { return TEXT_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { 
        return new TextType(
            this.quote.cloneOrReplace([ Token ], original, replacement), 
            this.format?.cloneOrReplace([ Language, undefined ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A text type"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined {
    
        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(project !== undefined && child === this.format)
            return getPossibleLanguages(project).map(l => new Language(l))

    }
    
    getInsertionBefore() { return undefined; }
    
    getInsertionAfter(context: Context) { 
        
        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(project !== undefined && this.format === undefined)
            return getPossibleLanguages(project).map(l => new Language(l));

    }
    
}