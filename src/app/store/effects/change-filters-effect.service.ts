import { Injectable } from '@angular/core';
import {Actions, Effect} from "@ngrx/effects";
import {Action} from "@ngrx/store";
import {Observable} from "rxjs";
import {CHANGE_FILTERS_ACTION,
  CurrentVisualizationChangeAction
} from "../actions";
import {AnalyticsService} from "../../services/analytics.service";


@Injectable()
export class ChangeFiltersEffectService {

  constructor(
    private actions$: Actions,
    private analyticsService: AnalyticsService
  ) { }


  @Effect() visualization$: Observable<Action> = this.actions$
    .ofType(CHANGE_FILTERS_ACTION)
    .switchMap(action => this.analyticsService.getAnalytic(action.payload))
    .map(visualizationData => new CurrentVisualizationChangeAction(visualizationData));


}
