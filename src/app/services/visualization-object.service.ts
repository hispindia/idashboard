import { Injectable } from '@angular/core';
import {Observable} from "rxjs";
import {FavoriteService} from "./favorite.service";
import {Visualization} from "../model/visualization";
import {MapService} from "./map.service";
import {ChartService} from "./chart.service";
import {TableService} from "./table.service";
import * as _ from 'lodash';
import {AnalyticsService} from "./analytics.service";

@Injectable()
export class VisualizationObjectService {

  constructor(
    private favoriteService: FavoriteService,
    private mapService: MapService,
    private chartService: ChartService,
    private tableService: TableService,
    private analyticsService: AnalyticsService
  ) { }

  getSanitizedVisualizationObject(initialVisualization: Visualization): Observable<any> {
    return Observable.create(observer => {
      if(initialVisualization.type == 'USERS' || initialVisualization.type == 'REPORTS' || initialVisualization.type == 'RESOURCES') {
        observer.next(initialVisualization);
        observer.complete();
      } else {
        if(initialVisualization.details.favorite.hasOwnProperty('id')) {
          this.favoriteService.getFavoriteDetails(initialVisualization.details.favorite.type, initialVisualization.details.favorite.id, initialVisualization.layers.length > 0 ? true : false)
            .subscribe(favoriteObject => {
              this.updateVisualizationConfigurationAndSettings(initialVisualization, favoriteObject).subscribe(visualizationWithSettings => {
                this.analyticsService.getSanitizedAnalytics(visualizationWithSettings).subscribe(visualization => {
                  if(visualization.details.currentVisualization == 'MAP') {
                    this.mapService.getGeoFeatures(visualization).subscribe(visualizationWithGeoFeature => {
                      this.mapService.getPredefinedLegend(visualizationWithGeoFeature).subscribe(visualizationWithLegendSet => {
                        this.mapService.getGroupSet(visualizationWithLegendSet).subscribe(visualizationWithGroupSet => {
                          observer.next(visualizationWithGroupSet);
                          observer.complete();
                        })
                      })
                    })
                  } else {
                    observer.next(visualization);
                    observer.complete();
                  }

                });
              });
            })
        } else {
          //TODO use external dimension concept
        }
      }

    });
  }

  // getDrawableObjects(visualizationObject: Visualization): Visualization {
  //   if(visualizationObject.details.currentVisualization == 'CHART') {
  //     visualizationObject = this.chartService.getChartObjects(visualizationObject);
  //   }else if(visualizationObject.details.currentVisualization == 'MAP') {
  //
  //   } else if(visualizationObject.details.currentVisualization == 'TABLE') {
  //     visualizationObject = this.tableService.getTableObjects(visualizationObject)
  //   }
  //   return visualizationObject;
  // }

  private _getVisualizationSubtitle(filterArray: any) {
    let subtitleArray: any = {};
    let subtitle: string = '';

    if(filterArray.length > 0) {
      filterArray.forEach(filter => {
        subtitleArray[filter.dimension] = filter.items.map(item => {return item.displayName})
      })
    }

    subtitle += subtitleArray.hasOwnProperty('dx') ? subtitleArray.dx.join(',') : '';
    subtitle += subtitleArray.hasOwnProperty('pe') ? subtitle != '' ? ' - ' + subtitleArray.pe.join(',') : '' + subtitleArray.pe.join(',') : '';
    subtitle += subtitleArray.hasOwnProperty('ou') ? subtitle != '' ? ' - ' + subtitleArray.ou.join(',') : '' + subtitleArray.ou.join(',') : '';

    return subtitle;
  }

  public updateVisualizationConfigurationAndSettings(visualizationObject: Visualization, favoriteObject: any): Observable<Visualization> {

    return Observable.create(observer => {
      /**
       * Get visualization object name if any
       */
      if(visualizationObject.layers.length == 0) {
        visualizationObject.name = favoriteObject.hasOwnProperty('displayName') ? favoriteObject.displayName : favoriteObject.hasOwnProperty('name') ? favoriteObject.name : null;
      }

      if (visualizationObject.details.currentVisualization == 'MAP') {

        if(!visualizationObject.details.hasOwnProperty('mapConfiguration')) {
          visualizationObject.details.mapConfiguration = this.mapService._getMapConfiguration(favoriteObject);
        }

        if(visualizationObject.layers.length == 0) {
          if(favoriteObject.hasOwnProperty('mapViews') && favoriteObject.mapViews.length > 0) {
            favoriteObject.mapViews.forEach((view: any) => {

              if(view.hasOwnProperty('filters') && view.filters.length > 0) {
                view.subititle = this._getVisualizationSubtitle(view.filters)
              }

              visualizationObject.layers.push({settings: view, analytics: {}})
            })
          }
        } else {
          if(visualizationObject.details.analyticsStrategy == 'split') {
            visualizationObject = this.analyticsService.getSplitedAnalytics(visualizationObject);
          }

          this.mapService.getGeoFeatures(visualizationObject).subscribe(visualizationWithGeoFeature => {
            this.mapService.getPredefinedLegend(visualizationWithGeoFeature).subscribe(visualizationWithLegendSet => {
              this.mapService.getGroupSet(visualizationWithLegendSet).subscribe(visualizationWithGroupSet => {
                observer.next(this.sanitizeMapSettings(visualizationWithGroupSet));
                observer.complete();
              })
            })
          });
        }


      } else if (visualizationObject.details.currentVisualization == 'CHART') {

        if(visualizationObject.layers.length == 0) {
          let settings: any = favoriteObject;

          /**
           * Get chart subtitle
           */
          if(favoriteObject.hasOwnProperty('filters') && favoriteObject.filters.length > 0) {
            settings.subititle = this._getVisualizationSubtitle(favoriteObject.filters)
          }

          /**
           * get chart configuration
           * @type {ChartConfiguration}
           */
          settings.chartConfiguration = this.chartService.getChartConfiguration(favoriteObject);


          visualizationObject.layers.push({settings: settings, analytics: {}})

        } else {
          visualizationObject.layers.forEach(layer => {
            if(!layer.settings.hasOwnProperty('chartConfiguration')) {
              layer.settings.chartConfiguration = this.chartService.getChartConfiguration(layer.settings);
            }
          })
        }

      } else if (visualizationObject.details.currentVisualization == 'TABLE') {

        if(visualizationObject.layers.length == 0) {

          let settings: any = favoriteObject;

          if(favoriteObject.hasOwnProperty('filters') && favoriteObject.filters.length > 0) {
            settings.subititle = this._getVisualizationSubtitle(favoriteObject.filters)
          }
          settings.tableConfiguration = this.tableService.getTableConfiguration(favoriteObject, visualizationObject.type, visualizationObject.details.layout);
          visualizationObject.layers.push({settings: settings, analytics: {}})

        } else {

          visualizationObject.layers.forEach(layer => {
            if(!layer.settings.hasOwnProperty('tableConfiguration')) {
              layer.settings.tableConfiguration = this.tableService.getTableConfiguration(layer.settings, visualizationObject.type, visualizationObject.details.layout);
            }
          });

        }

      }
      observer.next(visualizationObject);
      observer.complete();
    });

  }

  sanitizeMapSettings(visualizationObject: Visualization): Visualization {
    visualizationObject.layers.forEach(layer => {
      if(!layer.settings.hasOwnProperty('labelFontColor')) {
        layer.settings.labelFontColor = '#000000';
      }

      if(!layer.settings.hasOwnProperty('layer')) {
        layer.settings.layer = 'thematic';
      }

      if(!layer.settings.hasOwnProperty('labelFontStyle')) {
        layer.settings.labelFontStyle = 'normal';
      }

      if(!layer.settings.hasOwnProperty('radiusHigh')) {
        layer.settings.radiusHigh = 15;
      }

      if(!layer.settings.hasOwnProperty('eventClustering')) {
        layer.settings.eventClustering = false;
      }

      if(!layer.settings.hasOwnProperty('colorLow')) {
        layer.settings.colorLow = 'ff0000';
      }

      if(!layer.settings.hasOwnProperty('colorHigh')) {
        layer.settings.colorHigh = '00ff00';
      }

      if(!layer.settings.hasOwnProperty('opacity')) {
        layer.settings.opacity = 0.8;
      }

      if(!layer.settings.hasOwnProperty('colorScale')) {
        layer.settings.colorScale = '#fc8d59,#ffffbf,#91cf60';
      }

      if(!layer.settings.hasOwnProperty('labelFontSize')) {
        layer.settings.labelFontSize = '11px';
      }

      if(!layer.settings.hasOwnProperty('eventPointRadius')) {
        layer.settings.eventPointRadius = 0;
      }

      if(!layer.settings.hasOwnProperty('hidden')) {
        layer.settings.hidden = false;
      }

      if(!layer.settings.hasOwnProperty('classes')) {
        layer.settings.classes = 3;
      }

      if(!layer.settings.hasOwnProperty('labelFontWeight')) {
        layer.settings.labelFontWeight = 'normal';
      }

      if(!layer.settings.hasOwnProperty('radiusLow')) {
        layer.settings.radiusLow = 5;
      }

    });

    return visualizationObject;
  }

}