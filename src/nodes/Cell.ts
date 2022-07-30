import type Bind from "../nodes/Bind";
import type Conflict from "../parser/Conflict";
import type Expression from "./Expression";
import Node, { type ConflictContext } from "./Node";
import type Token from "./Token";
import type Unparsable from "./Unparsable";

export default class Cell extends Node {

    readonly cell: Token;
    readonly expression: Expression | Unparsable | Bind;

    constructor(bar: Token, expression: Expression | Unparsable | Bind) {
        super();

        this.cell = bar;
        this.expression = expression;
    }

    getChildren() {
        return [ this.cell, this.expression ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

}