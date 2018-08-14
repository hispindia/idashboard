import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import * as _ from 'lodash';
import { Observable, of, forkJoin } from 'rxjs';
import { Store } from '@ngrx/store';
import { catchError, map, mergeMap, tap, withLatestFrom, take, switchMap } from 'rxjs/operators';

// actions
import {
  AddVisualizationObjectAction,
  InitializeVisualizationObjectAction,
  LoadVisualizationFavoriteAction,
  LoadVisualizationFavoriteSuccessAction,
  UpdateVisualizationObjectAction,
  VisualizationObjectActionTypes,
  AddVisualizationLayerAction,
  LoadVisualizationAnalyticsAction,
  UpdateVisualizationLayerAction,
  AddVisualizationConfigurationAction,
  UpdateVisualizationConfigurationAction,
  AddVisualizationUiConfigurationAction,
  SaveVisualizationFavoriteAction,
  UpdateVisualizationLayersAction,
  RemoveVisualizationObjectAction,
  RemoveVisualizationConfigurationAction,
  RemoveVisualizationLayerAction,
  RemoveVisualizationUiConfigurationAction,
  RemoveVisualizationFavoriteAction
} from '../actions';

// reducers
import { VisualizationState, getVisualizationObjectEntities } from '../reducers';

// models
import { Visualization, VisualizationLayer } from '../../models';

// services
import { FavoriteService } from '../../services/favorite.service';

// helpers
import {
  getSelectionDimensionsFromFavorite,
  getVisualizationLayerType,
  getStandardizedVisualizationType,
  getStandardizedVisualizationObject,
  getStandardizedVisualizationUiConfig,
  getStandardizedAnalyticsObject,
  getSelectionDimensionsFromAnalytics
} from '../../helpers';
import { SystemInfoService } from '@hisptz/ngx-dhis2-http-client';
import { getVisualizationObjectById, getCombinedVisualizationObjectById } from '../selectors';
import { getFavoritePayload } from '../../helpers/get-favorite-payload.helpers';
import { UtilService } from '../../../../../services';
import { DashboardObjectState } from '../../../../../store/reducers/dashboard.reducer';
import { ManageDashboardItemAction } from '../../../../../store';
import { getDefaultVisualizationLayer } from '../../helpers/get-default-visualization-layer.helper';
import { generateUid } from '../../../../../helpers/generate-uid.helper';

@Injectable()
export class VisualizationObjectEffects {
  @Effect({ dispatch: false })
  initializeVisualizationObject$: Observable<any> = this.actions$.pipe(
    ofType(VisualizationObjectActionTypes.INITIALIZE_VISUALIZATION_OBJECT),
    withLatestFrom(this.store.select(getVisualizationObjectEntities)),
    tap(([action, visualizationObjectEntities]: [InitializeVisualizationObjectAction, any]) => {
      const visualizationObject: Visualization = visualizationObjectEntities[action.id];
      if (visualizationObject) {
        if (visualizationObject.progress && visualizationObject.progress.percent === 0) {
          // set initial visualization configurations
          this.store.dispatch(
            new AddVisualizationConfigurationAction({
              id: visualizationObject.visualizationConfigId,
              type: visualizationObject.type,
              contextPath: '../../../',
              currentType: getStandardizedVisualizationType(visualizationObject.type),
              name: visualizationObject.favorite ? visualizationObject.favorite.name : ''
            })
          );

          // Load favorite information
          if (visualizationObject.favorite) {
            this.store.dispatch(
              new LoadVisualizationFavoriteAction(visualizationObject, action.currentUser, action.systemInfo)
            );
          }
        }
      } else {
        const initialVisualizationObject: Visualization = getStandardizedVisualizationObject({
          id: action.id,
          name: action.name,
          type: action.visualizationType,
          isNew: true
        });

        // set initial visualization object
        this.store.dispatch(new AddVisualizationObjectAction(initialVisualizationObject));

        // set initial visualization ui configuration
        this.store.dispatch(
          new AddVisualizationUiConfigurationAction(
            getStandardizedVisualizationUiConfig({
              id: action.id,
              type: action.visualizationType
            })
          )
        );

        // set initial global visualization configurations
        this.store.dispatch(
          new AddVisualizationConfigurationAction({
            id: initialVisualizationObject.visualizationConfigId,
            type: initialVisualizationObject.type,
            contextPath: action.systemInfo.contextPath || '../../../',
            currentType: getStandardizedVisualizationType(initialVisualizationObject.type),
            name: initialVisualizationObject.favorite ? initialVisualizationObject.favorite.name : ''
          })
        );

        // set visualization layers
        const visualizationLayers: any[] = _.filter(
          _.map(
            action.visualizationLayers ||
              _.filter(
                [getDefaultVisualizationLayer(action.currentUser, action.systemInfo)],
                visualizationLayer => visualizationLayer
              ),
            (visualizationLayer: VisualizationLayer) => {
              return visualizationLayer.analytics || visualizationLayer.dataSelections
                ? {
                    ...visualizationLayer,
                    id: initialVisualizationObject.favorite ? initialVisualizationObject.favorite.id : '',
                    analytics: visualizationLayer.analytics
                      ? getStandardizedAnalyticsObject(visualizationLayer.analytics, true)
                      : null,
                    dataSelections: visualizationLayer.dataSelections || []
                  }
                : null;
            }
          ),
          visualizationLayer => visualizationLayer
        );

        // update visualization object with layers
        if (visualizationLayers.length > 0) {
          // Update visualization object
          if (_.some(visualizationLayers, visualizationLayer => visualizationLayer.analytics)) {
            this.store.dispatch(
              new UpdateVisualizationObjectAction(action.id, {
                layers: _.map(visualizationLayers, visualizationLayer => visualizationLayer.id),
                progress: {
                  statusCode: 200,
                  statusText: 'OK',
                  percent: 100,
                  message: 'Analytics has been loaded'
                }
              })
            );

            // Add visualization Layers
            _.each(visualizationLayers, visualizationLayer => {
              this.store.dispatch(
                new AddVisualizationLayerAction({
                  ...visualizationLayer,
                  dataSelections: getSelectionDimensionsFromAnalytics(visualizationLayer.analytics)
                })
              );
            });
          } else if (
            !_.some(visualizationLayers, visualizationLayer => visualizationLayer.analytics) &&
            _.some(visualizationLayers, visualizationLayer => visualizationLayer.dataSelections)
          ) {
            this.store.dispatch(
              new UpdateVisualizationObjectAction(action.id, {
                layers: _.map(visualizationLayers, visualizationLayer => visualizationLayer.id),
                progress: {
                  statusCode: 200,
                  statusText: 'OK',
                  percent: 50,
                  message: 'Favorite has been loaded'
                }
              })
            );

            // Add visualization Layers
            _.each(visualizationLayers, visualizationLayer => {
              this.store.dispatch(new AddVisualizationLayerAction(visualizationLayer));
            });

            // Load analytics for visualization layers
            this.store.dispatch(new LoadVisualizationAnalyticsAction(action.id, visualizationLayers));
          } else {
            console.warn(`Visualization with id ${action.id} has no any visualizable layer or data selections`);
          }
        }
      }
    })
  );

  @Effect()
  loadFavorite$: Observable<any> = this.actions$
    .ofType(VisualizationObjectActionTypes.LOAD_VISUALIZATION_FAVORITE)
    .pipe(
      mergeMap((action: LoadVisualizationFavoriteAction) =>
        this.favoriteService.getFavorite(action.visualization.favorite).pipe(
          map(
            (favorite: any) =>
              new LoadVisualizationFavoriteSuccessAction(
                action.visualization,
                favorite,
                action.currentUser,
                action.systemInfo
              )
          ),
          catchError(error =>
            of(
              new UpdateVisualizationObjectAction(action.visualization.id, {
                progress: {
                  statusCode: error.status,
                  statusText: 'Error',
                  percent: 100,
                  message: error.error
                }
              })
            )
          )
        )
      )
    );

  @Effect({ dispatch: false })
  loadFavoriteSuccess$: Observable<any> = this.actions$.pipe(
    ofType(VisualizationObjectActionTypes.LOAD_VISUALIZATION_FAVORITE_SUCCESS),
    withLatestFrom(this.systemInfoService.getSystemInfo()),
    tap(([action, systemInfo]: [LoadVisualizationFavoriteSuccessAction, any]) => {
      const spatialSupport = systemInfo && systemInfo.databaseInfo ? systemInfo.databaseInfo.spatialSupport : false;
      const visualizationFavoriteOptions =
        action.visualization && action.visualization.favorite ? action.visualization.favorite : null;

      if (visualizationFavoriteOptions && action.favorite) {
        if (visualizationFavoriteOptions.requireAnalytics) {
          // update global visualization configurations
          this.store.dispatch(
            new UpdateVisualizationConfigurationAction(action.visualization.visualizationConfigId, {
              basemap: action.favorite.basemap,
              zoom: action.favorite.zoom,
              latitude: action.favorite.latitude,
              longitude: action.favorite.longitude
            })
          );

          // generate visualization layers
          const visualizationLayers: VisualizationLayer[] = _.map(
            action.favorite.mapViews || [action.favorite],
            (favoriteLayer: any) => {
              const dataSelections = getSelectionDimensionsFromFavorite(favoriteLayer);
              return {
                id: favoriteLayer.id,
                dataSelections,
                layerType: getVisualizationLayerType(action.visualization.favorite.type, favoriteLayer),
                analytics: null,
                config: {
                  ...favoriteLayer,
                  type: favoriteLayer.type ? favoriteLayer.type : 'COLUMN',
                  spatialSupport,
                  visualizationType: action.visualization.type
                }
              };
            }
          );

          // Add visualization Layers
          _.each(visualizationLayers, visualizationLayer => {
            this.store.dispatch(new AddVisualizationLayerAction(visualizationLayer));
          });

          // Update visualization object
          this.store.dispatch(
            new UpdateVisualizationObjectAction(action.visualization.id, {
              layers: _.map(visualizationLayers, visualizationLayer => visualizationLayer.id),
              progress: {
                statusCode: 200,
                statusText: 'OK',
                percent: 50,
                message: 'Favorite information has been loaded'
              }
            })
          );

          // Load analytics for visualization layers
          this.store.dispatch(new LoadVisualizationAnalyticsAction(action.visualization.id, visualizationLayers));
        } else {
          const visualizationLayers: VisualizationLayer[] = _.map([action.favorite], favoriteLayer => {
            return {
              id: favoriteLayer.id,
              analytics: {
                rows: favoriteLayer[visualizationFavoriteOptions.type]
              }
            };
          });

          // Update visualization object
          this.store.dispatch(
            new UpdateVisualizationObjectAction(action.visualization.id, {
              layers: _.map(visualizationLayers, visualizationLayer => visualizationLayer.id),
              progress: {
                statusCode: 200,
                statusText: 'OK',
                percent: 100,
                message: 'Information has been loaded'
              }
            })
          );

          // Add visualization Layers
          _.each(visualizationLayers, visualizationLayer => {
            this.store.dispatch(new AddVisualizationLayerAction(visualizationLayer));
          });
        }
      } else {
        // Update visualization layers
        const visualizationLayer: VisualizationLayer = {
          ...getDefaultVisualizationLayer(action.currentUser, action.systemInfo),
          id: generateUid()
        };
        this.store.dispatch(new AddVisualizationLayerAction(visualizationLayer));
        // Update visualization object
        this.store.dispatch(
          new UpdateVisualizationObjectAction(action.visualization.id, {
            layers: [visualizationLayer.id],
            progress: {
              statusCode: 200,
              statusText: 'OK',
              percent: 100,
              message: 'Information has been loaded'
            }
          })
        );
      }
    })
  );

  @Effect({ dispatch: false })
  saveVisualizationFavorite$: Observable<any> = this.actions$.pipe(
    ofType(VisualizationObjectActionTypes.SaveVisualizationFavorite),
    tap((action: SaveVisualizationFavoriteAction) => {
      this.store
        .select(getCombinedVisualizationObjectById(action.id))
        .pipe(take(1))
        .subscribe((visualizationObject: any) => {
          // Update visualization object
          this.store.dispatch(
            new UpdateVisualizationObjectAction(action.id, {
              name: action.favoriteDetails.name,
              description: action.favoriteDetails.description,
              favorite: {
                ...visualizationObject.favorite,
                name: action.favoriteDetails.name
              }
            })
          );

          // Get updated visualization layer based on new changes
          const visualizationLayers: VisualizationLayer[] = _.map(visualizationObject.layers, visualizationLayer => {
            return {
              ...visualizationLayer,
              config: {
                ...(visualizationLayer.config || {}),
                ...action.favoriteDetails
              }
            };
          });

          // Get favorite payload details
          const favoriteDetails = getFavoritePayload(
            visualizationLayers,
            visualizationObject.type,
            visualizationObject.config.currentType
          );

          if (favoriteDetails) {
            const favoritePromise =
              visualizationObject.isNew || favoriteDetails.hasDifferentType
                ? this.favoriteService.create(favoriteDetails.url, favoriteDetails.favorite)
                : this.favoriteService.update(favoriteDetails.url, favoriteDetails.favorite);

            favoritePromise.subscribe(favoriteResult => {
              // Save favorite as dashboard item

              this.dashboardStore.dispatch(
                new ManageDashboardItemAction(
                  action.dashboardId,
                  {
                    id: action.id,
                    type: favoriteDetails.favoriteType,
                    [_.camelCase(favoriteDetails.favoriteType)]: {
                      id: favoriteResult.id,
                      displayName: favoriteResult.name
                    }
                  },
                  visualizationObject.isNew ? 'ADD' : 'UPDATE',
                  true
                )
              );

              // Update visualization object with new favorite
              this.store.dispatch(
                new UpdateVisualizationObjectAction(action.id, {
                  isNew: false
                })
              );

              // Update visualization layers in the store
              _.each(visualizationLayers, visualizationLayer => {
                this.store.dispatch(new UpdateVisualizationLayerAction(visualizationLayer.id, visualizationLayer));
              });
            });
          }
        });
    })
  );

  @Effect()
  removeVisualizationObject$: Observable<any> = this.actions$.pipe(
    ofType(VisualizationObjectActionTypes.RemoveVisualizationObject),
    switchMap((action: RemoveVisualizationObjectAction) => [
      new RemoveVisualizationConfigurationAction(action.id),
      new RemoveVisualizationLayerAction(action.id),
      new RemoveVisualizationUiConfigurationAction(action.id)
    ])
  );

  @Effect({ dispatch: false })
  removeVisualizationFavorite$: Observable<any> = this.actions$.pipe(
    ofType(VisualizationObjectActionTypes.RemoveVisualizationFavorite),
    tap((action: RemoveVisualizationFavoriteAction) => {
      this.favoriteService.delete(action.favoriteId, action.favoriteType).subscribe();
    })
  );

  constructor(
    private actions$: Actions,
    private store: Store<VisualizationState>,
    private dashboardStore: Store<DashboardObjectState>,
    private favoriteService: FavoriteService,
    private systemInfoService: SystemInfoService,
    private utilService: UtilService
  ) {}
}
