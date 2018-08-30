import { createSelector } from '@ngrx/store';
import * as _ from 'lodash';
import {
  getDashboardObjectEntitiesState,
  getCurrentDashboardObjectState,
  getDashboardObjectLoadingState,
  getDashboardObjectLoadedState,
  getDashboardObjectHasErrorState,
  getDashboardObjectErrorState,
  getAllDashboardsState,
  getCurrentVisualizationState,
  getDashboardNotificationState
} from '../reducers/dashboard.reducer';
import { getRootState, State } from '../reducers';

import { getCurrentDashboardGroup } from '../selectors/dashboard-groups.selectors';
import { Dashboard } from '../../dashboard/models';

export const getDashboardObjectState = createSelector(
  getRootState,
  (state: State) => state.dashboardObject
);

export const getDashboardObjectEntities = createSelector(
  getDashboardObjectState,
  getDashboardObjectEntitiesState
);

export const getAllDashboards = createSelector(
  getDashboardObjectState,
  getAllDashboardsState
);

export const getAllGroupDashboards = createSelector(
  getAllDashboards,
  getCurrentDashboardGroup,
  (allDashboards, currentDashboardGroup) => {
    return currentDashboardGroup && currentDashboardGroup.dashboards
      ? allDashboards
          .filter(({ id }) => currentDashboardGroup.dashboards.includes(id))
          .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      : _.sortBy(allDashboards, ['name']);
  }
);

export const getCurrentVisualizationId = createSelector(
  getDashboardObjectState,
  getCurrentVisualizationState
);

export const getCurrentDashboardId = createSelector(
  getDashboardObjectState,
  getCurrentDashboardObjectState
);

export const getCurrentDashboard = createSelector(
  getDashboardObjectEntities,
  getCurrentDashboardId,
  (dashboardEntities, currentDashboardId) =>
    dashboardEntities[currentDashboardId]
);

export const getCurrentDashboardGlobalSelections = createSelector(
  getCurrentDashboard,
  (dashboard: Dashboard) => (dashboard ? dashboard.globalSelections : [])
);

export const getDashboardById = id =>
  createSelector(
    getDashboardObjectEntities,
    (dashboardEntities: any) => dashboardEntities[id]
  );

export const getDashboardObjectLoading = createSelector(
  getDashboardObjectState,
  getDashboardObjectLoadingState
);

export const getDashboardObjectLoaded = createSelector(
  getDashboardObjectState,
  getDashboardObjectLoadedState
);
export const getDashboardObjectNotification = createSelector(
  getDashboardObjectState,
  getDashboardNotificationState
);

export const getDashboardObjectHasError = createSelector(
  getDashboardObjectState,
  getDashboardObjectHasErrorState
);

export const getDashboardObjectError = createSelector(
  getDashboardObjectState,
  getDashboardObjectErrorState
);
