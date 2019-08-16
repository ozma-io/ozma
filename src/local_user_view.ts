import Vue from "vue"
import { Store } from "vuex"

import { CombinedUserView, IUserViewEventHandler, IRowCommon, ICombinedValue, ICombinedRow, IAddedRow, newEmptyRow } from "@/state/user_view"
import { AddedRowId } from "@/state/staging_changes"

export interface ILocalRowInfo<RowT> {
    extra: RowT,
}

export interface ILocalRow<ValueT, RowT> extends ILocalRowInfo<RowT> {
    values: ValueT[],
}

export interface IEmptyRow<ValueT, RowT> {
    row: IRowCommon
    local: ILocalRow<ValueT, RowT>
}

export interface IHandlerProvider {
    handler: IUserViewEventHandler
}

export interface IAddedRowRef {
    type: "added"
    id: number
}

export interface IExistingRowRef {
    type: "existing"
    position: number
}

export interface INewRowRef {
    type: "new"
}

export interface IAddedValueRef extends IAddedRowRef {
    column: number
}

export interface IExistingValueRef extends IExistingRowRef {
    column: number

}

export interface INewValueRef extends INewRowRef {
    column: number
}

export type RowRef = IAddedRowRef | IExistingRowRef | INewRowRef
export type ValueRef = IAddedValueRef | IExistingValueRef | INewValueRef

// This is a class which maintains separate local extra data for each cell, row and instance of a user view.
// After creating register its `handler` with `userView.registerHandler`.
// When no longer needed, unregister its `handler` with `userView.unregisterHandler`.
// Inherit from it and override its public methods.
export abstract class LocalUserView<ValueT, RowT, ViewT> implements IHandlerProvider {
    uv: CombinedUserView
    rows: Array<ILocalRow<ValueT, RowT>>
    newRows: Record<AddedRowId, ILocalRow<ValueT, RowT>>
    extra: ViewT
    handler: IUserViewEventHandler
    emptyRow: IEmptyRow<ValueT, RowT> | null

    constructor(store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>) {
        this.uv = uv
        this.extra = this.createLocalUserView()

        if (uv.rows === null) {
            this.rows = []
        } else {
            this.rows = uv.rows.map(row => {
                const localRow: ILocalRowInfo<RowT> = {
                    extra: this.createLocalRow(row),
                }
                const values = row.values.map((value, colI) => this.createLocalValue(row, localRow, colI, value))

                const localRowMut = localRow as ILocalRow<ValueT, RowT>
                localRowMut.values = values

                this.postInitRow(row, localRowMut)

                return localRowMut
            })
        }

        this.newRows = Object.fromEntries(Object.entries(uv.newRows).map(([rowId, row]) => {
            const newRow = this.createAddedRow(row)
            return [rowId, newRow]
        }))

        if (uv.info.mainEntity !== null) {
            const row = newEmptyRow(store, uv, defaultRawValues)
            const localRow: ILocalRowInfo<RowT> = {
                extra: this.createEmptyLocalRow(row),
            }
            const values = row.values.map((value, colI) => this.createEmptyLocalValue(row, localRow, colI, value))

            const localRowMut = localRow as ILocalRow<ValueT, RowT>
            localRowMut.values = values

            this.postInitAddedRow(row, localRowMut)

            this.emptyRow = {
                row,
                local: localRowMut,
            }
        } else {
            this.emptyRow = null
        }

        this.handler = {
            updateValue: (rowIndex: number, row: ICombinedRow, columnIndex: number, value: ICombinedValue) => {
                const localRow = this.rows[rowIndex]
                this.updateValue(rowIndex, row, localRow, columnIndex, value, localRow.values[columnIndex])
            },
            updateAddedValue: (rowId: AddedRowId, row: IAddedRow, columnIndex: number, value: ICombinedValue) => {
                const localRow = this.newRows[rowId]
                this.updateAddedValue(rowId, row, localRow, columnIndex, value, localRow.values[columnIndex])
            },
            deleteRow: (rowIndex: number, row: ICombinedRow) => {
                const localRow = this.rows[rowIndex]
                this.deleteRow(rowIndex, row, localRow)
            },
            undeleteRow: (rowIndex: number, row: ICombinedRow) => {
                const localRow = this.rows[rowIndex]
                this.undeleteRow(rowIndex, row, localRow)
            },
            insertAddedRow: (rowId: AddedRowId, row: IAddedRow) => {
                const localRow = this.createAddedRow(row)
                Vue.set(this.newRows, rowId, localRow)
                this.insertAddedRow(rowId, row, localRow)
            },
            deleteAddedRow: (rowId: AddedRowId, row: IAddedRow) => {
                const localRow = this.newRows[rowId]
                Vue.delete(this.newRows, rowId)
                this.deleteAddedRow(rowId, row, localRow)
            },
        }

        this.postInitUserView()
    }

    abstract createLocalValue(row: ICombinedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue): ValueT

    abstract createAddedLocalValue(row: IAddedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue): ValueT

    abstract createEmptyLocalValue(row: IRowCommon, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue): ValueT

    abstract createLocalRow(row: ICombinedRow): RowT

    abstract createAddedLocalRow(row: IAddedRow): RowT

    abstract createEmptyLocalRow(row: IRowCommon): RowT

    updateValue(rowIndex: number, row: ICombinedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
        return
    }

    updateAddedValue(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
        return
    }

    deleteRow(rowIndex: number, row: ICombinedRow, localRow: ILocalRow<ValueT, RowT>) {
        return
    }

    undeleteRow(rowIndex: number, row: ICombinedRow, localRow: ILocalRow<ValueT, RowT>) {
        return
    }

    deleteAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRow<ValueT, RowT>) {
        return
    }

    insertAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRow<ValueT, RowT>) {
        return
    }

    abstract createLocalUserView(): ViewT

    postInitUserView() {
        return
    }

    postInitRow(row: ICombinedRow, localRow: ILocalRowInfo<RowT>) {
        return
    }

    postInitAddedRow(row: IAddedRow, localRow: ILocalRowInfo<RowT>) {
        return
    }

    postInitEmptyRow(row: IRowCommon, localRow: ILocalRowInfo<RowT>) {
        return
    }

    private createAddedRow(row: IAddedRow) {
        const newRow: ILocalRowInfo<RowT> = {
            extra: this.createAddedLocalRow(row),
        }
        const values = row.values.map((value, colI) => this.createAddedLocalValue(row, newRow, colI, value))

        const newRowMut = newRow as ILocalRow<ValueT, RowT>
        newRowMut.values = values

        this.postInitAddedRow(row, newRowMut)

        return newRowMut
    }
}

export abstract class SimpleLocalUserView<ValueT, RowT, ViewT> extends LocalUserView<ValueT, RowT, ViewT> {
    constructor(store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>) {
        super(store, uv, defaultRawValues)
    }

    abstract createCommonLocalValue(row: IRowCommon, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue): ValueT

    createLocalValue(row: ICombinedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue): ValueT {
        return this.createCommonLocalValue(row, localRow, columnIndex, value)
    }

    createAddedLocalValue(row: IAddedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue): ValueT {
        return this.createCommonLocalValue(row, localRow, columnIndex, value)
    }

    createEmptyLocalValue(row: IRowCommon, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue): ValueT {
        return this.createCommonLocalValue(row, localRow, columnIndex, value)
    }

    abstract createCommonLocalRow(row: IRowCommon): RowT

    createLocalRow(row: ICombinedRow): RowT {
        return this.createCommonLocalRow(row)
    }

    createAddedLocalRow(row: IAddedRow): RowT {
        return this.createCommonLocalRow(row)
    }

    createEmptyLocalRow(row: IRowCommon): RowT {
        return this.createCommonLocalRow(row)
    }

    updateCommonValue(row: IRowCommon, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
        return
    }

    updateValue(rowIndex: number, row: ICombinedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
        this.updateCommonValue(row, localRow, columnIndex, value, localValue)
    }

    updateAddedValue(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
        this.updateCommonValue(row, localRow, columnIndex, value, localValue)
    }

    deleteCommonRow(row: IRowCommon, localRow: ILocalRow<ValueT, RowT>) {
        return
    }

    deleteRow(rowIndex: number, row: ICombinedRow, localRow: ILocalRow<ValueT, RowT>) {
        this.deleteCommonRow(row, localRow)
    }

    deleteAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRow<ValueT, RowT>) {
        this.deleteCommonRow(row, localRow)
    }

    postInitCommonRow(row: IRowCommon, localRow: ILocalRowInfo<RowT>) {
        return
    }

    postInitRow(row: ICombinedRow, localRow: ILocalRowInfo<RowT>) {
        this.postInitCommonRow(row, localRow)
    }

    postInitAddedRow(row: IAddedRow, localRow: ILocalRowInfo<RowT>) {
        this.postInitCommonRow(row, localRow)
    }

    postInitEmptyRow(row: IRowCommon, localRow: ILocalRowInfo<RowT>) {
        this.postInitCommonRow(row, localRow)
    }
}
