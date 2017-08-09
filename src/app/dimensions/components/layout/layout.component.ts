import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {isArray} from "rxjs/util/isArray";
import {INITIAL_LAYOUT_MODEL} from '../../model/layout-model';

export interface Header {
  name: string;
  column:string;
  type?:string;
  hidden?:boolean;
  meta?:boolean;
}

export interface Configuration {
  multiple: boolean;
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {

  @Input() layoutModel = INITIAL_LAYOUT_MODEL;
  @Input() visualizationType: string;
  @Output() onLayoutUpdate = new EventEmitter();
  @Output() onLayoutClose: EventEmitter<boolean> = new EventEmitter<boolean>();
  // @Output('drop') drop = new EventEmitter();
  showLayout: boolean = false;
  private _filters: any;
  private _columns: any;
  private _rows: any;
  icons: any;
  dimensions: any;
  constructor() {
    this.icons = {
      dx: 'assets/img/data.png',
      ou: 'assets/img/tree.png',
      pe: 'assets/img/period.png'
    };

    this.dimensions = {
      filterDimension: [],
      columnDimension: [],
      rowDimension: []
    };
  }

  get columns(): any {
    return this._columns;
  }

  set columns(value: any) {
    this._columns = value;
  }

  get rows(): any {
    return this._rows;
  }

  set rows(value: any) {
    this._rows = value;
  }

  get filters(): any {
    return this._filters;
  }

  set filters(value: any) {
    this._filters = value;
  }

  ngOnInit() {
    this._filters = this.layoutModel.filters;
    this._columns = this.layoutModel.columns;
    this._rows = this.layoutModel.rows;
  }

  onDrop(event, dimension) {
    this.layoutModel[event.dragData.dimension].splice(this.layoutModel[event.dragData.dimension].indexOf(event.dragData.data), 1);
    this.layoutModel[dimension].push(event.dragData.data)

    // if(dimension == 'category' || dimension == 'series') {
    //   if(this.layoutModel[dimension] != "") {
    //     //first send target value to the dropper
    //     if(isArray(this.layoutModel[event.dragData.dimension])) {
    //       this.layoutModel[event.dragData.dimension].push(this.layoutModel[dimension])
    //     } else {
    //       this.layoutModel[event.dragData.dimension] = this.layoutModel[dimension];
    //     }
    //   }
    //   this.layoutModel[dimension] = event.dragData.data;
    // } else {
    //   if(event.dragData.dimension == 'category' || event.dragData.dimension == 'series') {
    //     this.layoutModel[event.dragData.dimension] = "";
    //   }
    //
    // }
  }

  updateLayout() {
    this.onLayoutUpdate.emit(this.layoutModel);
  }

  close() {
    this.onLayoutClose.emit(true)
  }
}