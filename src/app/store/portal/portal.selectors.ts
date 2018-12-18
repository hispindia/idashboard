import {createSelector} from '@ngrx/store';
import {AppState} from '../app.reducers';
import {DataState, GroupedSlidersState, PortalConfigurationState, StatsSummaryState} from './portal.state';

const portalConfiguration = (state: AppState) => state.portalConfiguration;
const statsSummary = (state: AppState) => state.statsSummary;
const downloads = (state: AppState) => state.downloads;
const faqs = (state: AppState) => state.faqs;
const dataFromExternalSources = (state: AppState) => state.dataFromExternalSource;
const analyticsData = (state: AppState) => state.analyticsData;
const groupedSlidersInfo = (state: AppState) => state.groupedSlidersInfo;


export const getPortalConfiguration = createSelector(portalConfiguration, (configurationsObj: PortalConfigurationState) => configurationsObj);
export const getStatsSummary = createSelector(statsSummary, (statsSummaryObj: StatsSummaryState) => statsSummaryObj);
export const getDownloads = createSelector(downloads, (downloadsObj: any) => downloadsObj);
export const getFAQs = createSelector(faqs, (faqObject: any) => faqObject);
export const getDataFromExternalSource = createSelector(dataFromExternalSources, (dataFromExternalSourcesObj: any) => dataFromExternalSourcesObj);
export const getAnalyticsData = createSelector(analyticsData, (analyticsDataObj: DataState) => analyticsDataObj);
export const getGroupedSlidersInfo = createSelector(groupedSlidersInfo, (groupedSlidersInfoObj: GroupedSlidersState) => groupedSlidersInfoObj);