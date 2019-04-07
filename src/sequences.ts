export class Sequence<A> {
    iterator: Iterator<A>

    constructor(iterator: Iterator<A>) {
        this.iterator = iterator
    }

    map<B>(f: (value: A, index: number) => B): Sequence<B> {
        const oldIter = this.iterator
        function* newIter() {
            let i = 0
            while (true) {
                const curr = oldIter.next()
                if (curr.done) {
                    break
                } else {
                    yield f(curr.value, i)
                    i++
                }
            }
        }
        return new Sequence(newIter())
    }

    reduce(f: (previousValue: A, currentValue: A, currentIndex: number) => A): A
    reduce<U>(f: (previousValue: U, currentValue: A, currentIndex: number) => U, initialValue: U): U

    reduce<U>(f: (previousValue: U, currentValue: A, currentIndex: number) => U, initialValue?: U): U {
        let value
        if (initialValue === undefined) {
            const curr = this.iterator.next()
            if (curr.done) {
                throw new Error("Calling reduce without an initial value on an empty array")
            } else {
                value = curr.value
            }
        } else {
            value = initialValue
        }

        let i = 0
        while (true) {
            const curr = this.iterator.next()
            if (curr.done) {
                break
            } else {
                value = f(value as U, curr.value, i)
                i++
            }
        }
        return value as U
    }

    forEach(f: (value: A, index: number) => void) {
        let i = 0
        while (true) {
            const curr = this.iterator.next()
            if (curr.done) {
                break
            } else {
                f(curr.value, i)
                i++
            }
        }
    }

    filter(f: (value: A, index: number) => boolean): Sequence<A> {
        const oldIter = this.iterator
        function* newIter() {
            let i = 0
            while (true) {
                const curr = oldIter.next()
                if (curr.done) {
                    break
                } else {
                    if (f(curr.value, i)) {
                        yield curr.value
                    }
                    i++
                }
            }
        }
        return new Sequence(newIter())
    }

    toArray(): A[] {
        const arr = []
        while (true) {
            const curr = this.iterator.next()
            if (curr.done) {
                break
            } else {
                arr.push(curr.value)
            }
        }
        return arr
    }

    toObject<K extends string | number | symbol, V>(this: Sequence<[K, V]>): Record<K, V> {
        const ret: any = {}
        while (true) {
            const curr = this.iterator.next()
            if (curr.done) {
                break
            } else {
                const [k, v] = curr.value
                ret[k] = v
            }
        }
        return ret
    }
}

export default function seq<A>(array: Iterable<A>): Sequence<A>
export default function seq<K extends string | number | symbol, V>(record: Record<K, V>): Sequence<[K, V]>

export default function seq(value: object): Sequence<any> {
    if (typeof (value as Iterable<any>)[Symbol.iterator] === "function") {
        return new Sequence((value as Iterable<any>)[Symbol.iterator]())
    } else {
        const v = value as Record<string, any>
        const hasOwnProperty = Object.prototype.hasOwnProperty
        function* iter() {
            for (const k in v) {
                if (hasOwnProperty.call(v, k)) {
                    yield [k, v[k]]
                }
            }
        }
        return new Sequence(iter())
    }
}
