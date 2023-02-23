import type Node from './Node';
import type NativeInterface from '../native/NativeInterface';
import type Tree from './Tree';
import type Project from '../models/Project';
import type Source from './Source';
import type Type from './Type';
import type Expression from './Expression';
import { CycleType } from './CycleType';
import type Reference from './Reference';
import type PropertyReference from './PropertyReference';
import type Definition from './Definition';
import type StreamDefinition from './StreamDefinition';

/** Passed around during type inference and conflict detection to facilitate program analysis and cycle-detection. */
export default class Context {
    readonly project: Project;
    readonly source: Source;
    readonly native: NativeInterface;
    readonly root: Tree | undefined;

    readonly stack: Node[] = [];
    readonly types: Map<Node, Type> = new Map();
    readonly referenceUnions: Map<PropertyReference | Reference, Type> =
        new Map();
    readonly definitions: Map<Node, Definition[]> = new Map();

    readonly streamTypes: Map<Type, StreamDefinition> = new Map();

    constructor(project: Project, source: Source, root?: Tree) {
        this.project = project;
        this.source = source;
        this.native = project.getNative();
        this.root = root;
    }

    /** Check the cache for a Tree representing the given node, and set the cache if we haven't checked yet. */
    get(node: Node): Tree | undefined {
        return this.root?.get(node) ?? this.project.get(node);
    }

    withRoot(root: Tree) {
        return new Context(this.project, this.source, root);
    }

    /** Track cycles during conflict analysis. */
    visit(node: Node) {
        this.stack.push(node);
    }
    unvisit() {
        this.stack.pop();
    }
    visited(node: Node) {
        return this.stack.includes(node);
    }

    getType(node: Expression) {
        let cache = this.types.get(node);
        if (cache === undefined) {
            if (this.visited(node))
                cache = new CycleType(
                    node,
                    this.stack.slice(this.stack.indexOf(node))
                );
            else {
                this.visit(node);
                cache = node.computeType(this);
                this.unvisit();
            }
        }
        return cache;
    }

    getDefinitions(node: Node) {
        return this.definitions.get(node);
    }

    getReferenceType(ref: Reference | PropertyReference) {
        return this.referenceUnions.get(ref);
    }
    setReferenceType(ref: Reference | PropertyReference, type: Type) {
        return this.referenceUnions.set(ref, type);
    }

    setStreamType(type: Type, stream: StreamDefinition) {
        this.streamTypes.set(type, stream);
    }

    getStreamType(type: Type): StreamDefinition | undefined {
        return this.streamTypes.get(type);
    }
}
