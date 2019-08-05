import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { camelCase, groupBy, intersection } from 'lodash';
import { zip } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { State } from 'src/app/store/reducers';

import { DashboardItem } from '../../models/dashboard-item.model';
import { getSanitizedDataSelections } from '../../modules/ngx-dhis2-visualization/helpers/get-sanitized-data-selections.helper';
import {
  Visualization,
  VisualizationDataSelection
} from '../../modules/ngx-dhis2-visualization/models';
import { LoadVisualizationAnalyticsAction } from '../../modules/ngx-dhis2-visualization/store/actions';
import { updateFavoriteSelections } from '../../modules/ngx-dhis2-visualization/store/actions/favorite.actions';
import { getCombinedVisualizationObjectById } from '../../modules/ngx-dhis2-visualization/store/selectors';
import { updateDashboard } from '../actions/dashboard.actions';
import { globalFilterChange } from '../actions/global-filter.actions';

@Injectable()
export class GlobalFilterEffects {
  globalFilterChange$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(globalFilterChange),
        tap(({ dataSelections, dashboard }) => {
          // validate filter
          // TODO Refactor this code
          const requiredDimensions = ['dx', 'pe', 'ou', 'vrg'];

          const filterIntersection = intersection(
            dataSelections.map(
              (dataSelection: VisualizationDataSelection) =>
                dataSelection.dimension
            ),
            requiredDimensions
          );

          zip(
            ...(dashboard.dashboardItems || []).map(
              (dashboardItem: DashboardItem) =>
                this.store
                  .pipe(
                    select(getCombinedVisualizationObjectById(dashboardItem.id))
                  )
                  .pipe(take(1))
            )
          ).subscribe((visualizations: Visualization[]) => {
            visualizations.forEach((visualization: Visualization) => {
              const newDataSelections = getSanitizedDataSelections(
                dataSelections,
                camelCase(visualization.type),
                {
                  reportTable: { includeOrgUnitChildren: true },
                  chart: {
                    excludeOrgUnitChildren: true,
                    useLowestPeriodType: true,
                    dimensionsToExclude: ['vrg']
                  },
                  app: {
                    useLowestPeriodType: true
                  }
                }
              );

              this.store.dispatch(
                updateDashboard({
                  dashboard: {
                    ...dashboard,
                    dashboardItems: (dashboard.dashboardItems || []).map(
                      (dashboardItem: DashboardItem) => {
                        return {
                          ...dashboardItem,
                          dataSelections
                        };
                      }
                    )
                  }
                })
              );

              if (requiredDimensions.length === filterIntersection.length) {
                const groupedDataSelections = groupBy(
                  newDataSelections,
                  'layout'
                );

                if (visualization.favorite) {
                  this.store.dispatch(
                    updateFavoriteSelections({
                      id: visualization.favorite.id,
                      changes: {
                        columns: groupedDataSelections['columns'],
                        rows: groupedDataSelections['rows'],
                        filters: groupedDataSelections['filters']
                      }
                    })
                  );
                }

                this.store.dispatch(
                  new LoadVisualizationAnalyticsAction(
                    visualization.id,
                    visualization.layers,
                    newDataSelections
                  )
                );
              }
            });
          });
        })
      ),
    { dispatch: false }
  );
  constructor(private actions$: Actions, private store: Store<State>) {}
}
